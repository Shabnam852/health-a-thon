# Navexa Health — Comprehensive System Audit & Architecture Report

**Document:** `docs/SYSTEM_AUDIT.md`  
**Version:** 2.0.0  
**Audit Date:** November 01, 2026  
**Auditor:** Multidisciplinary Senior Engineering & Clinical Product Audit Team  
**Repository Inspected:** `d:/ANTIGRAVITY/Healthathon/health-a-thon`  
**Git Branch:** `main`  
**Node/Package Version:** `health-a-thon@0.0.0`

---

## 1. Executive Summary & Overall Audit Verdict

### 1.1 Executive Verdict: **PARTIALLY READY**

Navexa Health is **not ready** for an unguided, multi-user technical evaluation or real-world deployment. However, it is **partially ready** as a controlled single-browser hackathon prototype, provided critical state desynchronizations, broken transition handlers, and disconnected data structures are resolved.

The application presents a visually compelling, polished user interface built upon the Google Stitch Material 3 design system. It articulates a vital and differentiated healthcare mission: **"A referral sent is not care received"**—shifting focus from hospital intake logging to closing the loop on real-world maternal and neonatal transit, socio-economic barriers, and clinical continuity.

However, beneath the high-fidelity UI lies a stark architectural divide:
1. **Polished Facade vs. Functional Plumbing:** Several centerpiece screens—most notably `BarrierResolution.jsx` and `PatientDashboard.jsx`—contain isolated hardcoded mock arrays and static visual timelines that do not connect to or react to the shared state in `ReferralContext.jsx`.
2. **State Mutation Bugs:** Key workflow triggers contain severe logic errors. In `BarrierResolution.jsx`, transit dispatch calls pass a string instead of an expected object to `dispatchTransit()`, producing `undefined` attributes in timeline logs and malformed state objects. In `FacilityDashboard.jsx`, the primary action button for referrals in `CREATED` status is dead due to a missing case branch.
3. **Absence of Real Healthcare Infrastructure:** There is no server backend, database, authentication, role authorization, or API integration. State persistence relies exclusively on browser `localStorage` (`navexa_referrals_v2`).

---

## 2. Technical Architecture & Technology Stack

### 2.1 Dependencies & Package Inspection (`package.json`)

```json
{
  "name": "health-a-thon",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.24.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.3.4"
  }
}
```

#### Observations & Deficiencies:

- **Zero Automated Testing Framework:** There is no Jest, Vitest, React Testing Library, Cypress, or Playwright installed. `package.json` contains no `test` script.
- **Broken Linting Script:** The `npm run lint` script invokes `eslint .`, but `eslint` is absent from `devDependencies`. Running `npm run lint` terminates immediately with exit code 1 (`'eslint' is not recognized as an internal or external command`).
- **CDN-Coupled CSS:** Tailwind CSS is loaded at runtime via a CDN script tag in `index.html` (`<script src="https://cdn.tailwindcss.com"></script>`) rather than being compiled at build time via PostCSS. While `npm run build` succeeds (creating a 391.4 kB JS bundle and 2.5 kB CSS bundle), any offline demonstration or firewall-restricted demo environment will fail to render styles.

### 2.2 Application Directory & Component Layout

```
health-a-thon/
├── index.html                      # Entry HTML with Google Fonts, Material Symbols, and Tailwind CDN
├── package.json                    # Dependencies & build scripts
├── vite.config.js                  # Vite configuration with @vitejs/plugin-react
├── src/
│   ├── main.jsx                    # React 18 createRoot with BrowserRouter & ReferralProvider
│   ├── App.jsx                     # Top-level route declarations wrapped in AppShell
│   ├── index.css                   # Material 3 CSS variables & base typography resets (147 lines)
│   ├── components/
│   │   ├── AppShell.jsx            # Desktop persistent sidebar & mobile overlay layout wrapper
│   │   ├── Sidebar.jsx             # Stitch navigation rail with role indicator and links
│   │   ├── TopHeader.jsx           # Global header with search, safety disclaimer, notifications
│   │   ├── Navbar.jsx              # [DEAD/ORPHANED] Unused legacy header
│   │   ├── ReferralCard.jsx        # [DEAD/ORPHANED] Unused legacy card component
│   │   ├── ReferralTimeline.jsx    # [DEAD/ORPHANED] Unused legacy timeline component
│   │   └── StatusBadge.jsx         # [DEAD/ORPHANED] Unused legacy badge component
│   ├── context/
│   │   └── ReferralContext.jsx     # Central React Context, localStorage sync, mutation dispatchers
│   ├── data/
│   │   └── demoReferral.js         # 6 initial seed referral objects (maternal & neonatal)
│   └── pages/
│       ├── RoleSelection.jsx       # Landing page (/) for switching persona & viewing screen index
│       ├── CoordinatorDashboard.jsx# Care Coordinator Command Center (/coordinator)
│       ├── ReferralDetails.jsx     # Referral Case Details & Lifeline (/referral/:id)
│       ├── BarrierResolution.jsx   # Missed Arrivals & Barrier Resolution Desk (/barriers)
│       ├── FacilityDashboard.jsx   # Receiving Hospital Intake Operations (/facility)
│       ├── CreateReferral.jsx      # 4-Step Care Pathway Referral Initiation Form (/create)
│       ├── PatientDashboard.jsx    # Patient & Family Care Journey View (/patient)
│       └── NetworkView.jsx         # Regional Care Grid & Facility Directory (/network)
└── docs/                           # Architectural, design, and audit documentation
```

---

## 3. Route & Component Inspection

The application exposes 8 client-side routes via `react-router-dom` in [`src/App.jsx:17-88`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/App.jsx#L17-L88):

| Route           | Main Component             | Layout Wrapper    | Access Control           | Observed State & Interactions                                                                                                                                                                                                                                              |
| :-------------- | :------------------------- | :---------------- | :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`             | `RoleSelection.jsx`        | None (Standalone) | Public                   | Selects persona (`coordinator`, `patient`, `facility`), stores in `localStorage.navexa_role`, redirects to relevant dashboard.                                                                                                                                             |
| `/coordinator`  | `CoordinatorDashboard.jsx` | `AppShell`        | None (Accessible by all) | Computes 6 KPI metrics from `useReferrals()`. Filters priority table by acuity/type. Primary row click navigates to `/referral/:id`. Quick action triggers `updateReferralStatus`. Contains non-functional view mode switcher tabs. Action buttons trigger browser alerts. |
| `/referral/:id` | `ReferralDetails.jsx`      | `AppShell`        | None (Accessible by all) | Reads referral from context by URL parameter. Renders 6-gate progress stepper. Displays hardcoded maternal vitals (`152/98`, `142 bpm`) regardless of whether patient is adult or neonate. Modal buttons display mock text. Call/Chat buttons trigger browser alerts.      |
| `/barriers`     | `BarrierResolution.jsx`    | `AppShell`        | None (Accessible by all) | Renders hardcoded `casesData` array (4 cases). **Isolated from context referrals.** Dispatches transit with string argument instead of object. Local audit trail resets on route change.                                                                                   |
| `/facility`     | `FacilityDashboard.jsx`    | `AppShell`        | None (Accessible by all) | Filters context referrals for "St. Jude" or "District Hospital". Contains dead primary action button for `CREATED` status. Advances statuses `SENT` → `ACKNOWLEDGED` → `ARRIVAL_CONFIRMED` → `COMPLETED`.                                                                  |
| `/create`       | `CreateReferral.jsx`       | `AppShell`        | None (Accessible by all) | 4-step wizard capturing clinical, demographic, social barriers, and receiving department. Submits to `addReferral()` with status `SENT`. Navigates to `/referral/:newId`.                                                                                                  |
| `/patient`      | `PatientDashboard.jsx`     | `AppShell`        | None (Accessible by all) | Reads `activeReferralId`. Renders dynamic greeting name, but **5-step journey timeline is completely hardcoded and static**. Always shows Step 3 "Ride on the Way" as in-progress.                                                                                         |
| `/network`      | `NetworkView.jsx`          | `AppShell`        | None (Accessible by all) | Static directory of 5 regional medical centers with mock bed availability and service capabilities. Search filter operates on static facility list.                                                                                                                        |

---

## 4. State Management and Data Flow Architecture

### 4.1 State Hierarchy & Persistence (`ReferralContext.jsx`)

The entire data plane resides in React Context initialized in [`src/context/ReferralContext.jsx:16-170`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/context/ReferralContext.jsx#L16-L170):

```
                       ┌───────────────────────────────┐
                       │     Browser localStorage      │
                       │  'navexa_referrals_v2'        │
                       └──────────────┬────────────────┘
                                      │ (init / sync)
                                      ▼
                       ┌───────────────────────────────┐
                       │        ReferralProvider       │
                       │   - referrals: Array          │
                       │   - activeReferralId: String  │
                       │   - role: String              │
                       └──────────────┬────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│  CreateReferral  │        │FacilityDashboard │        │CoordinatorDashb'd│
│  addReferral()   │        │updateReferral()  │        │updateReferral()  │
└──────────────────┘        └──────────────────┘        └──────────────────┘
```

#### Persistence Behavior:

1. **Cache Loading:** Reads `localStorage.getItem("navexa_referrals_v2")` on mount. If empty or invalid, falls back to `demoReferrals` from [`src/data/demoReferral.js`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/data/demoReferral.js).
2. **Auto-Synchronization:** An `useEffect` hook serializes `referrals` to `localStorage` on every state update. This ensures data survives browser refreshes ($F5$).
3. **Demo Reset:** `resetDemoData()` purges `localStorage` and restores original mock cases.

---

## 5. Major Architectural Weaknesses & Critical Flaws

### 5.1 Flaw 1: State Disconnection in `BarrierResolution.jsx`

- **Location:** [`src/pages/BarrierResolution.jsx:5-106, 188-230`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/BarrierResolution.jsx#L5-L106)
- **Observed Behavior:** The Barrier Resolution desk defines its own static array `casesData` containing 4 cases: `NX-9042` (Baby Boy Chen), `NX-9038` (Amara Okafor), `NX-9051` (Khadija Said), and `NX-9019` (Lucia Gomez). Only `NX-9042` exists in `demoReferrals.js`. The remaining 3 cases do not exist in `ReferralContext`.
- **Impact:** When a user selects Amara Okafor, Khadija Said, or Lucia Gomez and clicks "Dispatch MediVan" or "Confirm Intake", the mutation dispatchers (`dispatchTransit`, `resolveBarrier`) fail silently because no matching referral ID exists in `ReferralContext.referrals`. Furthermore, the audit log in this view is stored in local component state (`useState`), meaning all logged actions vanish if the user navigates away.

### 5.2 Flaw 2: Malformed Transit Dispatch Signature

- **Location:** [`src/pages/BarrierResolution.jsx:188-193`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/BarrierResolution.jsx#L188-L193) vs [`src/context/ReferralContext.jsx:118-139`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/context/ReferralContext.jsx#L118-L139)
- **Code in Context:**

  ```javascript
  const dispatchTransit = (referralId, transitData) => {
    ...
    notes: `MediRide transit dispatched: ${transitData.vehicle} (Driver: ${transitData.driver}, ETA: ${transitData.eta})`,
    ...
    transit: { ...(referral.transit || {}), ...transitData }
  }
  ```
- **Code in Page:**

  ```javascript
  dispatchTransit(activeCase.id, "MediVan #04 (Driver Marcus Ross with Chicco KeyFit Car Seat)");
  ```
- **Impact:** `transitData` is passed as a primitive string. Accessing `transitData.vehicle`, `transitData.driver`, and `transitData.eta` evaluates to `undefined`. The timeline logs `"MediRide transit dispatched: undefined (Driver: undefined, ETA: undefined)"`. Spreading the string (`...transitData`) turns the `referral.transit` property into an object with numerical character indices (`{ 0: "M", 1: "e", 2: "d", ... }`), corrupting the data model.

### 5.3 Flaw 3: Static Patient Journey Visual Illusion

- **Location:** [`src/pages/PatientDashboard.jsx:171-315`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/PatientDashboard.jsx#L171-L315)
- **Observed Behavior:** While the header dynamically displays the active patient's name, the 5-stage visual progress roadmap is 100% hardcoded HTML.
- **Impact:** Step 3 ("Ride on the Way to Your Door") is permanently rendered with an animated pulsing icon and active step badge, regardless of whether the referral is in `CREATED`, `SENT`, `ARRIVAL_CONFIRMED`, or `COMPLETED`. Even if a judge views a completed referral or a newborn baby case, the patient view always claims a silver transit van is 1.4 miles away with Driver Thomas.

### 5.4 Flaw 4: Dead Action Button for `CREATED` Referrals

- **Location:** [`src/pages/FacilityDashboard.jsx:62-97`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/FacilityDashboard.jsx#L62-L97)
- **Observed Behavior:** `handlePrimaryAction` implements branches for `SENT`, `ACKNOWLEDGED`, `ARRIVAL_CONFIRMED`, and `FOLLOW_UP_REQUIRED`. It contains **no branch** for `CREATED`.
- **Impact:** If a referral is in `CREATED` status, the button displays "View Details", but clicking it invokes `handlePrimaryAction`, which does nothing. The user is trapped and cannot advance the referral or view its chart from that button.

### 5.5 Flaw 5: Inappropriate Telemetry Rendering for Neonatal Referrals

- **Location:** [`src/pages/ReferralDetails.jsx:360-421`](file:///d:/ANTIGRAVITY/Healthathon/health-a-thon/src/pages/ReferralDetails.jsx#L360-L421)
- **Observed Behavior:** The clinical assessment telemetry pod unconditionally renders:
  - Maternal Blood Pressure: `152/98 mmHg`
  - Fetal Heart Rate: `142 bpm`
  - Urine Dipstick: `+2 Protein`
  - Biophysical Profile: `8/8`
- **Impact:** When inspecting a neonatal referral (e.g., Baby Boy Chen, a 3-day-old infant with jaundice), the system displays maternal obstetric vitals including fetal heart rate and protein dipsticks. This is a severe clinical domain error that would immediately disqualify the platform in front of healthcare evaluators.

### 5.6 Flaw 6: Orphaned / Dead Code Assets

- **Location:** `src/components/Navbar.jsx`, `src/components/ReferralCard.jsx`, `src/components/ReferralTimeline.jsx`, `src/components/StatusBadge.jsx`
- **Observed Behavior:** These components are remnants of an earlier codebase revision and are not imported by any active page or component. They inflate repository clutter and create confusion during code review.

---

## 6. Architectural Viability Assessment Across 3 Levels

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURAL VIABILITY                         │
├──────────────────────────┬──────────────────────┬──────────────────────┤
│ Level 1: Hackathon Demo  │ Level 2: Multi-User  │ Level 3: Production  │
├──────────────────────────┼──────────────────────┼──────────────────────┤
│ Status: VIABLE (with P0) │ Status: UNVIABLE     │ Status: UNVIABLE     │
│ - Client-side state      │ - Requires WebSocket │ - Requires HIPAA DB  │
│ - localStorage caching   │ - Multi-client sync  │ - OAuth2/OIDC RBAC   │
│ - Single-browser demo    │ - Conflict resolution│ - HL7 FHIR APIs      │
└──────────────────────────┴──────────────────────┴──────────────────────┘
```

1. **Level 1 — Local Hackathon Prototype (Viable with P0 fixes):**
   The current React + Vite architecture is appropriate for a rapid single-device hackathon demonstration, provided state transitions work seamlessly, data models are unified across pages, and fake alerts are replaced with in-app interactions.
2. **Level 2 — Multi-User Simultaneous Demonstration (Unviable):**
   Because state is bound to an individual browser's `localStorage`, two judges sitting at different laptops cannot see each other's actions. A hospital facility cannot acknowledge a referral created on a clinic laptop without a shared cloud datastore (e.g., Firebase, Supabase, or lightweight Node/Express server).
3. **Level 3 — Production Healthcare System (Unviable):**
   A production clinical coordination platform requires HIPAA-compliant encrypted storage at rest and in transit, strict RBAC, HL7 FHIR `ServiceRequest` interoperability, comprehensive BAA agreements, auditable access logging, and fault-tolerant cloud infrastructure.
