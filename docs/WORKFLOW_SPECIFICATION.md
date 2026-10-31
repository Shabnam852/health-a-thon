# Navexa Health — Operational Workflow Specification

**Document:** `docs/WORKFLOW_SPECIFICATION.md`  
**Version:** 3.0.0  
**Status:** IMPLEMENTED & VERIFIED  
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
               [ACKNOWLEDGED]                             [REJECTED / REDIRECT]
                       │                                           │
         ┌─────────────┴─────────────┐                             ▼
         │ Barrier Flagged?          │                     (Select Alternate)
         │ [Yes] ──► [Transit Desk]  │                             │
         │           [DISPATCHED]    │                             ▼
         │           [PICKED_UP]     │                         [Resubmit]
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
- **Responsible Actor:** Referring Healthcare Clinician (MD, CNM, Midwife).
- **Workspace:** `/create` ([`CreateReferral.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CreateReferral.jsx)).
- **Input Data:**
  - Patient classification: `Maternal` vs `Child` vs `Dyad`.
  - Acuity level: `ROUTINE` vs `URGENT` vs `STAT`.
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
  1. **Acknowledge Intake:** Mutates status to `ACKNOWLEDGED`. Reserves bed/room capacity.
  2. **Decline / Reject:** Requires mandatory clinical reason (e.g. "Level III NICU at capacity"). Mutates status to `REJECTED`.
  3. **Redirect:** Selects alternate regional medical center (e.g. UMC Detroit) with clinical justification. Mutates status to `REDIRECTED`, archives diversion history, and resubmits to target center's queue as `SENT`.
- **Validation:** Only incoming referrals addressed to the active facility can be transitioned.
- **Cross-Module Consequence:** Patient view updates to Step 2 ("Hospital Confirmed Ready"). Timeline records bed hold.

---

### Workflow 3: Barrier Identification & Transit Dispatch
- **Responsible Actor:** Care Navigator / Social Worker (Maya Lin, MSW; Marcus Ward, RN).
- **Workspaces:** `/barriers` ([`BarrierResolution.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/BarrierResolution.jsx)) and `/transport` ([`TransportCoordination.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/TransportCoordination.jsx)).
- **Input Data:**
  - Barrier classification: `TRANSPORT`, `FINANCIAL`, `DEPENDENT_CARE`, `LINGUISTIC`, `WEATHER`.
  - Transit unit designation: MediVan #04 (equipped with infant safety seat), Transit Van #02, or Ambulance #01.
  - Driver attribution, contact number, pickup address, passenger count, ETA.
- **Operational Transitions:**
  - `REQUESTED` → `ASSIGNED` → `DISPATCHED` → `PICKED_UP` → `ARRIVED` (or `FAILED`).
- **Validation:** Neonatal transfers must flag mandatory rear-facing infant car seat requirement.
- **Cross-Module Consequence:**
  - Patient view ([`PatientDashboard.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/PatientDashboard.jsx)) activates Step 3 ("Ride on the Way") with real driver name and ETA.
  - Associated `TRANSPORT` barrier is automatically resolved.

---

### Workflow 4: Physical Arrival Verification
- **Responsible Actor:** Hospital Intake Staff / Clerk.
- **Workspace:** `/facility` or `/coordinator`.
- **Input Data:** Arrival timestamp, staff attribution ID, triage bay / room number.
- **Transition:** `ACKNOWLEDGED` → `ARRIVAL_CONFIRMED`.
- **Clinical Distinction:** Physical arrival does **not** signify that clinical treatment has occurred. It confirms the patient has crossed the hospital threshold, closing the transit risk window.
- **Cross-Module Consequence:** Stepper advances to Gate 4 ("Arrival Verified"). Patient roadmap updates to Step 4 ("Arrive & Check In").

---

### Workflow 5: Clinical Assessment & Structured Outcome Recording
- **Responsible Actor:** Authorized Attending Clinician (MD, CNM, FACOG).
- **Workspace:** `/facility` outcome modal or `/referral/:id`.
- **Strict Domain Separation:**
  - **Maternal Cases:** Captures maternal stabilization status, delivery mode (`Spontaneous Vaginal`, `Cesarean`, `Antepartum Observation`), complications, and disposition.
  - **Neonatal Cases:** Captures phototherapy response, TSB reduction curve, APGAR scores, birth weight in grams, and NICU step-down.
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
- **Actions:** Document clinical visit findings, check off touchpoints, flag missed visits with automated escalation.

