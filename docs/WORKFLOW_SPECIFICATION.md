# Navexa Health — Operational Workflow Specification

**Document:** `docs/WORKFLOW_SPECIFICATION.md`  
**Version:** 3.1.0  
**Updated:** November 04, 2026  
**Status:** IMPLEMENTED. The referral rules are unit tested. The AI features are built, but they have not been checked with live AI keys.  
**Auditor/Architect:** Maternal & Neonatal Healthcare Workflow Specialist

---

## 1. End-to-End Maternal & Neonatal Referral Lifecycle

```
[Referring Clinic] ──(Create Referral)──► [SENT]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             [Facility Acknowledge]                      [Facility Decline]
                       │                                           │
                       ▼                                           ▼
               [ACKNOWLEDGED]                             [REJECTED, floats]
                       │                                           │
         ┌─────────────┴─────────────┐                             ▼
         │ Barrier Flagged?          │                     (Family chooses hospital)
         │ [Yes] ──► [Transit Desk]  │                             │
         │           [DISPATCHED]    │                             ▼
         │           [PICKED_UP]     │                         [REDIRECTED, then SENT]
         │ [No]                      │
         └─────────────┬─────────────┘
                       │
                       ▼
             [ARRIVAL_CONFIRMED] (Triage Physical Check-In)
                       │
                       ▼
        [CLINICAL_ASSESSMENT_RECORDED] (Attending Clinician Outcome)
                       │
                       ▼
                  [COMPLETED] (Hospital Episode Concluded)
                       │
                       ▼
        [42-DAY CONTINUOUS CARE ACTIVATED] (Postpartum & Neonatal Surveillance)
```

---

## 2. Detailed Workflow Specifications

### Workflow 1: Referral Initiation & Submission

- **Responsible Actor:** Referring Healthcare Clinician (MD, MS (OBG), Midwife).
- **Workspace:** `/create` ([`CreateReferral.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CreateReferral.jsx)). Opened from the New referral button, which only the hospital role sees. The clinician can use Fill with AI (typed note, recordings and photo, in any mix) and must check every field before sending.
- **Input Data:**
  - Patient classification: `Maternal` vs `Child` vs `Dyad`.
  - Priority: `ROUTINE`, `PRIORITY`, `URGENT` or `STAT`.
  - Clinical narrative: Indication for emergency transfer, membrane status, vitals.
  - Social barriers: Transportation availability, language, preferred interpreter.
  - Source clinic & Destination regional hospital.
- **Validation Rules:**
  - Referring clinic cannot be identical to receiving hospital.
  - Patient name and MRN must be non-empty strings.
  - Emergency contact phone must be present.
- **Output:** Persisted `Referral` record with status `SENT` and initial `CREATED` and `SENT` timeline notes.
- **Cross-Module Consequence:** Referral immediately surfaces in the receiving hospital's pending queue on [`FacilityDashboard.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx) and the Coordinator Command Center on [`CoordinatorDashboard.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CoordinatorDashboard.jsx).

---

### Workflow 2: Facility Intake Review & Acknowledgment

- **Responsible Actor:** Receiving Hospital Triage Nurse / Intake Clerk.
- **Workspace:** `/facility` ([`FacilityDashboard.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx)).
- **Action Options:**
  1. **Acknowledge:** Mutates status to `ACKNOWLEDGED`. Reserves bed/room capacity.
  2. **Decline:** Requires a reason (e.g. "Level III NICU at capacity"). Status becomes `REJECTED`, and the referral floats until the family chooses a hospital.
  3. **Patient chooses (recorded by the coordinator):** The family picks another hospital, such as Vidyaranya Institute. Status goes to `REDIRECTED`, the diversion is kept in the redirect history, and the referral is re-sent to the new hospital as `SENT`. A hospital that declined is not offered again.
- **Validation:** Only incoming referrals addressed to the active facility can be transitioned.
- **Cross-Module Consequence:** Patient view updates to Step 2 ("Hospital is ready for you"). Timeline records bed hold.

---

### Workflow 3: Barrier Identification & Transit Dispatch

- **Responsible Actor:** Care Navigator / Social Worker (Priya Raman, MSW; Arjun Nair, RN).
- **Workspaces:** the Blocked tab of `/patients` (`/barriers` redirects there; the tables are in [`BarrierTables.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/components/BarrierTables.jsx)) and `/transport` ([`TransportCoordination.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/TransportCoordination.jsx)).
- **Input Data:**
  - Barrier classification: `TRANSPORT`, `FINANCIAL`, `DEPENDENT_CARE`, `LINGUISTIC`, `WEATHER`, `CLINICAL_HESITATION`.
  - Transit unit designation: MediVan #04 (equipped with infant safety seat), Transit Van #02, or Ambulance #01.
  - Driver attribution, contact number, pickup address, passenger count, ETA.
- **Operational Transitions:**
  - `REQUESTED` → `ASSIGNED` → `DISPATCHED` → `PICKED_UP` → `ARRIVED` (or `FAILED`), and `CANCELLED`. Send van moves a van from `REQUESTED` through `ASSIGNED` to `DISPATCHED` in one action.
- **Validation:** Neonatal transfers must flag mandatory neonatal transport kit requirement.
- **Cross-Module Consequence:**
  - Patient view ([`PatientDashboard.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/PatientDashboard.jsx)) activates Step 3 ("Ride to the hospital") with real driver name and ETA.
  - Associated `TRANSPORT` barrier is automatically resolved.

---

### Workflow 4: Physical Arrival Verification

- **Responsible Actor:** Hospital Intake Staff / Clerk.
- **Workspace:** `/facility` (Confirm arrival).
- **Input Data:** Arrival time, ward, bed number, IP number (optional), received by (name), and role (Staff nurse, Ward sister, Duty doctor, Medical officer or ANM).
- **Transition:** `SENT`, `ACKNOWLEDGED` or `REJECTED` → `ARRIVAL_CONFIRMED`.
- **Clinical Distinction:** Physical arrival does **not** signify that clinical treatment has occurred. It confirms the patient has crossed the hospital threshold, closing the transit risk window.
- **Cross-Module Consequence:** The patient journey moves to "Check in at the hospital".

---

### Workflow 5: Clinical Assessment & Structured Outcome Recording

- **Responsible Actor:** Authorized Attending Clinician (MD, MS (OBG), FICOG).
- **Workspace:** `/facility` (Record outcome).
- **Strict Domain Separation:**
  - **Maternal Cases:** Captures maternal status, delivery type (spontaneous vaginal, assisted, caesarean) and disposition.
  - **Neonatal Cases:** Captures neonatal status (for example, phototherapy initiated) and disposition. The form does not yet ask for TSB, APGAR or birth weight, although the record can hold birth weight. Only the fields for the patient's type are kept.
- **Transition:** `ARRIVAL_CONFIRMED` → `CLINICAL_ASSESSMENT_RECORDED` → `COMPLETED`.
- **Automated Trigger:** Transitioning to `COMPLETED` automatically instantiates a linked **42-Day Continuing Care Plan** (`FollowUpPlan`).

---

### Workflow 6: 42-Day Postpartum & Neonatal Care Continuity

- **Responsible Actor:** Community Midwife / Lactation Specialist / Navigator.
- **Workspace:** `/continuity` ([`ContinuityOfCare.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ContinuityOfCare.jsx)).
- **Touchpoint Schedule:**
  - **Day 3:** Lactation onset, early wound check, neonatal jaundice re-screen.
  - **Day 7:** Severe preeclampsia recurrence check, BP assessment, surgical wound check.
  - **Day 14:** Postpartum mental health (EPDS depression screening), infant weight gain check.
  - **Day 42:** Comprehensive well-woman exam, family planning, primary care handoff.
- **Actions:** Document clinical visit findings, check off touchpoints, flag missed visits. Missed and escalated states are worked out from the visit dates, and no reminder is sent.

---

### Workflow 7: Family report from the assistant (AI)

- **Responsible Actor:** The family, through the assistant. Then the care navigator.
- **Workspace:** `/patient/assistant` (Get help), and the chat button on other family screens.
- **Input Data:** The newest question only. Earlier turns of the chat are not used to raise a report.
- **Rules:**
  - A possible danger sign raises a critical alert and a timeline entry that quotes the family's words (up to 200 characters). The family is told to call 108.
  - A practical barrier (cost, childcare, transport, language, weather or road, fear of the hospital) opens a barrier titled "(raised by family)". Only one open barrier per category.
  - Nothing is diagnosed. The navigator calls the family to check.
- **Status:** Unit tested with fake AI replies (`src/domain/workflow.test.js`, `server/assistant.test.js`). Not checked with live AI, because no API keys are set up.

### Workflow 8: Handoff summary (AI)

- **Responsible Actor:** A named clinician at the receiving hospital, who confirms the summary.
- **Workspace:** Case page (`/referral/:id`), staff only.
- **Input Data:** The record without names, phone numbers, caregiver details or addresses. Notes have names and long numbers removed before they are sent.
- **Output:** Situation, background, referrer's assessment, request and missing items. Marked "Drafted by AI".
- **Transition:** The draft is saved with no confirmer. A named person confirms "I've checked it", which adds a timeline entry and an audit entry. A confirmed summary cannot be confirmed again.
- **Status:** Redaction and sign-off are unit tested. The AI draft has not been checked live.
