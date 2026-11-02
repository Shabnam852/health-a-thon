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
│ - Coordinator Desk │ - Receiving Triage │ - Patient & Family Journey    │
│ - Caseload         │ - Case Details     │ - 42-Day Postpartum Continuity│
│ - Barrier Desk     │ - Referral Wizard  │ - Regional Facility Directory │
│ - Transport Fleet  │                    │                               │
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
│  StorageAdapter (Versioned 'navexa_domain_v4' in browser localStorage) │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Module Boundaries & Workspaces

The platform is divided into distinct, role-specific operational workspaces operating upon a single shared domain store:

| Module                             | Route                      | Primary Responsibilities                                                                                                                                                                                                                                                                     | Data Inputs                                                                              | Data Outputs                                                                                  |
| :--------------------------------- | :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| **Module 1: Referral Management**  | `/create`, `/referral/:id` | Single-page referral form, clinical narrative capture, urgency stratification, full chart & event ledger inspection.                                                                                                                                                                         | Clinician inputs, demographic & obstetric metrics, indication narrative.                 | Persisted `Referral` entity with `CREATED` & `SENT` milestones.                               |
| **Module 2: Receiving Facility**   | `/facility`                | Intake triage review, hospital bed reservation, decline logging (the referral then floats until the patient chooses), arrival confirmation by case ID for any patient who reaches this hospital, and structured clinical outcome recording.                                                  | Inbound transfers, staff attribution, room/bay allocation, clinical assessment findings. | Status mutations: `ACKNOWLEDGED`, `REJECTED`, `REDIRECTED`, `ARRIVAL_CONFIRMED`, `COMPLETED`. |
| **Module 3: Care Coordination**    | `/coordinator`             | Urgent cases not yet arrived, totals, and a filterable referral queue.                                                                                                                                                                                                                       | Central `ReferralContext` collection.                                                    | Triage prioritization, case escalations, shift handover audit reports.                        |
| **Module 4: Care Navigation**      | `/navigator`               | Coordinator's Caseload screen: contact attempt logging (call, voicemail, home visit), preferred language & interpreter scheduling, barrier flagging.                                                                                                                                         | Patient contact attempts, social determinants of health (SDOH).                          | `CommunicationLog`, updated `Barrier` records.                                                |
| **Module 5: Barrier Resolution**   | `/barriers`                | Dedicated barrier mitigation desk, root-cause diagnostics, specialized transit dispatch, receiving bed hold extension.                                                                                                                                                                       | Unresolved barrier records, transit deficits.                                            | Transition of barriers to `RESOLVED`, trigger of `TransportRequest`.                          |
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
   - Automatically serializes the entire state tree to `localStorage` under `navexa_domain_v4`.
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
