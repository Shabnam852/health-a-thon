# Navexa Health — Domain Data Model Specification

**Document:** `docs/DATA_MODEL.md`  
**Version:** 3.0.0  
**Status:** IMPLEMENTED & VERIFIED  
**Auditor/Architect:** Backend & Database Architect, Healthcare Technology Architect  

---

## 1. Domain Model Architecture & Principles

The Navexa Health domain data model provides a unified, normalized, and strictly validated schema for maternal and neonatal care navigation. 

### Core Architectural Principles
1. **Single Source of Truth:** All entities originate from and synchronize back to the master store in `ReferralContext`, persisted via `storageAdapter.js` under the versioned key `navexa_domain_v3`.
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
│  - patientName, patientType, age, gestationalAgeWeeks                  │
│  - indication, urgency, referringClinic, receivingFacility             │
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
│ - status     │ │ - driver     │ │ - bay        │ │ - maternal/  │ │ - action     │
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
Controls the overarching clinical-operational lifecycle gate:
- `CREATED`: Referral drafted at referring facility; not yet transmitted.
- `SENT`: Referral formally transmitted to receiving facility queue.
- `ACKNOWLEDGED`: Receiving facility triage confirmed receipt, held bed/bay.
- `IN_TRANSIT`: Patient active in transit via coordinated medical fleet.
- `ARRIVAL_CONFIRMED`: Patient physically checked in at receiving emergency/maternity triage bay.
- `CLINICAL_ASSESSMENT_RECORDED`: Attending clinician recorded exam & intervention findings.
- `COMPLETED`: Hospital referral episode concluded; handoff initiated.
- `REJECTED`: Receiving facility declined intake due to capacity or acuity mismatch.
- `REDIRECTED`: Case diverted to alternate medical center with mutual transfer agreement.
- `MISSED`: Patient failed to arrive within clinically acceptable time window.

### 3.2 `TransportStatus`
Tracks specialized patient transport operations:
- `NONE`: No transit required or requested.
- `REQUESTED`: Transport dispatch requested by care team/navigator.
- `ASSIGNED`: Vehicle and certified driver allocated.
- `DISPATCHED`: Vehicle en route to patient pickup location.
- `PICKED_UP`: Patient aboard vehicle; en route to facility.
- `ARRIVED`: Safe arrival and drop-off confirmed at receiving hospital triage.
- `FAILED`: Transit cancelled, vehicle breakdown, or patient unreachable.

### 3.3 `BarrierStatus` & `BarrierCategory`
Social determinants and logistical blockers:
- **Status:** `OPEN` → `IN_PROGRESS` → `RESOLVED` → `ESCALATED`.
- **Category:** `TRANSPORT` (lack of vehicle, wheelchair, or infant restraint), `FINANCIAL` (co-pay, gas, lost wages), `CHILDCARE` / `DEPENDENT_CARE` (unattended siblings), `LINGUISTIC` (interpreter required), `WEATHER` (severe snow/flooding), `HOUSING` (unhoused / unstable shelter).

### 3.4 `UrgencyLevel`
- `STAT`: Immediate life threat (cord prolapse, severe eclampsia, acute neonatal respiratory distress). Response target: $<15$ minutes.
- `URGENT`: Rapid clinical deterioration risk (preterm PROM, neonatal hyperbilirubinemia approaching exchange threshold). Response target: $<2$ hours.
- `ROUTINE`: Scheduled consultation, specialized ultrasound, non-acute transfer. Response target: $<24$ hours.

### 3.5 `PatientType`
- `MATERNAL`: Pregnant, laboring, or postpartum woman.
- `NEONATAL`: Newborn infant ($\le 28$ days of life).
- `DYAD`: Mother-infant pair receiving coupled care.

### 3.6 `Role`
- `COORDINATOR`: Regional triage and intake command center dispatcher.
- `NAVIGATOR`: Community care coordinator and social worker.
- `FACILITY`: Hospital triage clerk, charge nurse, or bed manager.
- `CLINICIAN`: Licensed medical provider (MD, DO, CNM, NP, FACOG).
- `PATIENT`: Patient, mother, or legal family guardian.
- `SYSTEM_ADMIN`: Platform operations and audit administrator.

---

## 4. Entity Specifications & Schemas

### 4.1 Referral Entity (`createReferral`)
| Property | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Unique referral identifier (e.g. `REF-2024-8821`, `NX-9042`). |
| `mrn` | `string` | Yes | Medical Record Number at referring facility. |
| `patientName` | `string` | Yes | Legal full name of patient. |
| `patientType` | `PatientType` | Yes | `MATERNAL`, `NEONATAL`, or `DYAD`. |
| `age` | `number \| string`| Yes | Patient age (e.g. `26` or `4 days`). |
| `gestationalAgeWeeks` | `number \| null` | Conditional | Gestational age for maternal referrals (e.g. `34`). Null for neonates. |
| `indication` | `string` | Yes | Primary clinical indication narrative for referral. |
| `urgency` | `UrgencyLevel` | Yes | Clinical triage classification (`STAT`, `URGENT`, `ROUTINE`). |
| `referringClinic` | `string` | Yes | Originating clinic or birth center name. |
| `receivingFacility` | `string` | Yes | Target destination medical center. |
| `status` | `ReferralStatus` | Yes | Active operational state. Defaults to `SENT`. |
| `vitals` | `object` | Yes | Strictly typed object based on `patientType`. |
| `vitals.bloodPressure` | `string` | Maternal only | e.g. `"168/104 mmHg"` |
| `vitals.fetalHeartRate` | `string \| number` | Maternal only | e.g. `142` bpm |
| `vitals.tsb` | `string \| number` | Neonatal only | Total Serum Bilirubin (e.g. `18.4 mg/dL`). |
| `vitals.birthWeight` | `string \| number` | Neonatal only | e.g. `2840g`. |
| `barriers` | `Barrier[]` | Yes | Array of identified barriers to care. |
| `transit` | `TransportRequest \| null` | No | Associated transit operation entity. |
| `arrivalRecord` | `ArrivalRecord \| null` | No | Intake physical verification record. |
| `clinicalOutcome` | `ClinicalOutcome \| null`| No | Attending provider outcome record. |
| `assignedNavigator` | `object \| null` | No | Navigator profile assigned to case. |
| `auditTrail` | `AuditEvent[]` | Yes | Chronological event ledger. |
| `createdAt` | `string` (ISO) | Yes | Creation timestamp. |
| `updatedAt` | `string` (ISO) | Yes | Last modification timestamp. |

---

### 4.2 TransportRequest Entity (`createTransportRequest`)
| Property | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Unique transport identifier (e.g. `TR-8821`). |
| `referralId` | `string` | Yes | Foreign key to `Referral.id`. |
| `patientName` | `string` | Yes | Passenger name. |
| `vehicleId` | `string` | Yes | Fleet unit ID (e.g. `MEDIVAN-04`). |
| `vehicleName` | `string` | Yes | Human-readable unit name. |
| `driverName` | `string` | Yes | Certified medical driver name. |
| `driverPhone` | `string` | Yes | Direct contact phone for driver. |
| `pickupAddress` | `string` | Yes | Origin street address. |
| `destinationFacility` | `string` | Yes | Destination hospital wing/entrance. |
| `requiresInfantCarSeat`| `boolean` | Yes | Flag enforcing certified rear-facing car seat installation. |
| `status` | `TransportStatus` | Yes | `REQUESTED`, `DISPATCHED`, `PICKED_UP`, `ARRIVED`, `FAILED`. |
| `eta` | `string` | No | Estimated arrival time (e.g. `"14 mins"`). |
| `dispatchedAt` | `string \| null` | No | Timestamp of driver rolling. |
| `pickedUpAt` | `string \| null` | No | Timestamp of patient boarding. |
| `arrivedAt` | `string \| null` | No | Timestamp of facility drop-off. |
| `failedAt` | `string \| null` | No | Timestamp if disruption occurs. |
| `failureReason` | `string \| null` | No | Root-cause of transport failure. |

---

### 4.3 ArrivalRecord Entity (`createArrivalRecord`)
| Property | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Unique arrival verification ID. |
| `referralId` | `string` | Yes | Foreign key to `Referral.id`. |
| `arrivedAt` | `string` (ISO) | Yes | Precise check-in timestamp. |
| `verifiedBy` | `string` | Yes | Full name of receiving staff member. |
| `staffRole` | `string` | Yes | Role (e.g. `"Triage RN"`, `"Intake Specialist"`). |
| `receivingBay` | `string` | Yes | Bay or bed (e.g. `"L&D Triage Bay 2"`, `"NICU Pod B"`). |
| `notes` | `string` | No | Admission or condition notes upon entry. |

---

### 4.4 ClinicalOutcome Entity (`createClinicalOutcome`)
| Property | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Outcome transaction ID. |
| `referralId` | `string` | Yes | Foreign key to `Referral.id`. |
| `patientType` | `PatientType` | Yes | Determines validation schema for metrics. |
| `recordedAt` | `string` (ISO) | Yes | Assessment completion timestamp. |
| `attendingClinician` | `string` | Yes | Attending physician or nurse midwife. |
| `clinicianRole` | `string` | Yes | Clinical title (e.g. `"FACOG"`, `"Neonatologist"`). |
| `summary` | `string` | Yes | Narrative assessment summary. |
| `maternalMetrics` | `object \| null` | Conditional | Present if `patientType === 'MATERNAL'`. |
| `maternalMetrics.bloodPressure` | `string` | Yes | Final stabilized blood pressure. |
| `maternalMetrics.deliveryOutcome` | `string` | Yes | Vaginal, Cesarean, or Inpatient Antenatal Care. |
| `maternalMetrics.ebl` | `string` | No | Estimated Blood Loss (e.g. `"350 mL"`). |
| `neonatalMetrics` | `object \| null` | Conditional | Present if `patientType === 'NEONATAL'`. |
| `neonatalMetrics.tsbMgDl` | `number \| string`| Yes | Post-phototherapy serum bilirubin. |
| `neonatalMetrics.phototherapyReceived`| `boolean`| Yes | High-intensity blue light delivered. |
| `neonatalMetrics.birthWeightGrams` | `number` | Yes | Precise infant scale weight. |
| `disposition` | `string` | Yes | Admitted to Inpatient, Discharged Home, Transferred to Level IV. |
| `dischargePlan` | `string` | Yes | Prescribed handoff and follow-up directives. |

---

### 4.5 FollowUpPlan & FollowUpTask Entities
| Property | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `plan.id` | `string` | Yes | Unique plan ID (e.g. `FUP-8821`). |
| `plan.referralId` | `string` | Yes | Link to originating completed referral. |
| `plan.status` | `FollowUpStatus` | Yes | `ACTIVE`, `COMPLETED`, `OVERDUE`. |
| `plan.touchpoints` | `FollowUpTask[]` | Yes | Schedule of clinical follow-up visits. |
| `task.id` | `string` | Yes | Task ID (e.g. `TASK-8821-3`). |
| `task.targetDay` | `number` | Yes | Clinical touchpoint anchor: `3`, `7`, `14`, or `42`. |
| `task.title` | `string` | Yes | Touchpoint title (e.g. `"Day 3: Bilirubin Re-Check"`). |
| `task.category` | `string` | Yes | Clinical or supportive category. |
| `task.dueDate` | `string` (ISO) | Yes | Date visit must occur. |
| `task.status` | `FollowUpStatus` | Yes | `SCHEDULED`, `PENDING`, `COMPLETED`, `OVERDUE`, `MISSED`. |
| `task.completedAt` | `string \| null` | No | Date visit documented. |
| `task.completedBy` | `string \| null` | No | Midwife or nurse who conducted check. |
| `task.findings` | `string \| null` | No | Documented clinical findings from visit. |
| `task.escalationRequired` | `boolean` | No | Flag indicating red-flag symptom recurrence. |

---

### 4.6 AuditEvent Entity (`createAuditEvent`)
| Property | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Unique event ID (e.g. `EVT-1718000000-XYZ`). |
| `referralId` | `string` | Yes | Associated referral ID. |
| `timestamp` | `string` (ISO) | Yes | Exact system time of transition. |
| `actor` | `string` | Yes | Full name of user initiating transition. |
| `role` | `Role` | Yes | Authorized operational role of user. |
| `action` | `string` | Yes | Machine action code (e.g. `TRANSIT_DISPATCHED`). |
| `details` | `string` | Yes | Human-readable explanation with contextual metadata. |
| `previousStatus` | `string \| null` | No | Previous state code. |
| `nextStatus` | `string \| null` | No | Resulting state code. |

---

## 5. Storage Adapter & Serialization

### Key: `navexa_domain_v3`
The data model serializes to browser `localStorage` under `navexa_domain_v3`. 
The schema contains automatic migration guards: if corrupted or legacy v1/v2 schema data is encountered, the storage adapter falls back to `seedData.js` while emitting a diagnostic warning to the developer console.

```javascript
// Storage Schema Snapshot
{
  version: "3.0.0",
  lastSaved: "2026-11-01T01:30:00.000Z",
  data: {
    referrals: [ /* Referral[] */ ],
    facilities: [ /* Facility[] */ ],
    navigators: [ /* CareNavigator[] */ ],
    fleet: [ /* FleetVehicle[] */ ],
    notifications: [ /* Notification[] */ ]
  }
}
```
Demo resets via `resetDemoData()` safely purge this key and reseed all 7 golden clinical referral cases.

