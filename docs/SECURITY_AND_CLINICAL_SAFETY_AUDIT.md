# Navexa Health — Security, Privacy & Clinical Safety Audit

**Document:** `docs/SECURITY_AND_CLINICAL_SAFETY_AUDIT.md`  
**Version:** 2.2.0  
**Updated:** November 04, 2026 (section 3 for the AI features, section 4 for the code review)  
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

All patient demographic data, clinical narratives, medical history, caregiver phone numbers, and vitals are stored in unencrypted browser `localStorage` under the key `navexa_domain_v6` (as of November 04, 2026) ([`src/context/ReferralContext.jsx:20-40`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/context/ReferralContext.jsx#L20-L40)).

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

> **Update, November 04, 2026:** these strings are no longer in `src/`. The table records the November 01 audit.

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

- **Vulnerability (November 01 audit; the page and button have since been removed):** In `BarrierResolution.jsx`, clicking "Confirm Intake" immediately marks the case resolved and adds an audit row claiming "Care received!".
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

- **Observed System Confusion (November 01 audit; the page has since been removed):** In `BarrierResolution.jsx:210-217`, the coordinator clicks "Emergency Acuity Retriage" which shows a toast claiming "Pediatrician / MFM On-Call Review Requested". However, the action is logged under the coordinator's name ("Anitha Joseph, RN").
- **Safety Requirement:** All clinical triage decisions, medication orders, and escalation authorizations must be explicitly attributed to a licensed physician or midwife, while administrative navigation (transport vouchers, language interpreters, childcare coordination) is attributed to the care navigator.

### 2.4 Clinical Rules Requiring Specialist Healthcare Validation

Before presenting this system to healthcare evaluators, the following clinical parameters and thresholds must be formally validated by a board-certified obstetrician/gynecologist and neonatologist:

1. **Gestational Age & Triage Routing:** When does premature rupture of membranes (PPROM) require Level III vs. Level II facility transfer? (Current threshold in demo: 36w 2d routed to Sanjeevani Level III).
2. **Neonatal Bilirubin Thresholds:** Total Serum Bilirubin (TSB) phototherapy vs. exchange transfusion curves based on American Academy of Pediatrics (AAP) hour-specific nomograms (Current demo: 21.4 mg/dL at 72 hours).
3. **Severe Maternal Hypertension Parameters:** Systolic BP $\ge 160$ mmHg or Diastolic BP $\ge 110$ mmHg requiring emergency IV labetalol/hydralazine within 30–60 minutes.
4. **Postpartum Surveillance Cadence:** Recommended touchpoints at Day 3 (lactation/jaundice), Day 7 (wound check/BP), Day 14, and Day 42 (comprehensive postpartum exam and contraception).

## 3. AI features: safety rules (added 2026-11-04)

Three AI features run on the server (`server/`), with the keys (ANTHROPIC_API_KEY and SARVAM_API_KEY) in server environment variables only. Every one is a draft or an alert for a person to act on. None makes a clinical decision. The tests use fake AI replies. Live calls have been made from a local `.env` only (a Hindi answer from Claude and Sarvam on 4 November 2026); the keys are not in Vercel.

| Feature                                                                  | What the AI does                                                                                                                                                                                                                                       | What it may not do                                                                                                                                                                                                                                                                     | Who checks                                                                                                                                                                                      |
| :----------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Family chat → staff alerts (`server/assistant.js`, `recordFamilyReport`) | A possible danger sign in the family's words raises a critical alert. A practical problem (cost, childcare, transport, language, weather, fear of the hospital) raises a barrier titled "(raised by family)", with the source "Family, via assistant". | Diagnose, judge whether a symptom is normal, or act on earlier turns of the chat (only the newest question can raise a report). One open barrier per category.                                                                                                                         | The care navigator calls the family to confirm.                                                                                                                                                 |
| Handoff summary (`server/staffAi.js`, `HandoffCard`)                     | Rearranges the referral record into Situation, Background, Referring clinician's assessment, Request, and lists what is missing.                                                                                                                       | Add a diagnosis, risk, treatment or advice. Receive the patient's name, phone, address or record number (`handoffRecord` strips them, and scrubs names and long numbers from notes).                                                                                                   | Shown as "Drafted by AI" until a named person at the receiving hospital confirms they checked it. Logged in the audit trail.                                                                    |
| Fill with AI on New referral (`server/staffAi.js`, `ReferralDraftCard`)  | Fills a draft of the referral form from any mix of a typed note, one or more recordings and a photo of a slip, sent together. Shows the source words for each field.                                                                                   | Overwrite what the clinician typed: it fills only empty or sample fields, and where it reads something different it offers "AI read: ... Use this / Keep mine". Set the priority (its output has no priority field). Choose the hospital (only a suggestion from the form's own list). | Each AI field is tagged (AI, Unclear, Edited, AI differs). The clinician chooses how soon and ticks "I've checked every field" before sending. Logged in the audit trail as `AI_DRAFT_CHECKED`. |

All three tell the model that the note, record or chat is data, not instructions. The handoff and Fill with AI cards are labelled "Demo: made-up patients only"; the family assistant screen is not labelled that way.

Server-side guards (`server/http.js`):

- Only the app's own pages can call the AI routes: a request must be `application/json` (which forces a CORS preflight), and a cross-site `Sec-Fetch-Site` or `Origin` is refused (403, or 415 for other content types).
- Each address gets a limit per 10 minutes for each route (ask 30, speak 60, handoff 20, draft 20), and each route has a ceiling across everyone (ask 200, speak 300, handoff 60, draft 60). A request that never reached an AI (bad input, too large, keys missing) is handed back and doesn't count.
- An answer is capped at 900 characters, cut at a sentence end (`capAnswer`), and Claude gets up to 3,000 tokens for it.

Gaps before any real use:

- The server has no login. The limits are kept in memory, so they hold for the dev server and for one warm Vercel instance only. A deployed app needs a shared limit (Vercel Firewall or a KV store), limits per signed-in user, and a spend cap in each provider's console.
- Families on one mobile network can share an address, and so share a limit. When a typed question that sounds urgent gets no answer for any reason, the chat still shows "This sounds urgent. Call 108 now."
- The demo limit of 20 AI uses per browser is kept in the browser. A failed request that never reached the AI gives its use back.
- Server tests use fake providers (`server/*.test.js`). Live replies have only been checked by hand.

---

## 4. Code review, 4 November 2026

A review of the `feat/voice-help` branch (the family assistant, the staff AI tools and the dependency upgrades) found 22 problems. All 22 were checked against the code and fixed on 4 November 2026. The tests went from 271 to 284. The TanStack Table 9, React 19 and React Router 7 upgrades were checked and had no problems.

### Clinical safety and the AI rules

| # | Where | Problem | Fix |
| :- | :---- | :------ | :-- |
| 1 | New referral, Fill with AI (`CreateReferral.jsx`) | The hospital chosen with "Refer for …" wasn't marked as the clinician's, so an AI fill could switch it to a hospital named in the note. The AI was choosing the hospital. | Every fill treats the hospital as the clinician's. A different hospital the AI read is only offered as "AI read: … Use this / Keep mine". Test in `referralEntry.test.js`. |
| 2 | New referral, vitals | Vitals the AI read that aren't shown for the patient type (a mother's pulse and temperature, a baby's bilirubin and weight in a mother-and-baby referral) counted as filled and checked, but were never shown and were dropped on save. | Any vital with a value, or one the AI filled, is shown under the patient type's own vitals and saved. This also covers vitals typed before the patient type changed. |
| 3 | Handoff summary (`HandoffCard.jsx`, `confirmHandoff`) | Any hospital user, including the sending hospital, could mark the summary checked. A checked summary then hid "Draft again" and stayed on the case after it moved to another hospital. | Only the receiving hospital sees "Mark checked", and `confirmHandoff` refuses any other hospital. The summary records which hospital it was written for. It is dropped when the hospital declines, when the case is redirected or the patient chooses another hospital, and when the patient arrives somewhere else. Tests in `workflow.test.js`. |
| 4 | Handoff summary, privacy (`scrubIdentifiers` in `workflow.js`) | Names were removed only as the whole name and in the same case. A first name alone ("Ananya") or a caregiver written as "Shalini Naidu (Mother)" was sent to the AI. Dates in notes became "[number]". | Removes the whole name and each part of it, in any case and as whole words only, for the patient, the caregiver and the emergency contact. Words like "Baby" and "Mother" are kept. Phone numbers are removed; dates and times are kept. Test in `workflow.test.js`. |
| 5 | Family assistant, long answers (`capAnswer` in `server/assistant.js`) | The 900-character cap cut mid-word, so the last sentence could be lost, and the cut text was read aloud and saved. | Cuts after the last whole sentence (`.`, `!`, `?`, `।`, `॥`, `۔`), or at a space with "…" if no sentence ends in reach. The rules put "call 108" first, so it is kept. Tests in `server/assistant.test.js`. |
| 6 | Family assistant, Indian scripts (`server/providers.js`) | Claude had 1,500 tokens for an answer. A long Malayalam or Tamil answer plus its report could run out, leaving unreadable JSON and using up one of the family's questions with no answer. | Raised to 3,000 tokens. The 900-character cap still bounds the voice cost. |
| 7 | Family assistant, limits (`server/http.js`) | One ceiling of 300 requests per 10 minutes was shared by all four AI routes, so reading answers aloud could use up the budget for questions, including one about bleeding. | Each route has its own ceiling. A failed typed question that sounds urgent shows "Call 108 now" whatever the reason it failed. Tests in `server/http.test.js`. |
| 8 | New referral, made-up sample values | The sample patient's language (Urdu) and "Needs interpreter" stayed after an AI fill for a different patient, with no tag. | Language is cleared like the other sample fields. "Needs interpreter" can't be cleared, so it is tagged "Unclear" until the clinician sets it. |
| 9 | New referral, unit | A fill with no unit cleared it to empty, but the Unit list showed its first option, so the screen and the saved value differed. | A cleared list shows "Choose a unit" (or "Choose a language"), and the referral can't be sent until one is chosen. |
| 10 | New referral, refilling | On a second fill, earlier AI values the new sources didn't have kept a plain "AI" tag, an old quote stayed attached, and values read from a removed photo stayed. | Such values are tagged "Unclear" with "From an earlier fill. No source has it now, so check it or clear it." Quotes are replaced for every field the fill wrote, and a removed photo's quote is no longer shown. Test in `referralEntry.test.js`. |
| 11 | New referral, switching patient type | Switching type replaced any field that equalled the old type's sample, even one the clinician picked from the list (for example "3 days old" becoming "29 yrs"). | Only a field nobody typed in, picked or had filled by the AI is swapped. |
| 12 | New referral, blood pressure on iPhone | The field used a digits-only keypad, so "128/82" couldn't be typed. | The keypad has a dot, and "128.82" becomes "128/82". Test in `referralEntry.test.js`. |

### Workflow and screens

| # | Where | Problem | Fix |
| :- | :---- | :------ | :-- |
| 13 | Intake (`FacilityDashboard.jsx`) | The case ID lookup at reception had been removed, so a patient who walked in at a hospital they weren't sent to, or a patient who hadn't chosen a hospital yet, couldn't have their arrival confirmed. | "Patient at reception who isn't on these lists? Enter their case ID" is back, using `findCaseAtReception`. It refuses an unknown ID, a patient who has already arrived and a referral not sent yet. Test in `workflow.test.js`. |
| 14 | Intake header | The header showed the hospital's listed free beds, not the beds left after patients on the way, so accepting a patient didn't change it. | Shows "N of M beds free after patients on the way", the same count as the Hospitals board. |
| 15 | Hospitals board, reply time (`network.js`) | The time to accept was taken from the last acceptance by any hospital. After hospital A accepted and later declined, hospital B was credited with A's reply. | Only an acceptance after the last send counts, and not one made before the patient arrived elsewhere. Test in `network.test.js`. |
| 16 | Patients, Blocked count (`BarrierTables.jsx`) | Completed cases with a barrier never closed were counted as blocked, so the count disagreed with the Coordinator page. | A completed case is not counted as blocked. |
| 17 | Guided demo (`demoStory.js`) | The "Hospital confirms arrival" step didn't open the right hospital, so the story's newborn could be missing from the screen. | The step opens Sanjeevani Regional Perinatal Centre, where the newborn is heading. Test in `demoStory.test.js`. |
| 18 | Patient, My ride (`PatientDashboard.jsx`) | The current ride stage showed "Done" and a tick, never "Now". | The current stage shows "Now" until the patient has arrived. |
| 19 | Referral page on phones (`ReferralDetails.jsx`) | The follow-up line was cut short, hiding the "see schedule" link and the navigator's phone number. | The line wraps. |
| 20 | Family assistant (`ChatPanel.jsx`) | "Question cancelled. It didn't count." stayed on screen when the next question was asked by voice. | Tapping the microphone clears it. |
| 21 | AI limits (`server/http.js`) | Requests that never reached an AI (empty, too large, bad JSON) still used up the address's limit. | They are handed back (`releaseRequest`). The count is still taken up front, so a burst can't slip past the limit. Test in `server/http.test.js`. |
| 22 | CI package-age check (`scripts/check-release-age.mjs`) | One brief error from the npm registry failed the check and blocked the deploy. | Each package is tried up to four times with a growing pause and a 30-second timeout. A missing package still fails at once. |

### Also found

- **The dev site showed a blank page after the review** ("doesn't provide an export named: 'rowSortingFeature'"). The reviewer had briefly installed the old packages, and Vite cached the old TanStack Table in that window. Deleting `node_modules/.vite` and restarting `npm run dev` fixed it. No source change was needed.

