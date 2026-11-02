# Navexa Health — Comprehensive Verification & Testing Report

**Document:** `docs/TESTING_REPORT.md`  
**Version:** 3.0.0  
**Auditor/Architect:** QA and Test Automation Engineer, Application Security Engineer

---

## 1. Testing Summary

Automated tests run with Node's built-in test runner (`npm test`). They cover the pure domain, workflow, navigation and storage code. They do not render React, so page behaviour and the wiring in `ReferralContext.jsx` are checked by hand in the browser.

| Test file                             | Tests  |
| :------------------------------------ | :----- |
| `src/config/navigationConfig.test.js` | 13     |
| `src/domain/domain.test.js`           | 19     |
| `src/domain/workflow.test.js`         | 31     |
| `src/services/storageAdapter.test.js` | 9      |
| **Total**                             | **72** |

`npm run lint` and `npm run build` also pass. Lint covers `.js` and `.jsx`, with `no-undef` and `no-unused-vars` turned off.

---

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

---

## 3. Seeded Cases for Manual Walkthroughs

`src/data/seedData.js` holds 7 synthetic referrals, all going to Sanjeevani Regional Perinatal Centre. Walk through them by hand in the running app. These walkthroughs are not automated.

| Referral ID     | Patient                        | Condition                                                    | Status              | What to walk through                                              |
| :-------------- | :----------------------------- | :----------------------------------------------------------- | :------------------ | :---------------------------------------------------------------- |
| `REF-2024-8821` | Ananya Reddy (28 yrs)          | Gestational pre-eclampsia (BP 152/98), late-onset IUGR       | `ARRIVAL_CONFIRMED` | Resolved transport barrier, then recording the outcome            |
| `NX-9042`       | Baby of Shalini Naidu (3 days) | Acute neonatal hyperbilirubinemia (TSB 21.4 mg/dL)           | `ACKNOWLEDGED`      | Open transport barrier, MediVan dispatch, neonatal outcome fields |
| `MRN-773829`    | Fathima Begum (29 yrs)         | Late preterm PPROM                                           | `ACKNOWLEDGED`      | Urdu-speaking patient, arrival confirmation                       |
| `NX-9038`       | Anjali Gowda (31 yrs)          | Severe postpartum pre-eclampsia (BP 168/104), visual scotoma | `ACKNOWLEDGED`      | Open dependent-care barrier on the navigator desk                 |
| `NX-9051`       | Sunita Yadav (24 yrs)          | Decreased fetal movement                                     | `SENT`              | Open weather barrier, facility accept or redirect                 |
| `NX-9019`       | Baby of Selvi Murugan (7 days) | Failure to thrive, 12.8% birth weight loss                   | `SENT`              | Resolved financial barrier, facility accept                       |
| `NAV-2026-003`  | Meera Devi (31 yrs)            | Delivered, healthy infant                                    | `COMPLETED`         | Follow-up tasks on the 42-day continuity desk                     |

---

## 4. Static Code Quality & Lint Verification

Command: `npm run lint`  
Engine: ESLint v10.14.0 with `@eslint/js` recommended config and React/JSX support.

```bash
$ npm run lint
> health-a-thon@0.0.0 lint
> eslint src
# Exit code: 0 (No syntax, semantic, or React hook violations detected)
```

---

## 5. Production Build Verification

Command: `npm run build`
Engine: Vite v5 with Tailwind CSS v3 through PostCSS. The build passes.

---

## 6. Known Scope Boundaries & Security Posture

1. **Synthetic Data Clarification:** The application operates strictly on synthetic, anonymized clinical data for hackathon demonstration. All mock EHR connections, simulated transit trackers, and FHIR identifiers are prominently marked as simulated in accordance with clinical safety principles.
2. **Browser Storage Boundary:** State is retained in browser `localStorage` (`navexa_domain_v4`). For multi-device cloud synchronizations, a production deployment would connect to a FHIR API backend that meets India's DPDP Act 2023 and ABDM requirements.
3. **No Clinical Advice Disclaimer:** A prominent header badge reminds evaluators that Navexa Health coordinates administrative logistics and continuity of care, but does not provide diagnostic decisions without a licensed physician.
