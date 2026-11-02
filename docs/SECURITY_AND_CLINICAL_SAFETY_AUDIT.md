# Navexa Health — Security, Privacy & Clinical Safety Audit

**Document:** `docs/SECURITY_AND_CLINICAL_SAFETY_AUDIT.md`  
**Version:** 2.0.0  
**Audit Date:** November 01, 2026  
**Auditor:** Application Security Engineer & Healthcare Technology / Clinical Safety Architect

---

## 1. Security & Privacy Audit

### 1.1 Authentication & Authorization Realities

The application implements **simulated authentication** via a persona selector at `/` ([`src/pages/RoleSelection.jsx:39-42`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/RoleSelection.jsx#L39-L42)). Selecting a persona simply stores a plain string in browser local storage (`localStorage.setItem('navexa_role', newRole)`).

```
                      [ PUBLIC BROWSER ]
                              │
               No Password / No Token / No MFA
                              ▼
                localStorage.navexa_role
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   /coordinator           /facility             /patient
  (Full PHI Access)   (Full Intake Control)  (Full Journey View)
```

#### Critical Findings:

1. **Zero Access Boundaries:** Any user who types `/coordinator`, `/facility`, or `/referral/REF-2024-8821` into the browser address bar obtains unrestricted read and write access to all patient medical records, clinical notes, and caregiver contact information.
2. **Missing Token / Session Lifecycle:** There are no JSON Web Tokens (JWT), session cookies, OAuth2/OIDC integration, or idle session timeouts. A public terminal left open in a hospital or clinic would expose all patient records indefinitely.
3. **Insecure Direct Object References (IDOR):** The `/referral/:id` route ([`src/pages/ReferralDetails.jsx:6-10`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx#L6-L10)) accepts any arbitrary ID parameter from the URL and renders the matching record directly from the global array with zero ownership verification.

### 1.2 Sensitive Data Storage & Local Storage Exposure

All patient demographic data, clinical narratives, medical history, caregiver phone numbers, and vitals are stored in unencrypted browser `localStorage` under the key `navexa_referrals_v2` ([`src/context/ReferralContext.jsx:20-40`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/context/ReferralContext.jsx#L20-L40)).

```javascript
// Data stored in plaintext in the browser's persistent storage:
{
  id: "REF-2024-8821",
  patientName: "Ananya Reddy",
  patientId: "MRN-882104",
  condition: "Gestational Pre-eclampsia (BP 152/98) • Late-onset IUGR",
  reason: "Ananya presented for routine 34w checkup with progressive headache...",
  caregiverContact: "+91 90000 21049",
  vitals: { bp: "152/98", urine: "+2 Protein" }
}
```

#### Vulnerability Assessment:

- **XSS Accessibility:** `localStorage` is completely accessible to any JavaScript running in the document origin via `window.localStorage`. If any third-party script or CDN is compromised, all patient PHI can be exfiltrated in a single read.
- **Shared Device Leakage:** In community health centers and shared clinical workstations, browser local storage persists across different staff logins unless explicitly cleared. Patient records from a previous shift remain visible to unauthorized staff or visitors.

### 1.3 Misleading UI Security & Compliance Claims

The application contains multiple hardcoded visual badges and copy asserting enterprise compliance and cryptographic security that **do not exist in the codebase**:

| UI Location                 | Displayed Claim                                 | Code Citation                                                                                                              | Actual Reality in Repository                                                                                                                           |
| :-------------------------- | :---------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RoleSelection.jsx` Footer  | `"HIPAA Audit Compliant Demo"`                  | [`src/pages/RoleSelection.jsx:190`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/RoleSelection.jsx#L190)     | **FALSE CLAIM:** Zero HIPAA administrative, physical, or technical safeguards are implemented. No access logs, encryption, or user verification exist. |
| `CreateReferral.jsx` Header | `"HIPAA Audit Active • Session ID #NX-8821"`    | [`src/pages/CreateReferral.jsx:138`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CreateReferral.jsx#L138)   | **FALSE CLAIM:** Static HTML string. No active session or audit daemon exists.                                                                         |
| `CreateReferral.jsx` Hero   | `"EHR Interop: Epic CareLink Connected"`        | [`src/pages/CreateReferral.jsx:296`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/CreateReferral.jsx#L296)   | **FALSE CLAIM:** Static text string. Zero EHR integration, HL7, or FHIR endpoints exist.                                                               |
| `ReferralDetails.jsx` Modal | `"Immutable SHA-256 Intake Handshake recorded"` | [`src/pages/ReferralDetails.jsx:325`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx#L325) | **FALSE CLAIM:** Static string displayed in a dummy modal. No cryptographic hashing or blockchain/ledger exists.                                       |
| `ReferralDetails.jsx` Chat  | `"Encrypted Secure Chat: Channel open..."`      | [`src/pages/ReferralDetails.jsx:184`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx#L184) | **FALSE CLAIM:** Triggers a browser `window.alert()`. No encrypted chat engine exists.                                                                 |

> [!CAUTION]
> Making unfounded regulatory compliance claims (e.g., "HIPAA Audit Compliant") before healthcare evaluators and technical judges creates severe medicolegal credibility risks and can trigger immediate disqualification. All such banners must be clearly labeled as **"Simulated Demonstration Interface"**.

### 1.4 Demonstration vs. Production Standards

| Security Requirement                   | Acceptable for Controlled Hackathon Demo (Fictional Data) |          Mandatory for Real Patient Information (Production)          |
| :------------------------------------- | :-------------------------------------------------------: | :-------------------------------------------------------------------: |
| Fictional Synthetic Patient Records    |                            YES                            |                         NO (Must be real PHI)                         |
| Single-Browser Role Switching          |                            YES                            |           NO (Multi-factor authenticated individual logins)           |
| In-Memory / LocalStorage Persistence   |                            YES                            |              NO (Encrypted relational database with BAA)              |
| Simulated SMS / Push Notifications     |                            YES                            | NO (DPDP Act-compliant, DLT-registered telephony gateway with opt-in) |
| In-Transit TLS 1.3 Encryption          |                        Recommended                        |                               MANDATORY                               |
| Immutable Audit Trail (21 CFR Part 11) |                    NO (Simulated okay)                    |                               MANDATORY                               |
| Business Associate Agreement (BAA)     |                            NO                             |                               MANDATORY                               |

---

## 2. Maternal & Neonatal Clinical Safety Audit

### 2.1 Unsafe Workflow Assumptions

#### Assumption 1: A referral dispatch guarantees clinical intake.

- **Vulnerability:** In traditional paper and early digital systems, once a referral is sent, the referring clinic considers its duty completed. Navexa correctly identifies this problem in its banner ("A referral sent is not care received").
- **Residual Defect:** While the platform displays this principle, its state machine allows a referral in `SENT` status to sit indefinitely without escalation timers or automated alerts. An urgent case (such as pre-eclampsia) can remain unacknowledged for hours without notifying a supervisor.

#### Assumption 2: Administrative barrier resolution equals medical care.

- **Vulnerability:** In `BarrierResolution.jsx`, clicking "Confirm Intake" immediately marks the case resolved and adds an audit row claiming "Care received!".
- **Clinical Reality:** Resolving a transport barrier (e.g., getting a patient to the hospital door) is an administrative coordination milestone. It must **never** be conflated with clinical care delivery. A patient may arrive at triage and wait 4 hours in the waiting room before seeing an obstetrician. Navexa's UI risks falsely reporting "Care received" when only physical arrival has occurred.

#### Assumption 3: Referral closure terminates the patient journey.

- **Vulnerability:** When a receiving facility marks a referral `COMPLETED` ([`src/pages/FacilityDashboard.jsx:81-88`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L81-L88)), the case is moved to the "Completed" tab and locked.
- **Clinical Reality:** In maternal and neonatal healthcare, the immediate postpartum period (first 42 days) and the first 28 days of life carry the highest mortality risk (e.g., postpartum hemorrhage, eclampsia, neonatal sepsis). Closing the case at hospital discharge without establishing a continuing care schedule abandons the mother and infant at their most vulnerable moment.

### 2.2 Emergency vs. Routine Referrals: Missing Escalation Paths

In obstetric emergencies (e.g., eclamptic seizures, cord prolapse, severe antepartum hemorrhage) and neonatal emergencies (e.g., severe asphyxia, acute hyperbilirubinemia with kernicterus risk), delays of even 30 minutes can cause permanent neurological disability or death.

| Clinical Case                                        |  Urgency Level  | Existing System Pathway                                                                  | Required Emergency Protocol                                                                                                                                           |
| :--------------------------------------------------- | :-------------: | :--------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fathima Begum** (PPROM at 36w)                     |     URGENT      | Submits to `SENT` queue. Sits until receiving hospital manually acknowledges.            | Immediate push notification to L&D triage charge nurse; automatic bed hold reservation; direct ambulance dispatch if contractions present.                            |
| **Baby of Shalini Naidu** (TSB 21.4 mg/dL at 3 days) | STAT / CRITICAL | Flagged as overdue in hardcoded table. Button dispatches transit with broken parameters. | Immediate stat page to accepting neonatologist; direct dispatch of neonatal transport team with incubator and phototherapy blanket; exchange transfusion preparation. |
| **Ananya Reddy** (Pre-eclampsia BP 152/98)           |     URGENT      | Standard linear queue. Lifeline displays static arrival time.                            | Blood pressure escalation protocol (repeat vitals q 15 min); oral antihypertensive administration before transit; seizure precaution staging.                         |

### 2.3 Distinction Between Administrative Coordination & Clinical Care

A fundamental clinical safety principle is that **care navigators and coordinators must not diagnose patients or modify clinical care plans**.

- **Observed System Confusion:** In `BarrierResolution.jsx:210-217`, the coordinator clicks "Emergency Acuity Retriage" which shows a toast claiming "Pediatrician / MFM On-Call Review Requested". However, the action is logged under the coordinator's name ("Anitha Joseph, RN").
- **Safety Requirement:** All clinical triage decisions, medication orders, and escalation authorizations must be explicitly attributed to a licensed physician or midwife, while administrative navigation (transport vouchers, language interpreters, childcare coordination) is attributed to the care navigator.

### 2.4 Clinical Rules Requiring Specialist Healthcare Validation

Before presenting this system to healthcare evaluators, the following clinical parameters and thresholds must be formally validated by a board-certified obstetrician/gynecologist and neonatologist:

1. **Gestational Age & Triage Routing:** When does premature rupture of membranes (PPROM) require Level III vs. Level II facility transfer? (Current threshold in demo: 36w 2d routed to Sanjeevani Level III).
2. **Neonatal Bilirubin Thresholds:** Total Serum Bilirubin (TSB) phototherapy vs. exchange transfusion curves based on American Academy of Pediatrics (AAP) hour-specific nomograms (Current demo: 21.4 mg/dL at 72 hours).
3. **Severe Maternal Hypertension Parameters:** Systolic BP $\ge 160$ mmHg or Diastolic BP $\ge 110$ mmHg requiring emergency IV labetalol/hydralazine within 30–60 minutes.
4. **Postpartum Surveillance Cadence:** Recommended touchpoints at Day 3 (lactation/jaundice), Day 7 (wound check/BP), Day 14, and Day 42 (comprehensive postpartum exam and contraception).
