# Navexa Health — Comprehensive System Audit & Technical Report

**Document Version:** 1.0.0  
**Audit Date:** October 16, 2026  
**Auditor:** Antigravity Advanced Agentic AI  
**Repository Inspected:** `d:/ANTIGRAVITY/Healthathon/health-a-thon`  
**Execution Mode:** Read-Only Technical Audit

---

## 1. Executive Summary

**Navexa Health** is conceived as a maternal and newborn healthcare referral coordination and care-navigation platform designed to ensure safe, timely transitions across healthcare tiers (primary, community, secondary, tertiary) and maintain visibility of vulnerable mothers and infants, including outside hospital walls.

This technical audit examined 100% of the active repository source code, build scripts, configuration, state management, UI components, and mock records.

### Key Audit Findings

1. **Architecture & Runtime State:**
   The current system is a **pure client-side React 18 single-page application (SPA)** built with Vite 5 and styled with vanilla CSS (~5,660 lines in `src/index.css`). There is **zero backend infrastructure, zero database persistence, and zero external API integration**. All referral records reside in React in-memory component state (`useState`) seeded by 3 mock objects in `src/data/demoReferral.js`. Any browser refresh (F5) purges all newly created referrals and status transitions.
2. **Community & Care Navigation Capabilities:**
   While the intended concept emphasizes helping mothers and newborns who do not visit a hospital (home outreach, community care navigation, barrier removal, transport coordination, and postnatal continuity), these capabilities are **almost entirely absent or simulated**. There is no data model for care navigators, home visits, transport vouchers, barrier identification, or clinical outcomes.
3. **Hardcoded Demo Shortcuts:**
   Key views rely on hardcoded IDs and strings that disconnect workflows:
   - `PatientDashboard.jsx` hardcodes `const patientId = "P-1001";` ([PatientDashboard.jsx:190](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/PatientDashboard.jsx#L190)), meaning any new referral created in the demo cannot be tracked by switching to the Patient role.
   - `FacilityDashboard.jsx` hardcodes `const facilityName = "District Hospital";` ([FacilityDashboard.jsx:12](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L12)), filtering incoming and outgoing queues exclusively against this string.
   - Captured fields such as `caregiverContact` ([CreateReferral.jsx:195-207](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CreateReferral.jsx#L195-L207)) are stored in memory but never rendered on any dashboard, referral detail view, or coordinator queue.
4. **Referral State Machine Gaps:**
   Referral state is tracked as raw strings (`CREATED`, `SENT`, `ACKNOWLEDGED`, `ARRIVAL_CONFIRMED`, `COMPLETED`, `FOLLOW_UP_REQUIRED`). There is no redirection, rejection, or cancellation mechanism. Referrals in `CREATED` status cannot be acted upon from the Facility Dashboard action button due to a missing case branch ([FacilityDashboard.jsx:54-89](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L54-L89)), and are completely invisible on the Coordinator Dashboard ([CoordinatorDashboard.jsx:9-35](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CoordinatorDashboard.jsx#L9-L35)).
5. **Build and Code Hygiene:**
   `npm run build` compiles cleanly into production assets in 2.42s with zero JSX/syntax errors. However, the package script `"lint": "eslint ."` fails immediately because `eslint` is not installed, the HTML page title remains `Health-a-thon Dashboard`, and no automated tests exist.

---

## 2. Product Overview and Intended Purpose

### 2.1 The Problem Addressed

Maternal and neonatal mortality in low-resource and tiered healthcare ecosystems often stem from delays in:
- Deciding to seek care.
- Reaching an appropriate facility (transport, financial, geographical barriers).
- Receiving adequate care upon arrival (lack of facility preparedness, bed/specialist availability).
- Continuity of care post-discharge (untracked postpartum complications, neonatal sepsis, missed immunizations).

Traditional healthcare referrals in these contexts rely on paper slips or informal phone calls. When a patient cannot afford transport or fears hospital visits, they vanish from the system.

### 2.2 Intended Product Concept vs. Implemented System

The intended Navexa platform aims to bridge these gaps via digital tracking, proactive community navigator assignment, transport assistance, barrier resolution, arrival confirmation, and continuing care tracking.

In reality, the implemented repository is an early-stage **frontend visual prototype** focused on demonstrating a linear milestone progression for hospital-bound referrals.

---

## 3. Implemented Features vs. Missing Features

The following matrix evaluates every core feature against the codebase using the standardized audit labels: `IMPLEMENTED`, `PARTIALLY IMPLEMENTED`, `SIMULATED`, `UI ONLY`, `ABSENT`, or `UNVERIFIED`.

| Capability / Feature                     | Classification          | Source Code Citation & Implementation Evidence                                                                                                                                                                                                                                                                                                        |
| :--------------------------------------- | :---------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Referral Creation Form**               | `IMPLEMENTED`           | [CreateReferral.jsx:40-93](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CreateReferral.jsx#L40-L93): Form captures patient name, ID, caregiver contact, referral type, priority, source/destination facility, reason. Form validates required fields and generates `NAV-2026-XXX` ID.                                                   |
| **Live Referral Preview**                | `IMPLEMENTED`           | [CreateReferral.jsx:526-660](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CreateReferral.jsx#L526-L660): Dynamic sidebar updates form inputs in real time.                                                                                                                                                                              |
| **Role-Based UI Partitioning**           | `IMPLEMENTED`           | [App.jsx:24-59](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/App.jsx#L24-L59), [RoleSelection.jsx:33-37](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/RoleSelection.jsx#L33-L37): Client-side role switching between `patient`, `facility`, `coordinator` stored in `localStorage` (`navexa_role`).                             |
| **Facility Referral Queues**             | `PARTIALLY IMPLEMENTED` | [FacilityDashboard.jsx:14-26](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L14-L26): Filters `incomingReferrals` and `outgoingReferrals` strictly by `toFacility === "District Hospital"` and `fromFacility === "District Hospital"`. `needsAttention` filters all referrals with `SENT` or `FOLLOW_UP_REQUIRED`. |
| **Milestone Advancement**                | `IMPLEMENTED`           | [FacilityDashboard.jsx:54-89](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L54-L89), [ReferralDetails.jsx:206-251](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx#L206-L251): Functions mutate `status` and append to `timeline` array.                                           |
| **Audit Timeline Display**               | `IMPLEMENTED`           | [ReferralTimeline.jsx:7-36](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/components/ReferralTimeline.jsx#L7-L36), [ReferralDetails.jsx:477-568](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx#L477-L568): Renders milestone history with timestamps and notes.                                               |
| **Patient Referral Tracking**            | `PARTIALLY IMPLEMENTED` | [PatientDashboard.jsx:186-233](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/PatientDashboard.jsx#L186-L233): Visual progress rail with status messages. Hardcoded to `P-1001`; other patients cannot view their records.                                                                                                                |
| **Coordinator Operations Queue**         | `PARTIALLY IMPLEMENTED` | [CoordinatorDashboard.jsx:9-35](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CoordinatorDashboard.jsx#L9-L35): Categorizes referrals into Needs Attention, Monitoring, and Completed. Excludes `CREATED` status.                                                                                                                        |
| **Care Navigator Assignment**            | `ABSENT`                | No navigator data entity, field, or assignment action exists in any schema or component.                                                                                                                                                                                                                                                              |
| **Patient / Caregiver Contact Tracking** | `PARTIALLY IMPLEMENTED` | Captured in `CreateReferral.jsx:195-207`, stored in object state, but never rendered in `ReferralDetails.jsx` or any dashboard. Missing in initial `demoReferrals`.                                                                                                                                                                                   |
| **Missed-Referral Detection**            | `ABSENT`                | No elapsed-time checks, SLA timers, cron schedules, or overdue warning triggers.                                                                                                                                                                                                                                                                      |
| **Missed-Appointment Follow-up**         | `ABSENT`                | No appointment entity, visit schedule, or appointment date fields exist.                                                                                                                                                                                                                                                                              |
| **Barrier Identification & Resolution**  | `ABSENT`                | No barrier taxonomy (financial, transport, cultural, medical). "Resolve Follow-up" in [CoordinatorDashboard.jsx:45-51](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CoordinatorDashboard.jsx#L45-L51) simply resets status to `ACKNOWLEDGED`.                                                                                           |
| **Home Outreach Tracking**               | `ABSENT`                | Zero support for community health workers (ASHA/ANM), home visits, or non-hospital encounters.                                                                                                                                                                                                                                                        |
| **Transport Coordination**               | `UI ONLY`               | [PatientDashboard.jsx:601-611](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/PatientDashboard.jsx#L601-L611): "Get Directions" button triggers a browser `alert()`. No transport booking or status.                                                                                                                                      |
| **Clinical Escalation**                  | `ABSENT`                | "Urgent" priority is a static label/badge. No escalation alerts, triage protocols, or routing alterations exist for critical cases.                                                                                                                                                                                                                   |
| **Facility Acknowledgement**             | `IMPLEMENTED`           | Receiving facility can transition status from `SENT` -> `ACKNOWLEDGED` ([FacilityDashboard.jsx:55-62](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L55-L62)).                                                                                                                                                     |
| **Arrival Verification**                 | `IMPLEMENTED`           | Receiving facility can transition status `ACKNOWLEDGED` -> `ARRIVAL_CONFIRMED` ([FacilityDashboard.jsx:64-71](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L64-L71)).                                                                                                                                             |
| **Service Outcome Recording**            | `SIMULATED`             | Transitioning to `COMPLETED` appends a static text string. No clinical outcome form, neonatal status, maternal survival, or discharge notes exist.                                                                                                                                                                                                    |
| **Follow-up Scheduling**                 | `ABSENT`                | No calendar, scheduling inputs, or appointment reminders exist.                                                                                                                                                                                                                                                                                       |
| **Continued Care After Closure**         | `ABSENT`                | When status becomes `COMPLETED`, the referral is closed and journey terminates ([ReferralDetails.jsx:110-118](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx#L110-L118)). No postpartum/postnatal follow-up tracking.                                                                                                 |
| **Referral Redirection / Rejection**     | `ABSENT`                | No pathway to reject an unserviceable referral, re-route to another hospital, or cancel.                                                                                                                                                                                                                                                              |
| **Backend API / Data Persistence**       | `ABSENT`                | Zero HTTP endpoints, Fetch/Axios calls, or remote DB connections. In-memory state only.                                                                                                                                                                                                                                                               |
| **Authentication & Authorization**       | `SIMULATED`             | Role selector writes string to `localStorage`. No credentials, tokens, or security verification.                                                                                                                                                                                                                                                      |

---

## 4. User Roles and Permissions

Role management is orchestrated by [ReferralContext.jsx:23-36](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/context/ReferralContext.jsx#L23-L36) and enforced by `ProtectedRoute` in [App.jsx:24-59](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/App.jsx#L24-L59).

### 4.1 Implemented Roles

```
                      ┌──────────────────────┐
                      │   Public Entry (/)   │
                      │    RoleSelection     │
                      └──────────┬───────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
 ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
 │   patient    │        │   facility   │        │ coordinator  │
 └───────┬──────┘        └───────┬──────┘        └───────┬──────┘
         │                       │                       │
         ▼                       ├──────────────────┐    │
┌─────────────────┐              ▼                  ▼    ▼
│/patient         │      ┌───────────────┐   ┌──────────────────┐
│PatientDashboard │      │/create        │   │/referral/:id     │
└─────────────────┘      │CreateReferral │   │ReferralDetails   │
                         └───────────────┘   └──────────────────┘
                                 │                   ▲
                                 ▼                   │
                         ┌───────────────┐           │
                         │/facility      ├───────────┘
                         │FacilityDash   │
                         └───────────────┘
```

#### 1. Patient / Caregiver (`role: "patient"`)

- **Permitted Routes:** `/patient`
- **Dashboard View:** Shows active referral journey for hardcoded `P-1001`, current status message, milestone progress rail (1 to 5), "Request Human Help" button (`window.alert`), and "Get Directions" button (`window.alert`).
- **Restrictions:** Cannot access `/facility`, `/coordinator`, `/create`, or `/referral/:id`. Redirected to `/patient` if attempted.
- **Navbar:** Displays "Dashboard", "Need Help?" action button, active role pill, and "Switch Role" button.

#### 2. Healthcare Facility (`role: "facility"`)

- **Permitted Routes:** `/facility`, `/create`, `/referral/:id`
- **Dashboard View:** Displays facility metrics (Incoming, Outgoing, Needs Attention) filtered for "District Hospital", referral cards with milestone progress bars, inline primary action buttons to advance statuses, and a "+ New Referral" CTA.
- **Actions:** Can create referrals at `/create`, advance statuses (`SENT` -> `ACKNOWLEDGED` -> `ARRIVAL_CONFIRMED` -> `COMPLETED`), and view full details at `/referral/:id`.
- **Restrictions:** Cannot access `/coordinator` or `/patient`. Redirected to `/facility` if attempted.

#### 3. Coordinator (`role: "coordinator"`)

- **Permitted Routes:** `/coordinator`, `/referral/:id`
- **Dashboard View:** Operations center with tabbed queues: "Needs Attention" (`SENT`, `FOLLOW_UP_REQUIRED`), "Being Monitored" (`ACKNOWLEDGED`, `ARRIVAL_CONFIRMED`), and "Completed" (`COMPLETED`).
- **Actions:** Can click "Start Follow-up" (moves `SENT` -> `FOLLOW_UP_REQUIRED`), click "Resolve Follow-up" (moves `FOLLOW_UP_REQUIRED` -> `ACKNOWLEDGED`), and view `/referral/:id`.
- **Restrictions:** Cannot access `/facility`, `/create`, or `/patient`. Redirected to `/coordinator` if attempted.

### 4.2 Security & Permission Assessment

- Role enforcement is 100% client-side inside React Router.
- Anyone can open browser developer tools and execute `localStorage.setItem("navexa_role", "facility")` or `"coordinator"` to access all dashboards and mutate referral data.
- Facilities can view and mutate referrals belonging to any other facility; there is no tenancy isolation.

---

## 5. Complete Screen Inventory

### Screen 1: Role Selection (`RoleSelection.jsx`)

- **Route:** `/` (Public)
- **Source File:** [src/pages/RoleSelection.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/RoleSelection.jsx)
- **Intended Role:** Unauthenticated visitor / Demo operator.
- **Layout:** Centered card grid on soft gradient background with branding header.
- **Data Displayed:** 3 role options: Patient/Caregiver, Healthcare Facility, Coordinator, with titles, descriptions, and CTA arrows.
- **Available Actions:** Clicking any role card invokes `handleRoleSelect(role)` -> calls `setRole(role.id)` -> navigates to corresponding route (`/patient`, `/facility`, `/coordinator`).
- **State Involved:** `ReferralContext`: `setRole()`, which persists to `localStorage.getItem("navexa_role")`.
- **States:** No empty/loading/error states needed.
- **Known Limitations:** Prototype disclaimer at bottom: _"Prototype mode — role selection is simulated for demonstration."_

---

### Screen 2: Patient Dashboard (`PatientDashboard.jsx`)

- **Route:** `/patient`
- **Source File:** [src/pages/PatientDashboard.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/PatientDashboard.jsx)
- **Intended Role:** Patient or Family Caregiver.
- **Layout:** Hero section with status dot, status card with tone border, journey progress rail with connecting lines, next step guidance card, help card, and disclaimer footer.
- **Data Displayed:** Referral ID, referral type, priority, route (`fromFacility` -> `toFacility`), current status label, explanation message, last updated timestamp, 5-stage progress rail, next step advice.
- **Available Actions:**
  - "Request Human Help": Fires `window.alert("Human assistance requested. A coordinator can follow up.")`. Does not write to state or alert coordinator.
  - "Get Directions": Fires `window.alert("Demo navigation to " + activeReferral.toFacility)`.
- **State Involved:** `ReferralContext`: `referrals` (read-only).
- **Screens Affected:** None (actions do not mutate state).
- **Empty State:** Implemented ([PatientDashboard.jsx:201-219](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/PatientDashboard.jsx#L201-L219)). Displays checkmark icon and _"No active referral"_ if no matching record is found.
- **Critical Defects:**
  - Line 190 hardcodes `const patientId = "P-1001";`. Referrals created for any other patient ID will never display.
  - If a patient has multiple referrals, it only displays the first uncompleted referral ([PatientDashboard.jsx:196-199](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/PatientDashboard.jsx#L196-L199)).

---

### Screen 3: Facility Dashboard (`FacilityDashboard.jsx`)

- **Route:** `/facility`
- **Source File:** [src/pages/FacilityDashboard.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx)
- **Intended Role:** Referring or Receiving Facility Healthcare Staff.
- **Layout:** Hero with "+ New Referral" button, 3 metric cards (Incoming, Outgoing, Needs Attention), Action Queue section (if open attention items exist), Incoming Referrals section, and Outgoing Referrals section.
- **Data Displayed:** Metrics counts, referral cards with IDs, patient names, priority pill, route, type, creation date, animated percentage progress bar (20%, 35%, 55%, 75%, 100%), and attention banner.
- **Available Actions:**
  - "+ New Referral": Navigates to `/create`.
  - "View Details": Navigates to `/referral/:id`.
  - Primary Action button (`handlePrimaryAction`):
    - When `SENT`: Updates status to `ACKNOWLEDGED`.
    - When `ACKNOWLEDGED`: Updates status to `ARRIVAL_CONFIRMED`.
    - When `ARRIVAL_CONFIRMED`: Updates status to `COMPLETED`.
    - When `FOLLOW_UP_REQUIRED`: Updates status to `ACKNOWLEDGED`.
- **State Involved:** `ReferralContext`: `referrals`, `updateReferralStatus`.
- **Screens Affected:** Updates propagate to `CoordinatorDashboard`, `ReferralDetails`, and `PatientDashboard` (if `P-1001`).
- **Empty States:** Implemented for incoming (`facility-empty` with checkmark) and outgoing (`facility-empty` with arrow icon).
- **Critical Defects:**
  - Line 12 hardcodes `facilityName = "District Hospital"`. Referrals routed between other facilities are omitted from Incoming/Outgoing.
  - If a referral is newly created (`status: "CREATED"`), button text says "View Referral", but clicking it invokes `handlePrimaryAction()`, which does NOT match any `if` branch and does NOT navigate! The button is functionally dead ([FacilityDashboard.jsx:54-89](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L54-L89), [103-105](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L103-L105)).

---

### Screen 4: Coordinator Dashboard (`CoordinatorDashboard.jsx`)

- **Route:** `/coordinator`
- **Source File:** [src/pages/CoordinatorDashboard.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CoordinatorDashboard.jsx)
- **Intended Role:** Centralized Referral Coordinator / System Operator.
- **Layout:** Hero with current date formatted (`en-IN`), 3 interactive KPI summary buttons acting as tab switchers, work queue header with item counts, tab bar, referral list cards, and safety footer.
- **Data Displayed:** Dynamic counts for Needs Attention, Monitoring, and Completed. Cards show referral ID, patient name, type, priority, route, tone-based status pill, progress bar percentage, operational issue explanation, assigned follow-up owner (`"Referral Coordinator"`), and action buttons.
- **Available Actions:**
  - Tab Switcher: Sets `view` to `"attention"`, `"monitoring"`, or `"completed"`.
  - "Start Follow-up" (on `SENT` referrals): Updates status to `FOLLOW_UP_REQUIRED` with note: _"Coordinator follow-up started because the referral has not received the expected acknowledgement."_
  - "Resolve Follow-up" (on `FOLLOW_UP_REQUIRED` referrals): Updates status to `ACKNOWLEDGED` with note: _"Coordinator completed the operational follow-up and the referral can continue."_
  - "View Referral": Navigates to `/referral/:id`.
- **State Involved:** `ReferralContext`: `referrals`, `updateReferralStatus`.
- **Screens Affected:** Immediately updates `FacilityDashboard`, `ReferralDetails`, and `PatientDashboard`.
- **Empty States:** Implemented for all three tabs with custom messages (_"All clear"_, _"Nothing is being monitored"_, _"No completed referrals yet"_).
- **Critical Defects:**
  - `CREATED` status is omitted from all three filter categories ([CoordinatorDashboard.jsx:9-35](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CoordinatorDashboard.jsx#L9-L35)). Any un-sent referral is completely invisible to coordinators.
  - If a patient is acknowledged but never arrives at the hospital, the coordinator has NO button to initiate follow-up from this screen (action button only appears when `referral.status === "SENT"`).

---

### Screen 5: Create Referral (`CreateReferral.jsx`)

- **Route:** `/create`
- **Source File:** [src/pages/CreateReferral.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CreateReferral.jsx)
- **Intended Role:** Referring Healthcare Facility Worker (Facility role).
- **Layout:** Two-column split layout: Left = 4-section structured form; Right = Sticky live summary card with journey preview.
- **Data Displayed:**
  - Form: Section 01 (Patient Name, Patient ID, Caregiver Contact), Section 02 (Maternal / Child radio cards, Routine / Urgent priority toggles), Section 03 (Referring Facility dropdown, Receiving Facility dropdown), Section 04 (Referral Information textarea).
  - Live Preview: Auto-updating ID (`NAV-2026-XXX`), Patient name/ID, Route with arrow, Type & Priority tags, Journey step flow.
- **Available Actions:**
  - Form change handlers update local `formData`.
  - "Cancel": Navigates back via `navigate(-1)`.
  - "Create Referral" (Submit): Validates `patientName`, `patientId`, and `reason`. Generates ID (`NAV-2026-` + padded next number), builds referral object with status `CREATED`, appends to context via `addReferral()`, and navigates to `/referral/${referralId}`.
- **State Involved:** Local form state `formData`, context `addReferral()`.
- **Validation Rules:** Required text checks for `patientName`, `patientId`, and `reason`. Displays alert error banner if blank ([CreateReferral.jsx:44-57](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CreateReferral.jsx#L44-L57)).
- **Defects & Gaps:**
  - No check against duplicate `patientId`.
  - No validation on phone number formatting for `caregiverContact`.
  - Referring and Receiving facilities can be set to the exact same facility (e.g. District Hospital to District Hospital).

---

### Screen 6: Referral Details (`ReferralDetails.jsx`)

- **Route:** `/referral/:id`
- **Source File:** [src/pages/ReferralDetails.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx)
- **Intended Role:** Facility staff and Coordinators.
- **Layout:** Header with Back button and role pill; Tone-colored Hero banner with Referral ID and status pill; Visual Route diagram with source/destination icons; Two-column grid (Left: Details card, Reason box, Milestone Journey timeline with connectors; Right: Next Action card, Quick Summary, Quick Workspace links).
- **Data Displayed:** Full referral attributes, historical timeline entries with formatted dates, times, and audit notes. Next required action title, description, and button.
- **Available Actions:**
  - "← Back": `navigate(-1)`.
  - "Send Referral" (when `CREATED`): Moves status -> `SENT`.
  - "Acknowledge Referral" (when `SENT`): Moves status -> `ACKNOWLEDGED`.
  - "Flag for Follow-up" (when `SENT`): Moves status -> `FOLLOW_UP_REQUIRED`.
  - "Confirm Patient Arrival" (when `ACKNOWLEDGED`): Moves status -> `ARRIVAL_CONFIRMED`.
  - "Complete Referral" (when `ARRIVAL_CONFIRMED`): Moves status -> `COMPLETED`.
  - "Mark Follow-up Resolved" (when `FOLLOW_UP_REQUIRED`): Moves status -> `ACKNOWLEDGED`.
- **State Involved:** `ReferralContext`: `getReferralById(id)`, `updateReferralStatus`.
- **Screens Affected:** Updates propagate to all dashboards.
- **Empty State:** Comprehensive "Referral not found" screen with a back button if `:id` does not match ([ReferralDetails.jsx:165-191](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx#L165-L191)).
- **Defects & Gaps:**
  - `caregiverContact` captured during creation is never displayed on this screen.
  - "Flag for Follow-up" is only available when status is `SENT`. If a patient goes missing after acknowledgement or arrival confirmation, staff cannot flag it for follow-up from this view.

---

### Auxiliary Components

#### 1. `Navbar.jsx`

- **Source File:** [src/components/Navbar.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/components/Navbar.jsx)
- Renders sticky glassmorphism header, Navexa brand logo (links to `/`), role-specific navigation links, active role badge with dot indicator, and "Switch Role" button.
- Handles logout via context `logout()` which clears `localStorage` and routes to `/`.

#### 2. `ReferralCard.jsx`

- **Source File:** [src/components/ReferralCard.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/components/ReferralCard.jsx)
- Reusable generic referral card component.
- Note: `FacilityDashboard.jsx` does not import or use this component; it implements its own internal nested `ReferralCard` component ([FacilityDashboard.jsx:118-241](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L118-L241)). Consequently, `src/components/ReferralCard.jsx` is currently **dead code** (unused across the entire application).

#### 3. `ReferralTimeline.jsx`

- **Source File:** [src/components/ReferralTimeline.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/components/ReferralTimeline.jsx)
- Reusable timeline renderer.
- Note: `ReferralDetails.jsx` and `PatientDashboard.jsx` both implement their own specialized timeline rendering logic inline. `ReferralTimeline.jsx` is also currently **dead code** (unused across the application).

#### 4. `StatusBadge.jsx`

- **Source File:** [src/components/StatusBadge.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/components/StatusBadge.jsx)
- Renders rounded status pills using a color mapping (`STATUS_CONFIG`). Used only inside `ReferralCard.jsx` (which is itself unused).

---

## 6. User Journeys and Workflow Diagrams

### 6.1 The Happy Path (Supported by Code)

```
[ Facility Worker ]          [ System ]            [ Facility Worker ]         [ Coordinator ]         [ Receiving Facility ]
         │                       │                          │                         │                          │
  1. Fill /create form           │                          │                         │                          │
  ───────────────────────► Add to context                   │                         │                          │
                           (status: CREATED)                │                         │                          │
                                 │                          │                         │                          │
                                 │ 2. Open /referral/:id    │                         │                          │
                                 └─────────────────────────►│                         │                          │
                                                            │                         │                          │
                                                            │ 3. Click "Send"         │                          │
                                                            ├────────────────────────►│                          │
                                                            │    (status: SENT)       │                          │
                                                            │                         │                          │
                                                            │                         │ 4. "Acknowledge"         │
                                                            │                         │ ────────────────────────►│
                                                            │                         │ (status: ACKNOWLEDGED)   │
                                                            │                         │                          │
                                                            │                         │ 5. "Confirm Arrival"     │
                                                            │                         │ ────────────────────────►│
                                                            │                         │ (status: ARRIVAL_CONF)   │
                                                            │                         │                          │
                                                            │                         │ 6. "Complete Referral"   │
                                                            │                         │ ────────────────────────►│
                                                            │                         │ (status: COMPLETED)      │
                                                            │                         │ (Journey Closed)         ▼
```

### 6.2 The Exception / Follow-up Path (Supported by Code)

```
[ Facility / Coordinator ]                                  [ Coordinator ]
            │                                                      │
     Status is "SENT"                                              │
            │                                                      │
            ├─────── Flag for Follow-up (ReferralDetails) ────────►│
            │                         OR                           │
            ├─────── Start Follow-up (CoordinatorDashboard) ──────►│
            │                                                      │
            ▼                                                      ▼
  Status: FOLLOW_UP_REQUIRED ─────────────────────────────► In Attention Queue
                                                                   │
                                                                   │ Coordinator calls facility / investigates
                                                                   │
                                                                   ▼
                                                            Click "Resolve Follow-up"
                                                                   │
                                                                   ▼
                                                         Status: ACKNOWLEDGED
                                                        (Re-enters Normal Flow)
```

### 6.3 Unsupported / Dead-End Paths in Current Code

1. **Patient Missing / Transport Failure:** If a patient cannot reach the facility after acknowledgement, there is no code path to record transport failure, assign an outreach worker, or flag the case from `ACKNOWLEDGED` status in `ReferralDetails`.
2. **Facility Capacity Reached / Specialization Unavailable:** The receiving facility cannot click "Redirect" or "Decline". They must either leave it in `SENT` or acknowledge it regardless of capacity.
3. **Clinical Deterioration in Transit:** No escalation mechanism to alert tertiary emergency response or re-route an ambulance.
4. **Postpartum Follow-up:** As soon as "Complete Referral" is clicked, all monitoring ceases.

---

## 7. Actual Architecture and Component Hierarchy

### 7.1 Architecture Overview

- **Framework:** React 18.3.1
- **Build Tool:** Vite 5.3.4 (configured in [vite.config.js](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/vite.config.js))
- **Routing:** React Router DOM 6.24.1 (`BrowserRouter` in [main.jsx:10](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/main.jsx#L10))
- **State Pattern:** Single Context Provider (`ReferralProvider` in [ReferralContext.jsx:15-100](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/context/ReferralContext.jsx#L15-L100)) wrapping the entire component tree.
- **Styling Architecture:** Monolithic vanilla stylesheet in [src/index.css](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/index.css) utilizing CSS custom properties (variables), Flexbox, CSS Grid, and media queries. No CSS modules, no Tailwind compiler, no CSS-in-JS runtime.

### 7.2 Full Component Hierarchy Tree

```
<BrowserRouter>
  <ReferralProvider>                 [Provides: referrals, role, addReferral, updateReferralStatus, getReferralById, setRole, logout]
    <App>                            [Layout container, route definitions, ProtectedRoute guards]
      │
      ├── <Navbar />                 [Sticky header, brand logo, role pill, role switcher, help alert]
      │
      └── <main className="page-container">
            │
            ├── <Routes>
            │     │
            │     ├── <Route path="/" element={<RoleSelection />} />
            │     │
            │     ├── <Route path="/patient" element={
            │     │     <ProtectedRoute allowedRoles={["patient"]}>
            │     │       <PatientDashboard />
            │     │     </ProtectedRoute>
            │     │   } />
            │     │
            │     ├── <Route path="/facility" element={
            │     │     <ProtectedRoute allowedRoles={["facility"]}>
            │     │       <FacilityDashboard>
            │     │         └── [Nested] <ReferralCard />
            │     │       </FacilityDashboard>
            │     │     </ProtectedRoute>
            │     │   } />
            │     │
            │     ├── <Route path="/coordinator" element={
            │     │     <ProtectedRoute allowedRoles={["coordinator"]}>
            │     │       <CoordinatorDashboard />
            │     │     </ProtectedRoute>
            │     │   } />
            │     │
            │     ├── <Route path="/create" element={
            │     │     <ProtectedRoute allowedRoles={["facility"]}>
            │     │       <CreateReferral />
            │     │     </ProtectedRoute>
            │     │   } />
            │     │
            │     ├── <Route path="/referral/:id" element={
            │     │     <ProtectedRoute allowedRoles={["facility", "coordinator"]}>
            │     │       <ReferralDetails />
            │     │     </ProtectedRoute>
            │     │   } />
            │     │
            │     └── <Route path="*" element={<Navigate to="/" replace />} />
            │
            └── </Routes>
```

---

## 8. Data Entities and Relationships

### 8.1 The Referral Entity Schema

Currently, the **Referral** object is the sole data entity in the application. There are no separate tables or objects for Patients, Facilities, Users, or Navigators.

```typescript
interface Referral {
  id: string; // Unique string, e.g., "NAV-2026-001"
  patientName: string; // E.g., "Ananya Sharma"
  patientId: string; // E.g., "P-1001"
  caregiverContact?: string; // E.g., "9876543210" (Captured in /create, omitted in demo records)
  fromFacility: string; // E.g., "Primary Health Centre"
  toFacility: string; // E.g., "District Hospital"
  referralType: "Maternal" | "Child";
  priority: "Routine" | "Urgent";
  status: "CREATED" | "SENT" | "ACKNOWLEDGED" | "ARRIVAL_CONFIRMED" | "COMPLETED" | "FOLLOW_UP_REQUIRED";
  createdAt: string; // ISO 8601 string, e.g. "2026-10-01T09:00:00Z"
  reason: string; // Freeform narrative text
  timeline: TimelineEvent[]; // Chronological array of milestone transitions
}

interface TimelineEvent {
  status: string; // Status transitioned into
  date: string; // ISO 8601 string timestamp
  notes: string; // Descriptive explanation of the event
}
```

### 8.2 Origin and Lifespan of Data

1. **Seed Data:** 3 records defined in [src/data/demoReferral.js](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/data/demoReferral.js):
   - `NAV-2026-001`: Ananya Sharma (`P-1001`), Maternal, Urgent, Primary Health Centre -> District Hospital, Status: `SENT`.
   - `NAV-2026-002`: Rahul Das (`P-1002`), Child, Urgent, District Hospital -> Tertiary Care Hospital, Status: `ACKNOWLEDGED`.
   - `NAV-2026-003`: Meera Devi (`P-1003`), Maternal, Routine, Community Health Centre -> District Hospital, Status: `ACKNOWLEDGED`.
2. **State Updates:** Mutated in React state by `addReferral()` and `updateReferralStatus()` in [ReferralContext.jsx:41-76](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/context/ReferralContext.jsx#L41-L76).
3. **Persistence:** Zero local storage or server sync for referrals. Refreshing browser tab resets all referrals to the 3 demo records.
4. **Cross-Role Propagation:** Because all role pages read from the same React Context instance, mutating a referral in `FacilityDashboard` or `ReferralDetails` immediately reflects in `CoordinatorDashboard` without a reload (during the same browser session).

---

## 9. Referral State Machine and Transition Rules

The application uses string matching rather than a formalized finite state machine (e.g. XState).

### 9.1 State Transition Matrix

| Initial State        | Allowed Action                                  | Trigger Component / File                                                                                                                                                                                                                                                                                                                                                        | Resulting State      | Appended Timeline Note                                                                     |
| :------------------- | :---------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------- | :----------------------------------------------------------------------------------------- |
| `CREATED`            | "Send Referral"                                 | [ReferralDetails.jsx:209-214](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx#L209-L214)                                                                                                                                                                                                                                                         | `SENT`               | _"Referral sent to the receiving facility."_                                               |
| `SENT`               | "Acknowledge"                                   | [FacilityDashboard.jsx:55-62](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L55-L62), [ReferralDetails.jsx:216-222](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx#L216-L222)                                                                                                                                | `ACKNOWLEDGED`       | _"Receiving facility acknowledged the referral."_                                          |
| `SENT`               | "Flag for Follow-up" / "Start Follow-up"        | [ReferralDetails.jsx:253-259](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx#L253-L259), [CoordinatorDashboard.jsx:37-43](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CoordinatorDashboard.jsx#L37-L43)                                                                                                                          | `FOLLOW_UP_REQUIRED` | _"Referral requires operational follow-up because acknowledgement has not been received."_ |
| `FOLLOW_UP_REQUIRED` | "Resolve Follow-up" / "Mark Follow-up Resolved" | [FacilityDashboard.jsx:82-88](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L82-L88), [CoordinatorDashboard.jsx:45-51](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CoordinatorDashboard.jsx#L45-L51), [ReferralDetails.jsx:240-246](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx#L240-L246) | `ACKNOWLEDGED`       | _"Coordinator completed the operational follow-up and the referral can continue."_         |
| `ACKNOWLEDGED`       | "Confirm Arrival"                               | [FacilityDashboard.jsx:64-71](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L64-L71), [ReferralDetails.jsx:224-230](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx#L224-L230)                                                                                                                                | `ARRIVAL_CONFIRMED`  | _"Patient arrival confirmed at the receiving facility."_                                   |
| `ARRIVAL_CONFIRMED`  | "Complete Referral"                             | [FacilityDashboard.jsx:73-80](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L73-L80), [ReferralDetails.jsx:232-238](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx#L232-L238)                                                                                                                                | `COMPLETED`          | _"Referral care/service completed and recorded."_                                          |
| `COMPLETED`          | _(None — Terminal)_                             | [ReferralDetails.jsx:111-118](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx#L111-L118)                                                                                                                                                                                                                                                         | `COMPLETED`          | Terminal state. No further actions permitted.                                              |

### 9.2 Transition Anomalies & Edge Cases

1. **Broken Button on `FacilityDashboard` for `CREATED`:**
   In [FacilityDashboard.jsx:104](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L104), if status is `CREATED`, `getPrimaryActionLabel()` returns `"View Referral"`. When clicked, `handlePrimaryAction()` runs, checks `SENT`, `ACKNOWLEDGED`, `ARRIVAL_CONFIRMED`, `FOLLOW_UP_REQUIRED`, finds no match, and terminates with no action. It fails to navigate or update status.
2. **Invisible `CREATED` Referrals on Coordinator Dashboard:**
   In [CoordinatorDashboard.jsx:9-35](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CoordinatorDashboard.jsx#L9-L35), referrals with status `CREATED` are not matched by `attentionReferrals`, `monitoringReferrals`, or `completedReferrals`. They vanish from the operations center.
3. **No Reversal or Backtracking:**
   If a user accidentally clicks "Confirm Arrival" or "Complete Referral", there is no undo or reversion function.

---

## 10. Care Navigator and Continuity-of-Care Capabilities

A central pillar of Navexa Health is supporting vulnerable maternal and neonatal patients who may not make it to a hospital. This audit systematically examined the codebase for evidence of care-navigation features:

### Detailed Capability Audit

```
┌───────────────────────────────────────────────┬────────────────────────────┐
│ Capability                                    │ Status in Existing Code    │
├───────────────────────────────────────────────┼────────────────────────────┤
│ 1. Care navigator assignment                  │ ABSENT                     │
│ 2. Patient or caregiver contact tracking      │ PARTIALLY IMPLEMENTED      │
│ 3. Missed-referral detection                  │ ABSENT                     │
│ 4. Missed-appointment follow-up               │ ABSENT                     │
│ 5. Barrier identification and resolution      │ ABSENT                     │
│ 6. Home outreach tracking                     │ ABSENT                     │
│ 7. Transport coordination                     │ UI ONLY                    │
│ 8. Clinical escalation                        │ ABSENT                     │
│ 9. Facility acknowledgement                   │ IMPLEMENTED                │
│ 10. Arrival verification                      │ IMPLEMENTED                │
│ 11. Service outcome recording                 │ SIMULATED                  │
│ 12. Follow-up scheduling                      │ ABSENT                     │
│ 13. Continued care after referral closure     │ ABSENT                     │
└───────────────────────────────────────────────┴────────────────────────────┘
```

#### Detailed Findings on Navigator Workflow:

- In `CoordinatorDashboard.jsx:476-489`, the card footer displays an avatar with letters `"RC"` and label `"FOLLOW-UP OWNER: Referral Coordinator"`. This is static markup rendered identically on every card. There is no navigator assignment mechanism, no staff directory, and no re-assignment dropdown.
- There are no forms or data structures to log caregiver interactions, phone call results, home visit reports, or transportation vouchers.
- When a referral reaches `COMPLETED`, the entire journey terminates. In real-world maternal care, the postpartum period (especially the first 48 hours and up to 42 days) represents a peak period for maternal mortality (hemorrhage, sepsis, eclampsia) and neonatal mortality (hypothermia, asphyxia, infections). The existing system ceases tracking at the moment of hospital service completion.

---

## 11. Backend, APIs and Integrations

| Subsystem                   | Implemented Status | Code Evidence / Technical Reality                                                                                                                                |
| :-------------------------- | :----------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REST / GraphQL APIs**     | `ABSENT`           | No endpoints, routes, controllers, or fetch/axios calls anywhere in `src/`.                                                                                      |
| **Database / ORM**          | `ABSENT`           | No SQL/NoSQL databases, Supabase, Firebase, Prisma, or local IndexedDB/Dexie.                                                                                    |
| **Authentication**          | `SIMULATED`        | Simulated via `localStorage.getItem("navexa_role")`. No tokens, passwords, sessions, or backend validation.                                                      |
| **SMS / WhatsApp / Alerts** | `ABSENT`           | No Twilio, AWS SNS, Infobip, or WhatsApp Business API. "Need Help?" invokes native browser `window.alert()`.                                                     |
| **GIS / Maps / Routing**    | `UI ONLY`          | "Get Directions" in `PatientDashboard.jsx:604-610` fires `alert("Demo navigation to " + activeReferral.toFacility)`. No Mapbox, Google Maps, or Leaflet scripts. |
| **AI / Machine Learning**   | `ABSENT`           | No LLM APIs, OpenAI, Anthropic, Gemini, or clinical decision support engines.                                                                                    |
| **Healthcare Standards**    | `ABSENT`           | No HL7 FHIR (Fast Healthcare Interoperability Resources) bundle exports, OpenMRS sync, or ABDM (Ayushman Bharat Digital Mission) M1/M2/M3 compliance.            |

---

## 12. UI/UX and Responsive Design Assessment

### 12.1 Visual Design and Styling System

The visual styling in [src/index.css](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/index.css) is comprehensive (~5,660 lines) and achieves an attractive, modern aesthetic:
- **Palette:** Clinical, reassuring tones based on primary blue (`#1769AA`), soft dark blue (`#124F7F`), teal accents (`#159A95`), warm amber for pending/attention states (`#FFF4D6`, `#946200`), and emerald greens for completed states (`#DFF5E8`, `#146C43`).
- **Typography:** Uses clean system sans-serif font stack headed by `Inter` with strong typographic hierarchy.
- **Micro-interactions:** Includes subtle card hover elevations (`transform: translateY(-2px)`), smooth transitions (`0.2s ease-in-out`), and pulse/active dot animations.
- **Glassmorphism:** Navigation bar uses `backdrop-filter: blur(14px)` with high-translucency white border.

### 12.2 Dashboard Readability & Information Architecture

- The **Coordinator Dashboard** and **Facility Dashboard** present clear, scannable layouts with strong KPI counters and distinct visual tags for `Routine` vs `Urgent`.
- The **Patient Dashboard** effectively reduces cognitive load by converting a clinical workflow into an accessible, step-by-step progress rail with friendly status descriptions.

### 12.3 Usability and Design Flaws

1. **Dead Component Code:**
   `ReferralCard.jsx`, `ReferralTimeline.jsx`, and `StatusBadge.jsx` in `src/components/` are entirely disconnected from the actual page views. Each dashboard page duplicates its own status badges, cards, and timelines inline.
2. **Duplicated Configuration:**
   Status color mappings, labels, and progress percentages are redefined in 5 separate files with slight variations in wording (`"Facility Acknowledged"` vs `"Acknowledged"`, `"Care completed"` vs `"Completed"`).
3. **Accessibility (a11y):**
   - Interactive role selection cards in `RoleSelection.jsx` are `<button>` elements, which is good for keyboard focus, but many custom clickable icons lack `aria-label` tags.
   - Contrast between muted text (`#667085` or `#6C757D`) and background (`#F5F8FB`) passes WCAG AA for large text but is borderline on smaller captions (`0.78rem`).
4. **Responsive Adaptability:**
   Media queries exist for `< 850px` and `< 600px`. On mobile screens, cards wrap neatly and navigation collapses spacing, but complex horizontal route lines (`FROM -> TO`) can wrap awkwardly on narrow viewports (<360px).

---

## 13. Security, Privacy and Clinical-Safety Findings

### 13.1 Security & Data Privacy Findings

> [!WARNING]
> **Client-Side Authorization:** There is no server boundary. Any user can alter their assigned role or modify referral objects by interacting directly with React developer tools or local console.

- **Unprotected PHI (Protected Health Information):** Patient names and identifiers are displayed in clear text without masking, consent tracking, or role-based field redaction.
- **Lack of Audit Logging:** While the UI appends entries to a `timeline` array, these timestamps and notes are generated by the client browser clock (`new Date().toISOString()`). They can be fabricated or manipulated, lacking cryptographic signatures, immutable database storage, or authenticated user attribution.
- **Session Lifespan:** `localStorage.getItem("navexa_role")` never expires.

### 13.2 Clinical Safety Risks

> [!CAUTION]
> **No Distinction for Clinical Urgency:** While referrals allow setting `priority: "Urgent"`, the platform enforces the exact same asynchronous queue for urgent cases as for routine cases. There is no automated escalation, SMS alert, emergency bypass, or sound notification for life-threatening obstetric emergencies.

- **Completion Without Clinical Validation:** A hospital worker can click "Complete Referral" with zero validation of whether the mother or neonate survived, received surgery, or was stabilized. Marking a referral "Completed" could lead coordinators to assume a patient is safe when they may have left against medical advice (LAMA) or suffered adverse outcomes.
- **Inability to Flag Emergencies in Transit:** Once acknowledged, if a patient deteriorates or gets stuck en route, the system provides no mechanism for family or referring facilities to flag the referral back to the coordinator.
- **False Sense of Security via "Need Help" Button:** The "Need Help?" button on the patient view triggers a browser alert telling the patient _"Human support request created. A care coordinator will follow up."_ In reality, **nothing is created, no state is updated, and no coordinator is notified**. In a real clinical scenario, a patient facing an emergency who clicks this button would wait in vain for help that was never dispatched.

---

## 14. Build and Runtime Validation Results

### 14.1 Execution Environment & Validation Log

- **Node/Vite Environment:** Executed within project directory `d:/ANTIGRAVITY/Healthathon/health-a-thon`.
- **Command Tested:** `npm run build` (`vite build`)
- **Build Outcome:** **SUCCESS (Exit code 0)**
  - Output Assets:
    - `dist/index.html`: 0.41 kB (gzip: 0.28 kB)
    - `dist/assets/index-B28_hLtd.css`: 53.92 kB (gzip: 9.91 kB)
    - `dist/assets/index-Cg2bO9WK.js`: 217.30 kB (gzip: 64.46 kB)
  - Build Duration: 2.42s
  - Modules Transformed: 43 modules. Zero syntax or JSX compilation errors.
- **Lint Script Tested:** `npm run lint` (`eslint .`)
  - Outcome: **FAILED (Exit code 1)**
  - Error: `'eslint' is not recognized as an internal or external command, operable program or batch file.`
  - Root Cause: `eslint` is declared in `package.json` `"scripts"`, but neither `eslint` nor any linting plugins are included in `devDependencies`.
- **Test Scripts:**
  - In `package.json`, there are **zero test scripts** and no test frameworks (Vitest, Jest, React Testing Library, or Cypress) installed. No automated unit or integration tests exist in the repository.

---

## 15. Bugs, Limitations and Technical Debt

### 15.1 Confirmed Bugs

1. **Dead Button on Facility Dashboard (`FacilityDashboard.jsx:54-89`):**
   When a referral is in `CREATED` status, the action button displays "View Referral" but calls `handlePrimaryAction()`, which does nothing and does not navigate.
2. **Invisible `CREATED` Referrals on Coordinator Dashboard (`CoordinatorDashboard.jsx:9-35`):**
   `CREATED` referrals are omitted from all tab filters and do not display in the coordinator work queue.
3. **Hardcoded Patient Filter (`PatientDashboard.jsx:190`):**
   `patientId = "P-1001"` prevents any newly created referral from being viewed on the patient screen.
4. **Hardcoded Facility Filter (`FacilityDashboard.jsx:12`):**
   `facilityName = "District Hospital"` causes incoming/outgoing lists to ignore referrals to/from other health centres.
5. **Dropped Field (`CreateReferral.jsx:195-207`):**
   `caregiverContact` is collected in the form, saved in the object, but never rendered in `ReferralDetails.jsx` or any other screen.
6. **Simulated "Need Help" Disconnect (`Navbar.jsx:46-49`, `PatientDashboard.jsx:592-595`):**
   Fires an alert promising coordinator follow-up, but writes nothing to state, leaving no trace in the coordinator's queue.

### 15.2 Technical Debt & Code Redundancy

1. **Dead Components:** `src/components/ReferralCard.jsx`, `ReferralTimeline.jsx`, and `StatusBadge.jsx` are completely unused across the application.
2. **Status Logic Duplication:** Status labels, step indices, tones, and descriptions are independently hardcoded across `FacilityDashboard.jsx`, `CoordinatorDashboard.jsx`, `PatientDashboard.jsx`, and `ReferralDetails.jsx`.
3. **In-Memory Volatility:** Lack of local storage or mock API caching means data resets on every browser refresh.
4. **Unconfigured Linting:** Broken `npm run lint` script due to missing `eslint` dependency.
5. **Default Document Title:** `index.html` title remains `"Health-a-thon Dashboard"`.

---

## 16. Prioritized Recommendations

To guide the next engineering phase, recommendations are structured by priority:

### Priority 0 (P0) — Critical Safety, Data-Integrity & Blocking Defects

- **P0.1: Fix In-Memory Persistence & Dynamic Patient Session:**
  Persist referrals to `localStorage` (or mock IndexedDB) in `ReferralContext` so data survives page refresh. Remove hardcoded `patientId = "P-1001"`; allow selecting which patient or referral is active in the Patient view.
- **P0.2: Fix Dead Buttons & State Transitions:**
  Fix `handlePrimaryAction` in `FacilityDashboard.jsx` to either allow sending `CREATED` referrals or navigate directly to `/referral/:id`. Include `CREATED` referrals in `CoordinatorDashboard.jsx`.
- **P0.3: Connect "Need Help" to Real State:**
  When a patient clicks "Request Human Help", immediately transition the referral status to `FOLLOW_UP_REQUIRED` and write a note to `timeline` so it appears in the Coordinator's "Needs Attention" queue.
- **P0.4: Render Caregiver Contact:**
  Display `caregiverContact` prominently in `ReferralDetails.jsx` and `CoordinatorDashboard.jsx` so staff can actually contact the patient.

### Priority 1 (P1) — Essential for a Convincing End-to-End Prototype

- **P1.1: Implement Care Navigator Entity & Assignment:**
  Introduce a navigator model (name, phone, catchment area). Add a dropdown in `CoordinatorDashboard` and `ReferralDetails` to assign a specific Community Health Worker / Care Navigator.
- **P1.2: Support Redirection & Rejection:**
  Allow receiving facilities to decline or redirect referrals to alternative facilities with a mandatory reason (e.g. "NICU at capacity").
- **P1.3: Add Structured Outcome Recording:**
  Replace the instant "Complete Referral" click with a modal capturing: Maternal outcome (stable, complicated, deceased), Neonatal outcome (live birth, birth weight, APGAR score, NICU admission), and Discharge summary.
- **P1.4: Eliminate Dead Code & Centralize Status Config:**
  Delete or re-integrate `src/components/ReferralCard.jsx`, `ReferralTimeline.jsx`, and `StatusBadge.jsx`. Extract status labels, colors, and transitions into a shared `src/constants/referralStatus.js`.

### Priority 2 (P2) — Usability, Validation & Code Quality

- **P2.1: Enhance Form Validation:**
  Validate phone numbers, prevent selecting the same facility for source and destination, and prevent duplicate patient IDs.
- **P2.2: Add Elapsed Time & SLA Warnings:**
  Calculate hours since creation. Highlight referrals in the Coordinator queue that have been unacknowledged for >2 hours or unarrived for >6 hours.
- **P2.3: Fix Tooling & Config:**
  Install ESLint or remove the broken `"lint"` script. Update `<title>` in `index.html` to `"Navexa Health — Maternal & Newborn Referral Coordination"`.

### Priority 3 (P3) — Future Production Capabilities

- **P3.1: Backend & Database Migration:**
  Build a Node.js / Python REST or GraphQL API backed by PostgreSQL.
- **P3.2: FHIR Compliance:**
  Structure referral records following the HL7 FHIR `ServiceRequest` and `Patient` resource profiles.
- **P3.3: Multichannel Messaging:**
  Integrate WhatsApp/SMS APIs (Twilio) to send automated journey updates to families without smartphone apps.
- **P3.4: Postnatal Continuing Care:**
  Extend the data model to support 42-day maternal and newborn home visit schedules post-discharge.

---

## 17. Exact Project Directory Tree

```
d:/ANTIGRAVITY/Healthathon/health-a-thon/
├── .git/                                [Git repository metadata]
├── .gitignore                           [Ignores node_modules, dist, .env, .env.local]
├── README.md                            [Single line: "# health-a-thon"]
├── index.html                           [HTML entry point; title: "Health-a-thon Dashboard"]
├── package-lock.json                    [NPM lockfile]
├── package.json                         [Dependencies: react, react-dom, react-router-dom]
├── vite.config.js                       [Vite configuration with @vitejs/plugin-react]
└── src/
    ├── App.jsx                          [App root, Routes, ProtectedRoute logic]
    ├── index.css                        [Monolithic stylesheet (5,666 lines, 81.6 KB)]
    ├── main.jsx                         [React 18 createRoot mounting point]
    ├── components/
    │   ├── Navbar.jsx                   [Header navigation, role pill, role switcher]
    │   ├── ReferralCard.jsx             [Unused standalone referral card component]
    │   ├── ReferralTimeline.jsx         [Unused standalone timeline component]
    │   └── StatusBadge.jsx              [Unused standalone status badge component]
    ├── context/
    │   └── ReferralContext.jsx          [ReferralProvider, in-memory state, role state]
    ├── data/
    │   └── demoReferral.js              [3 initial mock referral records]
    └── pages/
        ├── CoordinatorDashboard.jsx     [Operations center, tabbed work queues]
        ├── CreateReferral.jsx           [4-step creation form with live preview]
        ├── FacilityDashboard.jsx        [Hospital incoming/outgoing & attention queues]
        ├── PatientDashboard.jsx         [Patient/caregiver journey tracking view]
        ├── ReferralDetails.jsx          [Detailed referral record, timeline & action panel]
        └── RoleSelection.jsx            [Public entry role-selector landing page]
```

---

## 18. Important Source Files and Their Responsibilities

| File Path                                                                                                                 | Primary Responsibilities & Key Exports                                                                                           |
| :------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------- |
| [src/main.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/main.jsx)                                             | Application entry point. Wraps `App` with `React.StrictMode`, `BrowserRouter`, and `ReferralProvider`.                           |
| [src/App.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/App.jsx)                                               | Core router. Defines all route paths and implements `ProtectedRoute` to enforce client-side role guards.                         |
| [src/context/ReferralContext.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/context/ReferralContext.jsx)       | Global state store. Exports `ReferralProvider` and `useReferrals()`. Manages `referrals` in-memory and `role` in `localStorage`. |
| [src/data/demoReferral.js](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/data/demoReferral.js)                     | Exports `demoReferrals` array containing 3 seed referral records (`NAV-2026-001`, `002`, `003`).                                 |
| [src/pages/RoleSelection.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/RoleSelection.jsx)               | Role switcher landing page at `/`. Lets user simulate logging in as Patient, Facility, or Coordinator.                           |
| [src/pages/PatientDashboard.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/PatientDashboard.jsx)         | Patient-facing visual progress tracker at `/patient`. Hardcoded to `P-1001`. Includes help and directions alerts.                |
| [src/pages/FacilityDashboard.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx)       | Clinical staff dashboard at `/facility`. Shows incoming/outgoing queues for "District Hospital" and inline status updates.       |
| [src/pages/CoordinatorDashboard.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CoordinatorDashboard.jsx) | Central coordination queue at `/coordinator`. Categorizes items into Needs Attention, Monitoring, and Completed.                 |
| [src/pages/CreateReferral.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CreateReferral.jsx)             | Referral creation form at `/create`. Includes live preview sidebar, ID generator, and validation.                                |
| [src/pages/ReferralDetails.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx)           | Referral deep-dive view at `/referral/:id`. Displays patient info, visual route, timeline, and next milestone action.            |
| [src/components/Navbar.jsx](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/components/Navbar.jsx)                   | Sticky navigation bar displaying active role, role switcher, role-specific links, and emergency help trigger.                    |
| [src/index.css](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/index.css)                                           | Complete custom design system containing all tokens, resets, component styles, and animations.                                   |

---

## 19. Questions That Cannot Be Answered From Code Alone

1. **Intended Clinical Jurisdiction & Workflow:**
   Is Navexa designed for India's public health system (Sub-Centre -> PHC -> CHC -> DH -> Medical College) aligned with Ayushman Bharat / Janani Suraksha Yojana, or is it intended as a global cross-border platform?
2. **Community Cadre Integration:**
   How were community care navigators envisioned to interact with the system? Via a dedicated mobile PWA, USSD/SMS, or an offline-first mobile app for frontline workers (e.g. ASHA, ANM, Lady Health Workers)?
3. **Emergency Medical Transport Model:**
   Is emergency transport planned to integrate with national emergency dispatch services (such as 108/102 in India), private contracted fleets, or community transport voucher programs?
4. **Backend & Architecture Roadmap:**
   Is there an intended backend framework or cloud stack (e.g. Node/Express, FastAPI, Supabase, AWS HealthLake, Google Cloud Healthcare API)?
5. **Data Protection & Compliance Standards:**
   Which data protection framework must Navexa comply with (India's DPDP Act / DISHA, HIPAA, or GDPR)? This will dictate encryption, consent, and audit-trail architecture.
