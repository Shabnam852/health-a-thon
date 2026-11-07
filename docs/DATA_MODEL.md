# Navexa Health — Domain Data Model Specification

**Document:** `docs/DATA_MODEL.md`  
**Version:** 3.0.0  
**Status:** IMPLEMENTED & VERIFIED  
**Auditor/Architect:** Backend & Database Architect, Healthcare Technology Architect

---

## 1. Domain Model Architecture & Principles

The Navexa Health domain data model provides a unified, normalized, and strictly validated schema for maternal and neonatal care navigation.

### Core Architectural Principles

1. **Single Source of Truth:** All entities originate from and synchronize back to the master store in `ReferralContext`, persisted via `storageAdapter.js` under the versioned key `navexa_domain_v6`.
2. **Clinical Separation of Concerns:** Neonatal entities never inherit obstetric fields (e.g. fundal height, cervical dilation, maternal systolic BP). Newborn vitals exclusively track neonatal metrics (birth weight in grams, total serum bilirubin, APGAR, neonatal temperature).
3. **Operational vs. Clinical Boundary:** Operational coordination models (transits, contact logs, barrier resolutions) are decoupled from formal clinical records (`ArrivalRecord`, `ClinicalOutcome`).
4. **Lifecycle Continuity:** The conclusion of an acute hospital referral does not destroy or archive continuing postpartum surveillance. A linked `FollowUpPlan` persists independently.
5. **Auditing by Default:** Every domain mutation generates an immutable `AuditEvent` appended to the referral's tamper-evident event ledger.

---

## 2. Entity-Relationship Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                               FACILITY                                 │
│  - id (PK)                                                             │
│  - name, type, capacity, currentLoad, availableBeds, directPhone       │
└───────────────────┬────────────────────────────────────────────────────┘
                    │ 1:N (Receiving / Referring)
                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                               REFERRAL                                 │
│  - id (PK: e.g. REF-2024-8821)                                         │
│  - mrn (Medical Record Number)                                         │
│  - patientName, referralType, age, gestationalAge                      │
│  - reason, priority, fromClinician, toFacility                         │
│  - status (ReferralStatus enum)                                        │
│  - vitals (MaternalVitals | NeonatalVitals)                            │
│  - createdAt, updatedAt                                                │
└──────┬────────────┬──────────────┬──────────────┬──────────────┬───────┘
       │ 1:N        │ 1:1          │ 1:1          │ 1:1          │ 1:N
       ▼            ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   BARRIER    │ │  TRANSPORT   │ │   ARRIVAL    │ │   CLINICAL   │ │    AUDIT     │
│              │ │   REQUEST    │ │    RECORD    │ │   OUTCOME    │ │    EVENT     │
│ - id (PK)    │ │ - id (PK)    │ │ - id (PK)    │ │ - id (PK)    │ │ - id (PK)    │
│ - category   │ │ - vehicleId  │ │ - arrivedAt  │ │ - clinician  │ │ - actor      │
│ - status     │ │ - driver     │ │ - room       │ │ - maternal/  │ │ - action     │
│ - notes      │ │ - status     │ │ - verifiedBy │ │   neonatal   │ │ - timestamp  │
└──────────────┘ └──────────────┘ └──────────────┘ └──────┬───────┘ └──────────────┘
                                                          │ 1:1
                                                          ▼ (Triggers on Completion)
                                           ┌──────────────────────────────┐
                                           │       FOLLOW-UP PLAN         │
                                           │  - id (PK)                   │
                                           │  - patientName, patientType  │
                                           │  - activatedAt, status       │
                                           └──────────────┬───────────────┘
                                                          │ 1:N
                                                          ▼
                                           ┌──────────────────────────────┐
                                           │       FOLLOW-UP TASK         │
                                           │  - id (PK)                   │
                                           │  - targetDay (3, 7, 14, 42)  │
                                           │  - title, category           │
                                           │  - status, findings          │
                                           └──────────────────────────────┘
```

---

## 3. Enumerated Types (`src/domain/enums.js`)

### 3.1 `ReferralStatus`

Controls the referral's lifecycle gate:
- `CREATED`: Referral drafted; not yet sent.
- `SENT`: Referral sent to the receiving hospital.
- `ACKNOWLEDGED`: Receiving hospital accepted the referral and held a bed.
- `REJECTED`: Receiving hospital declined. The referral floats until the patient chooses another hospital.
- `REDIRECTED`: Case moved to another hospital.
- `ARRIVAL_CONFIRMED`: A hospital confirmed the patient arrived. This does not mean care is complete.
- `CLINICAL_ASSESSMENT_RECORDED`: The attending clinician recorded the assessment and outcome.
- `COMPLETED`: Referral episode closed. The 42-day follow-up plan continues.

"Floating" is not a stored status. The app shows a referral as floating when it was declined and the patient has not yet chosen a hospital.

### 3.2 `TransportStatus`

- `NOT_REQUIRED`: No ride needed.
- `REQUESTED`: Ride asked for; no van yet.
- `ASSIGNED`: Van and driver allocated.
- `DISPATCHED`: Van on its way to the patient.
- `PICKED_UP`: Patient aboard; on the way to the hospital.
- `ARRIVED`: Drop-off confirmed at the hospital.
- `CANCELLED`: Ride cancelled.
- `FAILED`: Ride went wrong. The transport barrier reopens and the ride can be sent again.

### 3.3 `BarrierStatus` & `BarrierCategory`

Social and logistical blockers. Each category has a plain label on screen.
- **Status:** `IDENTIFIED` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED`, or `UNRESOLVED`.
- **Category** (screen label in brackets): `TRANSPORT` (Transport), `FINANCIAL` (Cost), `DEPENDENT_CARE` (Childcare), `LINGUISTIC` (Language), `WEATHER` (Weather or road), `CLINICAL_HESITATION` (Fear of the hospital).
- A barrier raised by the family assistant has the title "(raised by family)". Only one open barrier per category is kept.

### 3.4 `UrgencyLevel` (stored as `priority`)

- `STAT`: Most urgent.
- `URGENT`: High acuity.
- `PRIORITY`: Needs a prompt response.
- `ROUTINE`: Scheduled or non-acute.

The app sorts the list by this order. `URGENT` and `STAT` count as high acuity. AI never sets it.

### 3.5 `PatientType` (stored as `referralType`)

- `MATERNAL` (value `Maternal`, shown as "Mother"): pregnant, laboring or postpartum woman.
- `CHILD` (value `Child`, shown as "Newborn"): newborn.
- `DYAD` (value `Dyad`, shown as "Mother & baby"): mother and baby referred together.

### 3.6 `Role`

The app's personas. These are the values used for the role switch and the home screens.
- `COORDINATOR` (`coordinator`): Care Coordinator.
- `FACILITY` (`facility`): Hospital.
- `PATIENT` (`patient`): Patient and family.

`AuditRole` is wider. It names who acted on a case: `system`, `referring_clinician`, `receiving_facility`, `attending_clinician`, `coordinator`, `navigator`, `transport_driver`, `patient`.

### 3.7 Timeline events

`TimelineEvent` marks events that are not status changes: `BARRIER_FLAGGED`, `BARRIER_RESOLVED`, `BARRIER_UPDATED`, `TRANSIT_REQUESTED`, `TRANSIT_DISPATCHED`, `TRANSIT_PICKED_UP`, `TRANSIT_FAILED`, `DANGER_SIGN_REPORTED` and `HANDOFF_CONFIRMED`.

---

## 4. Entity Specifications & Schemas

The factories are in `src/domain/models.js`. Fields with a default are optional when you create an entity.

### 4.1 Referral Entity (`createReferral`)

| Property                                                              | Type                                        | Description                                                      |
| :-------------------------------------------------------------------- | :------------------------------------------ | :--------------------------------------------------------------- |
| `id`                                                                  | `string`                                    | Unique referral ID (e.g. `NX-9042`).                             |
| `patientId`                                                           | `string`                                    | Medical record number at the referring facility.                 |
| `patientName`                                                         | `string`                                    | Patient name.                                                    |
| `age`, `parity`                                                       | `string \| number`                          | Age and obstetric history.                                       |
| `gestationalAge`, `edd`                                               | `string`                                    | Gestational age (e.g. `36w 0d`) and estimated due date.          |
| `condition`                                                           | `string`                                    | Clinical condition. Falls back to `reason`.                      |
| `referralType`                                                        | `PatientType`                               | `MATERNAL`, `CHILD` or `DYAD`.                                   |
| `priority`                                                            | `UrgencyLevel`                              | How soon the patient needs care.                                 |
| `status`                                                              | `ReferralStatus`                            | Lifecycle state. Defaults to `CREATED`.                          |
| `fromFacility`, `fromClinician`                                       | `string`                                    | Referring hospital and clinician.                                |
| `toFacility`                                                          | `string`                                    | Receiving hospital.                                              |
| `reason`                                                              | `string`                                    | Reason for referral.                                             |
| `caregiverName`, `caregiverContact`, `patientPhone`, `patientAddress` | `string`                                    | Caregiver and patient contact details.                           |
| `language`, `interpreterNeeded`                                       | `string`, `boolean`                         | Preferred language and whether an interpreter is needed.         |
| `transitBarrier`                                                      | `boolean`                                   | A transport barrier was raised at entry.                         |
| `declinedBy`, `rejectionReason`, `patientChoice`                      | `array`, `string \| null`, `string \| null` | Hospitals that declined, why, and the patient's chosen hospital. |
| `navigator`                                                           | `object`                                    | Care navigator on the case.                                      |
| `vitals`                                                              | `object`                                    | Vital signs, for the mother or the baby.                         |
| `barriers`                                                            | `Barrier[]`                                 | Barriers to care.                                                |
| `transit`                                                             | `TransportRequest \| null`                  | Transport record.                                                |
| `arrival`                                                             | `ArrivalRecord \| null`                     | Arrival record, once a hospital confirms arrival.                |
| `clinicalOutcome`                                                     | `ClinicalOutcome \| null`                   | Outcome, once recorded.                                          |
| `followUpPlan`                                                        | `FollowUpPlan \| null`                      | 42-day plan, once the referral is completed.                     |
| `timeline`                                                            | `TimelineEntry[]`                           | Events shown to staff and the family.                            |
| `auditTrail`                                                          | `AuditEvent[]`                              | Append-only event ledger.                                        |
| `createdAt`                                                           | `string` (ISO)                              | Creation time.                                                   |

---

### 4.2 TransportRequest Entity (`createTransportRequest`)

| Property                                    | Type              | Description                                      |
| :------------------------------------------ | :---------------- | :----------------------------------------------- |
| `id`                                        | `string`          | Transport ID (e.g. `TR-4492`).                   |
| `referralId`                                | `string`          | Foreign key to `Referral.id`.                    |
| `status`                                    | `TransportStatus` | See 3.2. Defaults to `REQUESTED`.                |
| `pickupAddress`                             | `string`          | Pickup address.                                  |
| `destinationFacility`                       | `string`          | Destination hospital.                            |
| `vehicleType`                               | `string`          | Type of vehicle (e.g. `MediRide Van`).           |
| `requiresNeonatalKit`, `requiresWheelchair` | `boolean`         | Equipment the van must carry.                    |
| `vanId`                                     | `string \| null`  | Fleet ID (e.g. `VEH-04`). Marks the van as busy. |
| `vehicle`, `driver`, `driverPhone`          | `string \| null`  | Vehicle description, driver name and phone.      |
| `eta`                                       | `string \| null`  | Estimated arrival (e.g. `"12 mins"`).            |
| `dispatchedAt`, `pickedUpAt`, `arrivedAt`   | `string \| null`  | Timestamps for each step.                        |
| `failedReason`                              | `string \| null`  | Why the ride failed.                             |

---

### 4.3 ArrivalRecord Entity (`createArrivalRecord`)

| Property     | Type           | Description                                                                                                                                                                                     |
| :----------- | :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `arrivedAt`  | `string` (ISO) | Check-in time.                                                                                                                                                                                  |
| `verifiedBy` | `string`       | Name and role of the staff member who received the patient, e.g. `"Name (Staff nurse)"`. Roles: Staff nurse, Ward sister, Duty doctor, Medical officer, ANM.                                    |
| `staffId`    | `string`       | Staff ID.                                                                                                                                                                                       |
| `department` | `string`       | Department (e.g. `Obstetric & Neonatal Triage`).                                                                                                                                                |
| `room`       | `string`       | Ward and bed chosen at arrival, e.g. `"SNCU, bed 4"`. Mothers use Labour room, Antenatal ward, Postnatal ward, Obstetric HDU or Casualty; newborns use SNCU, NICU, Paediatric ward or Casualty. |
| `notes`      | `string`       | Arrival note.                                                                                                                                                                                   |

---

### 4.4 ClinicalOutcome Entity (`createClinicalOutcome`)

| Property                                                                        | Type           | Description                                    |
| :------------------------------------------------------------------------------ | :------------- | :--------------------------------------------- |
| `assessedAt`                                                                    | `string` (ISO) | Assessment time.                               |
| `clinicianName`, `clinicianRole`                                                | `string`       | Clinician who recorded the outcome.            |
| `referralType`                                                                  | `PatientType`  | Decides which metric fields are kept.          |
| `diagnosisConfirmed`                                                            | `string`       | Confirmed diagnosis.                           |
| `maternalStatus`, `deliveryType`, `gestationalOutcome`                          | mixed          | Mother's fields. Blanked for a newborn record. |
| `neonatalStatus`, `birthWeightGrams`, `apgar1Min`, `apgar5Min`, `bilirubinMgDl` | mixed          | Baby's fields. Blanked for a mother record.    |
| `disposition`                                                                   | `string`       | Admitted, discharged home or transferred.      |
| `clinicalNotes`                                                                 | `string`       | Narrative summary.                             |

Maternal and neonatal fields never mix: the factory blanks the other patient type's fields. A `DYAD` record keeps both.

---

### 4.5 FollowUpPlan & FollowUpTask Entities

| Property                                                | Type             | Description                                                          |
| :------------------------------------------------------ | :--------------- | :------------------------------------------------------------------- |
| `plan.id`                                               | `string`         | Plan ID (e.g. `PLAN-…`).                                             |
| `plan.referralId`, `plan.patientId`, `plan.patientName` | `string`         | Link to the completed referral and the patient.                      |
| `plan.referralType`                                     | `PatientType`    | Decides the touchpoint schedule.                                     |
| `plan.establishedAt`                                    | `string` (ISO)   | When the plan started.                                               |
| `plan.leadWorker`                                       | `string`         | Named lead worker for the plan.                                      |
| `plan.tasks`                                            | `FollowUpTask[]` | Touchpoints.                                                         |
| `task.id`                                               | `string`         | Task ID (e.g. `TSK-…`).                                              |
| `task.title`                                            | `string`         | Touchpoint title (e.g. `"Day 3 Maternal & Lactation Check"`).        |
| `task.dayOffset`                                        | `number`         | Day the visit is anchored to: `3`, `7`, `14`, `28` or `42`.          |
| `task.dueDate`                                          | `string`         | Local calendar date of the visit.                                    |
| `task.status`                                           | `FollowUpStatus` | `PLANNED`, `SCHEDULED`, `DUE`, `COMPLETED`, `MISSED` or `ESCALATED`. |
| `task.targetRole`                                       | `string`         | Who should do the visit.                                             |
| `task.clinicalFocus`                                    | `string`         | What the visit checks.                                               |
| `task.completedAt`, `task.completedBy`, `task.notes`    | mixed            | Set when the visit is marked done.                                   |

---

### 4.6 AuditEvent Entity (`createAuditEvent`)

| Property    | Type           | Description                                                                 |
| :---------- | :------------- | :-------------------------------------------------------------------------- |
| `id`        | `string`       | Unique event ID (e.g. `AUD-…`).                                             |
| `timestamp` | `string` (ISO) | Time of the change.                                                         |
| `actor`     | `string`       | Name of the person or `System`.                                             |
| `role`      | `AuditRole`    | Who acted (see 3.6).                                                        |
| `action`    | `string`       | Machine action code (e.g. `PATIENT_ARRIVAL_CONFIRMED`, `AI_DRAFT_CHECKED`). |
| `details`   | `string`       | Human-readable explanation.                                                 |

`AI_DRAFT_CHECKED` is written when a clinician sends a referral that was filled with AI. It records the sources used and the fields changed.

---

## 5. Storage Adapter & Serialization

### Key: `navexa_domain_v6`

The app serializes its state to browser `localStorage` under `navexa_domain_v6`. The stored object is the state itself: `referrals`, `facilities`, `navigators`, `fleet` and `notifications`. There is no version wrapper.

On load, the adapter removes the older keys (`navexa_domain_v3` to `navexa_domain_v5`). It keeps only referrals with an ID and a known status. A missing or corrupt value falls back to the seed data in `src/data/seedData.js`, and a warning goes to the console.

```javascript
// Saved shape (localStorage key navexa_domain_v6)
{
  referrals:     [ /* Referral[] */ ],
  facilities:    [ /* Facility[] */ ],
  navigators:    [ /* CareNavigator[] */ ],
  fleet:         [ /* FleetVehicle[] */ ],
  notifications: [ /* Notification[] */ ]
}
```

Demo resets via `resetDemoData()` clear this key, the checklists and the active referral and facility, and reseed the 7 demo referrals. Role, story step and other settings are kept under their own keys (`navexa_role`, `navexa_story_step`, `navexa_active_referral`, `navexa_active_facility`, `navexa_checklists`).
