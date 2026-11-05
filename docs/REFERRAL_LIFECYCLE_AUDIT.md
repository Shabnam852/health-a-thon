# Navexa Health — Referral Lifecycle & Workflow Audit

**Document:** `docs/REFERRAL_LIFECYCLE_AUDIT.md`  
**Version:** 2.1.0  
**Updated:** November 04, 2026 (diagram, stages 6-18 as noted, scenarios 02, 03, 06, 10)  
**Audit Date:** November 01, 2026  
**Auditor:** Maternal & Neonatal Healthcare Workflow Specialist & Software Architect

---

## 1. Complete Referral State Machine

```mermaid
stateDiagram-v2
    [*] --> CREATED: Form Initiation (/create)
    CREATED --> SENT: Automated Dispatch
    CREATED --> REJECTED: Facility Decline
    SENT --> ACKNOWLEDGED: Facility Acknowledge (/facility)
    SENT --> REJECTED: Facility Decline
    SENT --> REDIRECTED: Re-route
    ACKNOWLEDGED --> ARRIVAL_CONFIRMED: Confirm arrival (/facility)
    SENT --> ARRIVAL_CONFIRMED: Patient arrives

    ACKNOWLEDGED --> REJECTED: Facility Decline
    ACKNOWLEDGED --> REDIRECTED: Re-route
    REJECTED --> REDIRECTED: Patient chooses a hospital
    REJECTED --> ARRIVAL_CONFIRMED: Patient arrives anyway
    REDIRECTED --> SENT: Resubmitted to new facility
    ARRIVAL_CONFIRMED --> CLINICAL_ASSESSMENT_RECORDED: Record Clinical Outcome
    CLINICAL_ASSESSMENT_RECORDED --> COMPLETED: 42-Day Plan Activated
    COMPLETED --> [*]: Terminal State (continuing care follows)
```

> **Note:** the diagram above shows the current rules in `src/domain/transitions.js`. The stage-by-stage audit below is a snapshot from before later fixes, so its file citations and gaps may be out of date. Stages 6, 9, 10, 12, 13, 14, 17 and 18, and scenarios 02, 03, 06 and 10, were checked against the code on November 04, 2026 and updated. The other stages are as first written. Verdicts marked PASS (in code) were read from the code and workflow rules, not run in a browser.

---

## 2. 19-Stage Lifecycle Stage-by-Stage Audit

### Stage 1: Patient Registration & Identification

- **Implementation Status:** `PARTIALLY IMPLEMENTED`
- **File Citations:** [`src/pages/CreateReferral.jsx:16-17`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CreateReferral.jsx#L16-L17), [`src/data/demoReferral.js:4-5`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/data/demoReferral.js#L4-L5)
- **Actual Functionality:** Form generates a pseudo-random MRN (`MRN-XXXXXX`) or allows manual entry. Demo data includes medical record numbers (e.g., `MRN-882104`, `MRN-904211`).
- **Missing Functionality:** No Master Patient Index (MPI), national health identifier lookup, or biometric patient identity matching. Duplicate patients can be created without warning.
- **Data Required:** Full Name, DOB, National Health ID / MRN, Phone Number, Residential Address.
- **Responsible Role:** Referring Healthcare Facility (Intake Clerk / Nurse).
- **Failure Scenarios:** Patient has no ID documents, patient name is misspelled across clinics, duplicate records created for same pregnancy.

### Stage 2: Referral Creation

- **Implementation Status:** `IMPLEMENTED`
- **File Citations:** [`src/pages/CreateReferral.jsx:45-101`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CreateReferral.jsx#L45-L101)
- **Actual Functionality:** 4-step wizard captures patient demographics, obstetric context (gravida, para, gestational age), clinical indication, receiving hospital, and social barriers.
- **Missing Functionality:** No validation to prevent referring to the same hospital or department. No attachment support for lab results, ultrasound images, or partograph records.
- **Data Required:** Referring clinician, source clinic, target department, indication narrative.
- **Responsible Role:** Referring Healthcare Facility (Doctor, Certified Nurse Midwife).
- **Failure Scenarios:** Incomplete clinical narrative entered, incorrect receiving hospital selected.

### Stage 3: Clinical Urgency Classification

- **Implementation Status:** `PARTIALLY IMPLEMENTED`
- **File Citations:** [`src/pages/CreateReferral.jsx:11, 58-59`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CreateReferral.jsx#L11#L58-L59)
- **Actual Functionality:** Captures ROUTINE, URGENT, and STAT triage priorities. Urgency renders as color-coded badges in queues.
- **Missing Functionality:** Urgency does not trigger automated priority escalation, expedited hospital notification, or ambulance dispatch. All priorities follow the exact same asynchronous queue.
- **Data Required:** Triage level, maternal-fetal acuity indicators (BP, fetal heart rate, membrane status).
- **Responsible Role:** Authorized Clinician (MD, MS OBG).
- **Failure Scenarios:** Non-clinical personnel misclassifying an emergency as routine; critical cases sitting unacknowledged in general queue.

### Stage 4: Referral Submission

- **Implementation Status:** `IMPLEMENTED`
- **File Citations:** [`src/pages/CreateReferral.jsx:94-101`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CreateReferral.jsx#L94-L101)
- **Actual Functionality:** Adds referral to context array, sets initial status to `SENT`, adds `CREATED` and `SENT` timeline events, and redirects to `/referral/:id`.
- **Missing Functionality:** No server transmission, delivery receipt acknowledgement, or HL7 FHIR bundle generation.
- **Data Required:** Complete serialized referral payload.
- **Responsible Role:** Referring Healthcare Facility.
- **Failure Scenarios:** Browser closes before submit completes, local storage quota exceeded.

### Stage 5: Receiving Facility Acknowledgement

- **Implementation Status:** `IMPLEMENTED`
- **File Citations:** [`src/pages/FacilityDashboard.jsx:63-70`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L63-L70)
- **Actual Functionality:** Receiving facility clicks "Acknowledge Intake" on incoming card, advancing status from `SENT` to `ACKNOWLEDGED` and appending timeline note.
- **Missing Functionality:** No acknowledgement countdown timer or SLA deadline warning.
- **Data Required:** Facility user ID, intake bed assignment.
- **Responsible Role:** Receiving Healthcare Facility (Triage Nurse / Intake Clerk).
- **Failure Scenarios:** Receiving facility is overwhelmed and fails to check queue; patient arrives before facility acknowledges referral.

### Stage 6: Referral Acceptance, Rejection, or Redirection

- **Implementation Status:** `IMPLEMENTED`
- **File Citations:** [`src/pages/FacilityDashboard.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx), [`src/domain/workflow.js`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/domain/workflow.js)
- **Actual Functionality:** Acknowledge moves `SENT` to `ACKNOWLEDGED`. Decline needs a reason (`REJECTED`), and the referral floats until the family chooses a hospital. The choice is recorded as a redirect (`REDIRECTED`, then `SENT` to the new hospital).
- **Missing Functionality:** There is no direct redirect button for the hospital. Bed figures for the choice list are seeded data, not a live feed.
- **Data Required:** Acceptance flag, rejection reason code, redirect destination facility.
- **Responsible Role:** Receiving Healthcare Facility.
- **Failure Scenarios:** Hospital has zero beds available; patient sent to wrong facility with no digital redirection protocol.

### Stage 7: Patient & Caregiver Notification

- **Implementation Status:** `SIMULATED`
- **File Citations:** [`src/components/TopHeader.jsx:94`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/components/TopHeader.jsx#L94)
- **Actual Functionality:** Notification bell displays static count of "3". Clicking bell triggers a browser `alert()`.
- **Missing Functionality:** No real SMS, automated phone call, WhatsApp, or push notification sent to patient or caregiver mobile numbers.
- **Data Required:** Patient/caregiver phone number, language preference, message payload.
- **Responsible Role:** System Automation / Care Navigator.
- **Failure Scenarios:** Patient has no mobile phone, caregiver number entered incorrectly, patient cannot read SMS due to language or literacy barriers.

### Stage 8: Care Navigator Assignment

- **Implementation Status:** `SIMULATED`
- **File Citations:** [`src/data/demoReferral.js:19-24`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/data/demoReferral.js#L19-L24), [`src/pages/ReferralDetails.jsx:169`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx#L169)
- **Actual Functionality:** Seed data contains navigator profiles (e.g., Priya Raman, MSW; Arjun Nair, RN). UI renders navigator name and role.
- **Missing Functionality:** No interface to assign, reassign, or claim cases. Newly created referrals contain no navigator object and fall back to static text.
- **Data Required:** Navigator ID, workload capacity, specialty (maternal vs. neonatal).
- **Responsible Role:** Care Coordinator / Supervisor.
- **Failure Scenarios:** No navigator available on shift, high-risk cases left unassigned.

### Stage 9: Barrier Identification

- **Implementation Status:** `IMPLEMENTED`
- **File Citations:** [`src/domain/enums.js`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/domain/enums.js), [`src/components/BarrierTables.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/components/BarrierTables.jsx)
- **Actual Functionality:** Barriers use six categories (transport, cost, childcare, language, weather or road, fear of the hospital). Staff can raise them, and the family's assistant can raise one for a practical problem.
- **Missing Functionality:** No severity field. Barriers still depend on the family or the patient telling staff.
- **Data Required:** Barrier category, severity, notes.
- **Responsible Role:** Care Navigator / Social Worker.
- **Failure Scenarios:** Patient fails to disclose financial barrier due to stigma; navigator fails to record language barrier.

### Stage 10: Transport & Practical Assistance Coordination

- **Implementation Status:** `IMPLEMENTED`
- **File Citations:** [`src/components/SendVanDialog.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/components/SendVanDialog.jsx), [`src/domain/workflow.js`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/domain/workflow.js)
- **Actual Functionality:** Send van asks for a van and ETA, then builds a structured dispatch. The transit moves to `DISPATCHED`, and any open transport barrier is resolved. Picked up and Report problem follow.
- **Missing Functionality:** No real transit integration or vehicle telemetry. Vans and drivers are seeded data. No voucher system.
- **Data Required:** Vehicle type, driver name, vehicle plate, passenger count, neonatal transport kit requirement, pickup address, ETA.
- **Responsible Role:** Care Navigator / Transport Dispatcher.
- **Failure Scenarios:** Vehicle dispatched without mandatory neonatal transport kit; driver unable to locate rural address; transport delayed in transit.

### Stage 11: Appointment Scheduling

- **Implementation Status:** `ABSENT`
- **File Citations:** N/A
- **Actual Functionality:** None.
- **Missing Functionality:** The data model does not contain appointment entities, dates, or time slots. No calendar integration.
- **Data Required:** Appointment datetime, clinic location, provider name, visit type.
- **Responsible Role:** Healthcare Facility / Navigator.
- **Failure Scenarios:** Patient arrives on wrong day or time when specialist clinic is closed.

### Stage 12: Arrival Confirmation

- **Implementation Status:** `IMPLEMENTED`
- **File Citations:** [`src/pages/FacilityDashboard.jsx:72-79`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L72-L79), [`src/pages/CoordinatorDashboard.jsx:471-483`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CoordinatorDashboard.jsx#L471-L483)
- **Actual Functionality:** Clicking "Confirm arrival" mutates status to `ARRIVAL_CONFIRMED`, records the ward, bed and staff member, and appends a timestamped timeline note. Allowed from `SENT`, `ACKNOWLEDGED` and `REJECTED`.
- **Missing Functionality:** The name and role are typed by staff, not taken from a login. No link to a hospital bed system.
- **Data Required:** Arrival timestamp, intake clerk ID, exam room / triage bay.
- **Responsible Role:** Receiving Healthcare Facility Intake Staff.
- **Failure Scenarios:** Patient arrives at hospital emergency entrance instead of maternity triage and remains unrecorded; clerk forgets to log arrival.

### Stage 13: Clinical Assessment & Service Outcome Recording

- **Implementation Status:** `PARTIALLY IMPLEMENTED`
- **File Citations:** [`src/pages/FacilityDashboard.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx), [`src/domain/workflow.js`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/domain/workflow.js)
- **Actual Functionality:** The Record outcome modal records maternal status, delivery type, neonatal status, disposition and notes, and the referral completes with a 42-day plan. Only the fields for the patient's type are kept.
- **Missing Functionality:** The form does not ask for diagnosis, TSB, APGAR or birth weight, although the data model can hold birth weight. The clinician name is typed in, not checked against a login.
- **Data Required:** Diagnosis, clinical interventions, maternal outcome, neonatal outcome (APGAR, birth weight), admitting vs. discharge status.
- **Responsible Role:** Receiving Clinician (Attending Physician / Midwife).
- **Failure Scenarios:** Referral marked completed without patient actually receiving medical treatment; adverse clinical outcome unrecorded.

### Stage 14: Missed Referral Detection

- **Implementation Status:** `PARTIALLY IMPLEMENTED`
- **File Citations:** [`src/domain/alarms.js`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/domain/alarms.js)
- **Actual Functionality:** The response clock is worked out from timestamps each time it is read (`src/domain/alarms.js`), with limits by priority. Overdue cases raise alarms in the app.
- **Missing Functionality:** Alarms show only while a screen is open. No notification is sent to a supervisor.
- **Data Required:** Expected arrival time, max transit SLA window, escalation threshold.
- **Responsible Role:** System Automation / Care Coordinator.
- **Failure Scenarios:** Overdue high-risk pregnancy lost in queue without coordinator awareness.

### Stage 15: Missed Appointment Detection

- **Implementation Status:** `ABSENT`
- **File Citations:** N/A
- **Actual Functionality:** None.
- **Missing Functionality:** No mechanism to detect when a scheduled outpatient visit has lapsed.
- **Data Required:** Scheduled appointment datetime, check-in status.
- **Responsible Role:** Healthcare Facility / Navigator.
- **Failure Scenarios:** High-risk mother misses 36-week ultrasound and develops unmonitored pre-eclampsia.

### Stage 16: Follow-Up Task Creation

- **Implementation Status:** `ABSENT`
- **File Citations:** N/A
- **Actual Functionality:** None.
- **Missing Functionality:** No data entity or UI for assigning specific follow-up tasks (e.g., "Conduct day 3 home visit", "Check neonatal bilirubin").
- **Data Required:** Task description, assigned worker, due date, task priority.
- **Responsible Role:** Care Coordinator.
- **Failure Scenarios:** Coordinator intends to follow up but forgets due to lack of task tracking.

### Stage 17: Follow-Up Completion

- **Implementation Status:** `PARTIALLY IMPLEMENTED`
- **File Citations:** [`src/domain/workflow.js`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/domain/workflow.js)
- **Actual Functionality:** Completing a continuing care task records the findings and who completed it in the audit trail (`completeFollowUpTask`). Contact attempts are logged on the Patients page.
- **Missing Functionality:** Contact attempts are not linked to a follow-up task.
- **Data Required:** Contact log, outreach outcome, notes.
- **Responsible Role:** Care Navigator / Community Health Worker.
- **Failure Scenarios:** Failed contact attempt marked as successful follow-up.

### Stage 18: Continuing Maternal & Neonatal Care

- **Implementation Status:** `IMPLEMENTED`
- **File Citations:** [`src/pages/ContinuityOfCare.jsx`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ContinuityOfCare.jsx), [`src/domain/workflow.js`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/domain/workflow.js)
- **Actual Functionality:** The 42-day plan is created when a referral completes. The 42-day follow-up page (`/continuity`) shows touchpoints on days 3, 7, 14 and 42, and records visit findings.
- **Missing Functionality:** Reminders are not sent to the family or the team. Visits cannot be added beyond the planned touchpoints.
- **Data Required:** Postpartum visit schedule (days 3, 7, 14, 42), neonatal immunization schedule, depression screening.
- **Responsible Role:** Community Midwife / Postpartum Care Team.
- **Failure Scenarios:** Postpartum mother discharged after normal delivery develops unmonitored sepsis or secondary postpartum hemorrhage on day 5.

### Stage 19: Referral Closure

- **Implementation Status:** `PARTIALLY IMPLEMENTED`
- **File Citations:** [`src/context/ReferralContext.jsx:68-89`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/context/ReferralContext.jsx#L68-L89)
- **Actual Functionality:** Setting status to `COMPLETED` locks primary actions and marks case finished in coordinator queue.
- **Missing Functionality:** Premature closure cuts off patient from care navigation. No post-closure audit verification.
- **Data Required:** Closure reason, verifying clinician signoff, continuing care plan summary.
- **Responsible Role:** Care Coordinator / Clinical Lead.
- **Failure Scenarios:** Administrative clerk closes referral prematurely while mother or infant is still in critical observation.

---

## 3. Role-Permission Matrix

| Operational Capability              |    Patient     |  Caregiver   | Referring Facility | Receiving Facility | Care Navigator | System Admin |
| :---------------------------------- | :------------: | :----------: | :----------------: | :----------------: | :------------: | :----------: |
| Select Active Persona               |      YES       | NO (Missing) |        YES         |        YES         |      YES       | NO (Missing) |
| Create Outbound Referral            |       NO       |      NO      |        YES         |        YES         |      YES       |      NO      |
| View Referral Case Details          | YES (Assigned) |      NO      |        YES         |        YES         |      YES       |      NO      |
| Acknowledge Referral Intake         |       NO       |      NO      |         NO         |        YES         |       NO       |      NO      |
| Confirm Patient Arrival             |       NO       |      NO      |         NO         |        YES         |      YES       |      NO      |
| Dispatch Transit / Resolve Barriers |       NO       |      NO      |         NO         |         NO         |      YES       |      NO      |
| Record Clinical Outcome             |       NO       |      NO      |         NO         |        YES         |      YES       |      NO      |
| View Regional Bed Capacity          |       NO       |      NO      |        YES         |        YES         |      YES       |      NO      |
| Manage User Accounts & Roles        |       NO       |      NO      |         NO         |         NO         |       NO       | NO (Missing) |
| Configure Facility Master Data      |       NO       |      NO      |         NO         |         NO         |       NO       | NO (Missing) |

---

## 4. Failure & Edge-Case Test Matrix (16 Scenarios)

| Scenario # | Test Scenario Description                           | Expected System Behavior                                                                                 | Actual Observed System Behavior                                                                                          | Compliance Verdict |
| :--------: | :-------------------------------------------------- | :------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------- | :----------------: |
|   **01**   | Referral created but never acknowledged by hospital | System triggers SLA timer warning, flags case in coordinator queue, alerts supervisor.                   | Referral remains in `SENT` status indefinitely. No timer, SLA alert, or notification exists.                             |      **FAIL**      |
|   **02**   | Referral rejected by receiving facility             | Facility logs rejection with clinical reason; referral reverts to coordinator for immediate redirection. | Facility declines with a reason. The referral floats until the family chooses a hospital, which the coordinator records. | **PASS (in code)** |
|   **03**   | Receiving facility redirects patient elsewhere      | Facility selects alternate regional hospital with open beds; digital records transfer seamlessly.        | No facility redirect. The family chooses another hospital, and the referral is re-sent with its history.                 | **PASS (in code)** |
|   **04**   | Patient cannot be reached by phone                  | Navigator logs unsuccessful call attempt; system stages secondary outreach (SMS, home CHW visit).        | No call logging interface. Navigator cannot record unsuccessful contact.                                                 |      **FAIL**      |
|   **05**   | Patient has no caregiver or support person          | Referral flags vulnerability; navigator coordinates hospital doula or community chaperone.               | Field is a simple text string. No lone-parent vulnerability flag exists.                                                 |      **FAIL**      |
|   **06**   | Patient cannot arrange transportation               | Navigator books certified medical transit voucher; transit status updates live on patient view.          | Send van records a dispatch with driver and ETA, and the patient journey shows it. No voucher system.                    |    **PARTIAL**     |
|   **07**   | Patient misses scheduled clinic appointment         | System detects absence past scheduled time, alerts navigator, creates follow-up outreach task.           | No appointment scheduling or appointment entities exist.                                                                 |      **FAIL**      |
|   **08**   | Patient arrives but no outcome recorded             | Case remains in `ARRIVAL_CONFIRMED` under active observation until discharge documentation signed.       | System allows anyone to click "Record Outcome", closing case with static generic note.                                   |    **PARTIAL**     |
|   **09**   | Navigator forgets to complete follow-up             | Automated escalation pings coordinator queue after 24h/48h inactivity window.                            | No reminders, task queues, or inactivity escalation mechanisms exist.                                                    |      **FAIL**      |
|   **10**   | Referral completed but further care needed          | Closure generates linked Postpartum/Neonatal continuing care record with 6-week visit roadmap.           | Completing a referral creates a 42-day plan with touchpoints on days 3, 7, 14 and 42.                                    | **PASS (in code)** |
|   **11**   | Duplicate referral created for same patient         | System detects active referral for patient MRN, warns user, prevents duplicate submission.               | System allows duplicate referrals to be created with identical names and MRNs.                                           |      **FAIL**      |
|   **12**   | Two users modify same referral simultaneously       | Optimistic locking / conflict resolution prevents overwriting; audit trail records both actors.          | Last write to `localStorage` unconditionally overwrites earlier write. No concurrency control.                           |      **FAIL**      |
|   **13**   | Browser refreshed ($F5$) during workflow            | Form state recovered from draft cache; updated referrals preserved in memory.                            | Referrals survive in `localStorage`, but form draft and local audit rows are wiped.                                      |    **PARTIAL**     |
|   **14**   | Unauthorized role opens sensitive URL               | User redirected to login or presented with permission denied boundary.                                   | Any user can navigate to `/facility`, `/coordinator`, or `/referral/:id` without restriction.                            |      **FAIL**      |
|   **15**   | Required form field missing on submit               | Form displays inline validation errors on empty fields and halts submission.                             | Form uses HTML required attributes on some fields, but pre-populates default state.                                      |      **PASS**      |
|   **16**   | Network request fails                               | UI shows persistent offline banner, queues mutations in IndexedDB, retries on reconnection.              | Zero network requests exist; application operates purely in local browser memory.                                        |      **N/A**       |
