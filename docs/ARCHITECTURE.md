# Navexa Health — Architecture Specification

**Document:** `docs/ARCHITECTURE.md`  
**Version:** 3.0.0  
**Status:** IMPLEMENTED & VERIFIED  
**Auditor/Architect:** Principal Software & Healthcare Technology Architect

---

## 1. System Architecture Overview

Navexa Health is engineered as a **modular, domain-driven maternal and neonatal healthcare care navigation platform**. It bridges the perilous gap between referral generation and clinical care receipt by modeling the physical journey, socioeconomic barriers, transit logistics, and continuing postpartum surveillance as first-class, interconnected operational entities.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                            │
│  React 18 + React Router v6 + design tokens and UI kit (docs/design.md) │
├────────────────────┬────────────────────┬───────────────────────────────┤
│ Operational Hubs   │ Clinical Intake    │ Patient & Community           │
│ - Coordinator      │ - Intake (hospital)│ - Patient & Family Journey    │
│   Dashboard        │ - Patient Chart    │ - Family Assistant            │
│ - Patients         │ - Referral Form    │ - 42-Day Postpartum Continuity│
│ - Transport Fleet  │   (New referral)   │ - Regional Facility Directory │
├────────────────────┴────────────────────┴───────────────────────────────┤
│                      CONTEXT & DOMAIN SERVICE LAYER                     │
│  ReferralContext (Single Source of Truth) + Service Dispatchers         │
├────────────────────┬────────────────────┬───────────────────────────────┤
│ Domain Entities    │ Operational States │ Validation & Guard Rules      │
│ - Referral         │ - ReferralStatus   │ - validateReferralTransition  │
│ - Barrier          │ - TransportStatus  │ - validateTransportTransition │
│ - TransportRequest │ - BarrierStatus    │ - validateBarrierTransition   │
│ - ArrivalRecord    │ - FollowUpStatus   │ - validateFollowUpTransition  │
│ - ClinicalOutcome  │ - UrgencyLevel     │ - Separation of Maternal vs   │
│ - FollowUpPlan     │                    │   Neonatal Fields             │
├────────────────────┴────────────────────┴───────────────────────────────┤
│                      PERSISTENCE & RECOVERY ADAPTER                     │
│  StorageAdapter (Versioned 'navexa_domain_v6' in browser localStorage) │
├─────────────────────────────────────────────────────────────────────────┤
│                      AI SERVER LAYER (keys stay on the server)          │
│  api/ Vercel functions -> server/ handlers -> Claude and Sarvam         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Module Boundaries & Workspaces

The platform is divided into distinct, role-specific operational workspaces operating upon a single shared domain store:

| Module                             | Route                      | Primary Responsibilities                                                                                                                                                                                                                                                                     | Data Inputs                                                                              | Data Outputs                                                                                  |
| :--------------------------------- | :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| **Module 1: Referral Management**  | `/create`, `/referral/:id` | Single-page referral form, clinical narrative capture, urgency stratification, full chart & event ledger inspection.                                                                                                                                                                         | Clinician inputs, demographic & obstetric metrics, indication narrative.                 | Persisted `Referral` entity with `CREATED` & `SENT` milestones.                               |
| **Module 2: Receiving Facility**   | `/facility`                | Intake triage review, hospital bed reservation, decline logging (the referral then floats until the patient chooses), arrival confirmation with the "Patient is here" button on each row (ward, bed, who received them), and structured clinical outcome recording.                          | Inbound transfers, staff attribution, room/bay allocation, clinical assessment findings. | Status mutations: `ACKNOWLEDGED`, `REJECTED`, `REDIRECTED`, `ARRIVAL_CONFIRMED`, `COMPLETED`. |
| **Module 3: Care Coordination**    | `/coordinator`             | Urgent cases not yet arrived, totals, and a filterable referral queue.                                                                                                                                                                                                                       | Central `ReferralContext` collection.                                                    | Triage prioritization, case escalations, shift handover audit reports.                        |
| **Module 4: Care Navigation**      | `/patients`                | Patients screen (`/navigator` and `/barriers` redirect here): contact attempt logging (call, voicemail, home visit), preferred language & interpreter scheduling, barrier flagging. Tabs filter the list, and the Blocked and Barriers solved tabs show barrier tables.                      | Patient contact attempts, social determinants of health (SDOH).                          | `CommunicationLog`, updated `Barrier` records.                                                |
| **Module 5: Family Assistant**     | `/patient/assistant`       | Family's chat assistant in their own language, with read-aloud answers. Reports danger signs and practical barriers to the care navigator. Never diagnoses.                                                                                                                                  | Family questions (typed or spoken), active referral summary.                             | Critical alerts, barriers `(raised by family)`, timeline entries.                             |
| **Module 6: Transport Operations** | `/transport`               | Medical fleet tracking (MediVan #04 with neonatal transport kit, Transit Van #02, Ambulance #01), vehicle assignment, driver dispatch, pickup confirmation, and disruption reporting.                                                                                                        | Transit requests, pickup address, passenger neonatal transport kit requirements.         | `TransportRequest` lifecycle mutations (`DISPATCHED` → `PICKED_UP` → `ARRIVED` / `FAILED`).   |
| **Module 7: Patient & Family**     | `/patient`                 | Reassuring, plain-language patient roadmap, dynamic transit status, driver ETA, assigned navigator card, emergency 108 advisory, what-to-bring checklist, embedded OpenStreetMap of the referred hospital with Google Maps directions (hospital location only, never the patient's address). | Active referral records, live transport status.                                          | Read-only patient guidance (zero clinical notes exposed).                                     |
| **Module 8: Continuity of Care**   | `/continuity`              | 42-day postpartum maternal surveillance and 28-day neonatal well-baby tracking. Independent care plan lifecycle after hospital referral closure.                                                                                                                                             | Completed referral records, touchpoint checklists.                                       | Completed touchpoints (Day 3, Day 7, Day 14, Day 42) with clinical findings.                  |
| **Module 9: Regional Care Grid**   | `/network`                 | Directory of 5 participating regional medical centers, bed velocity, direct transfer contacts, and service capabilities.                                                                                                                                                                     | Master facility registry.                                                                | Selected destination facility for referral creation or hospital redirection.                  |

---

## 3. State Management & Single Source of Truth

All application state is consolidated within `src/context/ReferralContext.jsx`, eliminating isolated local component state:
1. **Unified Storage Structure:**

   ```json
   {
     "referrals": [ ... ],
     "facilities": [ ... ],
     "navigators": [ ... ],
     "fleet": [ ... ],
     "notifications": [ ... ]
   }
   ```
2. **Persistence Adapter (`src/services/storageAdapter.js`):**
   - Automatically serializes the entire state tree to `localStorage` under `navexa_domain_v6`. Older keys (`navexa_domain_v3` to `v5`) are removed on load.
   - Safely recovers state on page refreshes ($F5$).
   - Provides explicit `resetDemoData()` functionality with confirmation safeguards.
3. **Immutable Audit Event Mechanism:**
   Every state change generates an `AuditEvent` with actor attribution, role, timestamp, action code, and human-readable details, appended to the referral's `auditTrail`.

---

## 4. Operational vs. Clinical State Separation

To maintain strict clinical safety:
- **Arrival $\neq$ Treatment:** A physical arrival confirmation (`ARRIVAL_CONFIRMED`) records entry into the facility, but does **not** mark clinical care as complete.
- **Referral Closure $\neq$ Care Termination:** When a referral reaches `COMPLETED`, the system automatically establishes a linked **42-Day Continuing Care Plan** (`FollowUpPlan`). Closing the referral episode never terminates the continuing care surveillance.
- **Role Scoping:** Only authorized clinical roles (MD, MS (OBG), B.Sc Nursing) can record clinical findings and outcomes. Care navigators and social workers are restricted to administrative coordination and barrier mitigation.

---

## 5. AI Services Layer

Three AI features and the family assistant run on the server. The browser never sees a key.

- **Code.** Request handlers live in `server/` (`assistant.js`, `staffAi.js`, `providers.js`, `routes.js`, `http.js`). The Vercel functions in `api/` call `runRoute` in `server/routes.js`. `vite.config.js` serves the same routes in `npm run dev`.
- **Routes.** `POST /api/assistant` (family chat), `/api/assistant/speak` (read aloud), `/api/ai/handoff` (handoff summary), `/api/ai/referral-draft` (fill with AI).
- **Providers.** Claude (`claude-sonnet-5-5`) writes every answer and draft as structured JSON. Sarvam does speech to text, translation and text to speech. Keys are `ANTHROPIC_API_KEY` and `SARVAM_API_KEY`, read from `.env` locally and from Vercel environment variables when deployed. With either key missing, the routes answer 503 "AI isn't set up yet."
- **Demo limit.** Each browser gets 20 AI uses (`ASSISTANT_LIMIT` in `src/domain/assistant.js`, counted in `src/services/assistantStore.js`). A failed request that never reached the AI is refunded.
- **Safety rules.** The AI never sets how urgent a referral is and only suggests a hospital. Fill with AI fills only empty or sample fields. The server checks AI output against the typed note and transcript before the browser shows it. The rules are in `docs/SECURITY_AND_CLINICAL_SAFETY_AUDIT.md`, section 3.
