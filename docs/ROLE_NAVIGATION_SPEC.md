# Navexa Health — Role-Based Navigation & Workspace Architecture Specification

**Document:** `docs/ROLE_NAVIGATION_SPEC.md`  
**Version:** 3.1.0  
**Status:** IMPLEMENTED & VERIFIED  
**Architect:** Lead Frontend Architect & Healthcare UX Specialist  

---

## 1. Executive Summary & Problem Resolution

In clinical and care-coordination platforms, multi-stakeholder integrity is paramount:
> **"A patient must never encounter an administrative triage console. A hospital intake clerk must not see patient-only lifelines or coordinator command tools. And a coordinator must only see tools relevant to their oversight mission."**

Prior to this implementation, all personas in Navexa Health were presented with an identical, monolithic 10-item sidebar regardless of active role. 

This architectural flaw has been completely resolved. Navexa Health now enforces **strict role-specific navigation, independent workspace information architecture, and client-side demonstration route boundaries**.

---

## 2. Primary Operational Roles

The platform defines four distinct primary operational personas:

| Role Identifier | Role Title | Short Title | Operational Focus | Default Workspace (`homePath`) |
| :--- | :--- | :--- | :--- | :--- |
| `coordinator` | **Care Coordinator** | Coordinator | System-wide referral coordination, acuity prioritization, shift logs, capacity monitoring. | `/coordinator` |
| `facility` | **Receiving Healthcare Facility** | Facility Operations | Inbound transfer triage, bed hold, rejection/diversion, physical arrival confirmation, clinical outcomes. | `/facility` |
| `patient` | **Patient & Family** | Patient Journey | Reassuring, plain-language care progress, transit vehicle ETA, emergency 911 advisory, 42-day follow-up. | `/patient` |
| `navigator` | **Care Navigator** | Community Caseload | Patient outreach logging (calls/visits), medical interpreter booking, SDOH barrier mitigation, transit dispatch. | `/navigator` |

---

## 3. Centralized Navigation Architecture (`src/config/navigationConfig.js`)

Navigation is centralized in [`src/config/navigationConfig.js`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/config/navigationConfig.js). The sidebar and mobile drawer derive their items directly from `getNavigationForRole(role)` without scattering conditional checks throughout visual templates.

### 3.1 Care Coordinator Navigation (`role === 'coordinator'`)
The coordinator's sidebar focuses strictly on triage command, barrier oversight, and logistics:

1. **Coordinator Command Center** (`/coordinator`): 6-KPI analytical ribbon, priority triage queue, hospital capacity overview.
2. **Priority Referral Queue** (`/coordinator?view=queue`): Filterable triage table with urgency badges and handover actions.
3. **Barrier Resolution Desk** (`/barriers`): Socioeconomic barrier triage, transit dispatch vouchers, receiving bed holds.
4. **Care Navigator Caseload** (`/navigator`): Caseload balance, outreach logs, and social worker assignments.
5. **Transport Operations Desk** (`/transport`): Medical fleet tracking, vehicle allocation, driver dispatch, disruption recovery.
6. **Regional Facility Grid** (`/network`): 5 partner medical centers, capacity percentages, direct transfer lines.
7. **42-Day Continuity of Care** (`/continuity`): Postpartum surveillance schedule, touchpoint logs, and clinical findings.
8. **Initiate New Referral** (`/create`): 4-step perinatal transfer wizard.

*Restricted from Coordinator:* Patient-only personal journey view (`/patient`).

---

### 3.2 Receiving Facility Navigation (`role === 'facility'`)
The hospital triage and intake sidebar focuses strictly on clinical admissions and handover:

1. **Facility Operations Hub** (`/facility`): Facility switcher (St. Jude, Valley Children's, etc.), active bed counters, triage controls.
2. **Pending Intake Queue** (`/facility?tab=pending`): Unacknowledged transfer referrals awaiting acceptance or bed hold.
3. **In-Transit Patient Transfers** (`/facility?tab=intransit`): Inbound patients en route with active vehicle ETAs.
4. **Physical Arrivals & Intake** (`/facility?tab=arrived`): Threshold verification modal capturing staff ID, arrival time, and triage bay.
5. **Clinical Outcomes & Handover** (`/facility?tab=completed`): Formal clinician assessment modal (maternal delivery vs neonatal TSB/APGAR).
6. **Diverted / Declined Cases** (`/facility?tab=redirected`): Capacity declination logs and regional hospital redirections.
7. **Regional Care Capacity Grid** (`/network`): Inter-hospital bed capacity and transfer contacts.

*Restricted from Facility:* Coordinator Command Center (`/coordinator`), Barrier Resolution Desk (`/barriers`), Fleet Dispatch (`/transport`), Community Outreach (`/navigator`), Create Referral (`/create`), Patient Journey (`/patient`).

---

### 3.3 Patient & Family Navigation (`role === 'patient'`)
The patient interface is intentionally minimal, calming, and free of clinical jargon or administrative clutter:

1. **My Care Journey** (`/patient`): 5-stage reactive care progress roadmap, immediate status hero, assigned navigator card.
2. **Live Transport & Ride Status** (`/patient?view=transit`): Live vehicle details (MediVan #04), driver name, phone link, and real-time ETA.
3. **What to Bring Checklist** (`/patient?view=checklist`): Interactive preparation checklist (ID, insurance, meds, slippers).
4. **42-Day Postpartum Plan** (`/continuity`): Plain-language postpartum recovery touchpoint schedule.
5. **Support & Emergency Help** (`/patient?view=support`): Direct 1-tap call to Care Navigator and emergency 911 banner.

*Restricted from Patient:* ALL administrative triage tools (`/coordinator`, `/facility`, `/barriers`, `/transport`, `/create`, `/network`, `/navigator`).

---

### 3.4 Care Navigator Navigation (`role === 'navigator'`)
The care navigator sidebar focuses on community social work and direct patient assistance:

1. **Navigator Caseload Desk** (`/navigator`): Caseload roster, contact history logger (phone/voicemail/home visit), interpreter booking.
2. **Barrier Resolution Desk** (`/barriers`): Socioeconomic barrier diagnostics and transit voucher authorization.
3. **Transport Fleet Dispatch** (`/transport`): Medical vehicle dispatch and car seat enforcement.
4. **42-Day Postpartum Touchpoints** (`/continuity`): Post-discharge well-mother and well-baby visit surveillance.
5. **Regional Facility Grid** (`/network`): Medical center directory for transfer routing.

*Restricted from Navigator:* Hospital clinical outcomes (`/facility`), Referral creation wizard (`/create`), Patient smartphone view (`/patient`).

---

## 4. Route Boundaries & Demonstration Guardrails

### 4.1 Client-Side Role Boundary Guard (`src/components/AppShell.jsx`)
When a user attempts to access a URL not permitted for their active persona (e.g. A Patient visiting `/coordinator` or `/facility`), [`AppShell.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/components/AppShell.jsx) intercepts the render and displays a dedicated **Role Boundary Screen**:

```
┌─────────────────────────────────────────────────────────────┐
│                       🔒 Lock Icon                          │
│                                                             │
│              Restricted to Care Coordinator                 │
│                                                             │
│  This workspace (/coordinator) is designated for the       │
│  Care Coordinator persona. You are currently viewing       │
│  Navexa Health as the Patient & Family persona.             │
│                                                             │
│  ┌──────────────────────┐     ┌──────────────────────────┐  │
│  │ Return to Patient    │     │ Switch to Care           │  │
│  │ Workspace            │     │ Coordinator Persona      │  │
│  └──────────────────────┘     └──────────────────────────┘  │
│                                                             │
│       Demonstration Guard • Client-Side Simulation          │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Graceful Fallbacks & 404 Handling
- **Missing Referral ID:** Navigating to an invalid ID like `/referral/UNKNOWN-ID` renders a helpful "Referral Case Not Found" card with a link back to the active workspace, rather than silently falling back to a default case.
- **Unknown Routes:** Completely invalid URLs (e.g. `/xyz`) render a dedicated `NotFound.jsx` page inside `AppShell` with a direct link back to the active role's dashboard.

---

## 5. Instant Demonstration Persona Switching

To facilitate seamless jury evaluations:
1. **Sidebar Footer:** Every sidebar includes a quick persona dropdown selector allowing evaluators to switch roles from any screen in 1 click.
2. **Top Header Pill:** The header displays the active role pill with an instant link to `/` (Role Selection Portal).
3. **Role Selection Landing (`/`):** Displays 4 elevated persona cards (`Care Coordinator`, `Healthcare Facility`, `Patient & Family`, `Care Navigator`) along with direct screen shortcuts.

