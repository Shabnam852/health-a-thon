# Navexa Health — Comprehensive Verification & Testing Report

**Document:** `docs/TESTING_REPORT.md`  
**Version:** 3.1.0  
**Updated:** November 04, 2026  
**Auditor/Architect:** QA and Test Automation Engineer, Application Security Engineer

---

## 1. Testing Summary

Automated tests run with Node's built-in test runner (`npm test`). They cover the pure domain, workflow, navigation, storage and server AI code. They do not render React, so page behaviour and the wiring in `ReferralContext.jsx` are checked by hand in the browser.

Last run on November 04, 2026: 211 tests in 44 suites, all passing.

| Test file                             | Tests   |
| :------------------------------------ | :------ |
| `server/assistant.test.js`            | 26      |
| `server/staffAi.test.js`              | 15      |
| `src/config/demoStory.test.js`        | 4       |
| `src/config/navigationConfig.test.js` | 14      |
| `src/config/theme.test.js`            | 3       |
| `src/data/seedData.test.js`           | 2       |
| `src/domain/alarms.test.js`           | 10      |
| `src/domain/assistant.test.js`        | 14      |
| `src/domain/contact.test.js`          | 3       |
| `src/domain/domain.test.js`           | 21      |
| `src/domain/hospitalChoice.test.js`   | 11      |
| `src/domain/hospitalMap.test.js`      | 5       |
| `src/domain/landing.test.js`          | 14      |
| `src/domain/network.test.js`          | 9       |
| `src/domain/referralEntry.test.js`    | 6       |
| `src/domain/workflow.test.js`         | 43      |
| `src/services/storageAdapter.test.js` | 11      |
| **Total**                             | **211** |

`npm run lint` and `npm run build` are covered in sections 4 and 5.

## 2. What the Tests Enforce

- **Workflow actions (`src/domain/workflow.js`):** every action behind `ReferralContext` is called directly, for both accepted and refused cases.
- **Transition rules (`src/domain/transitions.js`):** every pair of statuses is checked for referrals, transport, barriers and follow-up tasks, so adding or removing a rule fails a test.
- **Route access (`src/config/navigationConfig.js`):** each role is checked against every workspace. Access control runs in the browser only and is not a security boundary.
- **Storage (`src/services/storageAdapter.js`):** corrupt or outdated saved data falls back to the seed, and an unknown role falls back to the default.

**Rules enforced:**
1. **Intake:** a referral must pass through `ACKNOWLEDGED` and `ARRIVAL_CONFIRMED` before it can complete.
2. **Clinical safety:** `ARRIVAL_CONFIRMED` cannot go straight to `COMPLETED`. Recording an outcome adds `CLINICAL_ASSESSMENT_RECORDED` to the timeline, then completes the referral in the same action.
3. **Transport:** status follows `REQUESTED` → `ASSIGNED` → `DISPATCHED` → `PICKED_UP` → `ARRIVED`. Dispatching performs the first three steps as one action, and is refused once a vehicle is moving or has arrived. Confirming physical arrival closes a `DISPATCHED` or `PICKED_UP` transit.
4. **Data isolation:** maternal outcome fields are blanked on neonatal outcomes and neonatal fields on maternal outcomes. A `Dyad` outcome keeps both.
5. **Repeats:** repeating the current status is refused, so a double action cannot add duplicate timeline or audit entries.
6. **Declined referrals:** a declined referral floats with no hospital until the family chooses one. A hospital that declined cannot be chosen again.
7. **Arrival:** physical arrival is allowed from `SENT`, `ACKNOWLEDGED` or `REJECTED`. It still cannot go straight to `COMPLETED`.
8. **Family reports:** a danger sign or a barrier from the family's assistant is raised from the newest question only, and only one open barrier is raised per category.
9. **Handoff:** the record sent to the AI has no names, phone numbers or caregiver details. A confirmed handoff cannot be confirmed again.

**AI features.** The server tests (`server/assistant.test.js`, `server/staffAi.test.js`) use fake AI and speech providers. They check input limits, the 503 reply when a key is missing, whether a use is refunded, that the AI sets no priority, and the quote checks. No live AI reply has been tested. ANTHROPIC_API_KEY and SARVAM_API_KEY are not set up yet.

---

## 3. Seeded Cases for Manual Walkthroughs

`src/data/seedData.js` holds 7 synthetic referrals, all going to Sanjeevani Regional Perinatal Centre. Walk through them by hand in the running app. These walkthroughs are not automated.

| Referral ID     | Patient                        | Condition                                                    | Status              | What to walk through                                                                |
| :-------------- | :----------------------------- | :----------------------------------------------------------- | :------------------ | :---------------------------------------------------------------------------------- |
| `REF-2024-8821` | Ananya Reddy (28 yrs)          | Gestational pre-eclampsia (BP 152/98), late-onset IUGR       | `ARRIVAL_CONFIRMED` | Resolved transport barrier, then recording the outcome                              |
| `NX-9042`       | Baby of Shalini Naidu (3 days) | Acute neonatal hyperbilirubinemia (TSB 21.4 mg/dL)           | `ACKNOWLEDGED`      | Open transport barrier, MediVan dispatch, neonatal outcome fields                   |
| `MRN-773829`    | Fathima Begum (29 yrs)         | Late preterm PPROM                                           | `ACKNOWLEDGED`      | Urdu-speaking patient, arrival confirmation                                         |
| `NX-9038`       | Anjali Gowda (31 yrs)          | Severe postpartum pre-eclampsia (BP 168/104), visual scotoma | `ACKNOWLEDGED`      | Open dependent-care barrier on the navigator desk                                   |
| `NX-9051`       | Sunita Yadav (24 yrs)          | Decreased fetal movement                                     | `SENT`              | Open weather barrier, facility accept or redirect                                   |
| `NX-9019`       | Baby of Selvi Murugan (7 days) | Failure to thrive, 12.8% birth weight loss                   | `REJECTED`          | Declined by the hospital, so the family chooses another. Resolved financial barrier |
| `NAV-2026-003`  | Meera Devi (31 yrs)            | Delivered, healthy infant                                    | `COMPLETED`         | Follow-up tasks on the 42-day continuity desk                                       |

---

## 4. Static Code Quality & Lint Verification

Command: `npm run lint` (oxlint with `--deny-warnings`, then Biome with `--error-on-warnings`).

Result on November 04, 2026: oxlint and Biome both pass, with no warnings.

## 5. Production Build Verification

Command: `npm run build`
Engine: Vite v5 with Tailwind CSS v3 through PostCSS.

The build passes on November 04, 2026 (`npm run build`).

## 6. Known Scope Boundaries & Security Posture

1. **Synthetic Data Clarification:** The application operates strictly on synthetic, anonymized clinical data for hackathon demonstration. All mock EHR connections, simulated transit trackers, and FHIR identifiers are prominently marked as simulated in accordance with clinical safety principles.
2. **Browser Storage Boundary:** State is retained in browser `localStorage` (`navexa_domain_v6`). For multi-device cloud synchronizations, a production deployment would connect to a FHIR API backend that meets India's DPDP Act 2023 and ABDM requirements.
3. **No Clinical Advice Disclaimer:** A prominent header badge reminds evaluators that Navexa Health coordinates administrative logistics and continuity of care, but does not provide diagnostic decisions without a licensed physician.
