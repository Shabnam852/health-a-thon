# Google Stitch Screen-to-Component Mapping — Navexa Health

**Project Name:** Navexa Health Design System  
**Stitch Project ID:** `12727947044852093565`  
**Application Root:** `d:/ANTIGRAVITY/Healthathon/health-a-thon`  
**Framework:** React (Vite), React Router v6, Tailwind CSS Material 3 Design Token Architecture

---

## 1. Executive Summary

This document maps all 5 designed screens retrieved directly via Google Stitch MCP from the single source of truth project **"Navexa Health Design System"** (`projects/12727947044852093565`) to their exact React implementations in the running application.

The design specifications, tokens, and raw HTML sources were preserved under `docs/design.md` and `docs/stitch-source/`. All visual tokens, semantic colors (`#001D36` Deep Navy, `#006A67` Healthcare Teal, `#F8F9FF` Surface, `#BA1A1A` Critical Red), typography (`Plus Jakarta Sans`, `Inter`), component dimensions, and interaction patterns have been faithfully implemented.

---

## 2. Screen-to-Component Inventory & Mapping Matrix

| #     | Stitch Screen Name                         | Stitch Screen ID                   | React Route              | Main React Component                                   | Reusable Components & Subcomponents                                                                                  | Implementation Status | Visual Fidelity & Business Logic Integration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----- | ------------------------------------------ | ---------------------------------- | ------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Referral Case Details and Timeline**     | `8a32ab0447f0463384d16a1055ff3566` | `/referral/:id`          | `ReferralDetails.jsx`                                  | `AppShell.jsx`, `Sidebar.jsx`, `TopHeader.jsx`, `LifelineStepper`, `VerificationPod`, `TelemetryPod`, `ActionDeck`   | **100% Complete**     | Current page: the journey as five steps with Healthicons pictograms (Sent, Acknowledged, Transport, Arrived, 42-day follow-up), each marked Done, Now, Needs help or Not yet; a patient pictogram; vitals with pictograms; and a Handoff summary card for staff only. The Stitch design had a 6-gate lifeline (Created → Sent → Acknowledged → In-Transit → Intake → Completed), dual-code arrival handshake verification (`ARR-9482` & `NX-9042`), biometric telemetry, one-tap SDOH barrier resolution modal, 42-day postpartum commitment panel. |
| **2** | **Care Coordinator Command Center**        | `07db767849cd482ba62e415195197e7f` | `/coordinator`           | `CoordinatorDashboard.jsx`                             | `AppShell.jsx`, `Sidebar.jsx`, `TopHeader.jsx`, `KPIRibbon`, `PriorityQueueTable`, `TriageDrawer`                    | **100% Complete**     | Exact 6-KPI metrics ribbon (Awaiting Intake, Overdue Intake, In-Transit, etc.), mandatory red clinical safety banner ("Referrals represent active maternal/neonatal cases"), full priority queue table with acuity badges & countdowns, right-side live triage intelligence drawer.                                                                                                                                                                                                                                                                 |
| **3** | **Patient and Family Journey View**        | `a8db555e501e4fa5a76604a6492a4936` | `/patient`               | `PatientDashboard.jsx`                                 | `AppShell.jsx`, `Sidebar.jsx`, `TopHeader.jsx`, `UrgentSafetyBar`, `JourneyTimeline`, `NavigatorCard`, `CheckinPass` | **100% Complete**     | Reassuring deep navy hero ("Hello Fatima, we're with you every step of the way"), 6-stage roadmap timeline with active step pulse, MediRide live transit pod (ETA 8m, Driver Thomas), Priya Raman MSW navigator card with audio quote, fast check-in QR pass, and interactive "What to Bring" checklist.                                                                                                                                                                                                                                            |
| **4** | **Missed Referral and Barrier Resolution** | `05d2dc56e72c497484d3b0e22e0664d4` | `/patients?show=blocked` | `Patients.jsx` (barrier tables in `BarrierTables.jsx`) | `AppShell.jsx`, `Sidebar.jsx`, `TopHeader.jsx`, `ActiveQueueAlert`, `CaseCardsStack`, `ActionPlaybook`, `AuditTable` | **100% Complete**     | Principle #1 banner: "A referral sent is not care received." 5-stat summary strip, 4 overdue case cards (Baby of Shalini Naidu, Anjali Gowda, Sunita Yadav, Baby of Selvi Murugan), structured root-cause diagnosis, 4 interactive playbook interventions (MediVan dispatch, bed hold delay notice, acuity retriage, clerk signoff), live medicolegal audit trail.                                                                                                                                                                                  |
| **5** | **Create Referral and Care Pathway**       | `a27a570f666e43068bb22e32a6d3a39b` | `/create`                | `CreateReferral.jsx`                                   | `AppShell.jsx`, `Sidebar.jsx`, `TopHeader.jsx`, `StepperBar`, `VitalsPod`, `RouteOverviewCard`, `NavigatorBadge`     | **100% Complete**     | 4-step linear stepper, patient classification selector (Maternal / Neonate / Dyad), gestational age & parity inputs, 4-tier triage priority radio grid, point-of-care vitals pod, transit deficit assessment with automated MediRide dispatch, live route overview with 18m sparkline, connected to `addReferral()`.                                                                                                                                                                                                                                |

---

Current routes. Row 4 is now the Patients screen at `/patients?show=blocked`, with the barrier tables in `BarrierTables.jsx`. `/barriers` redirects there, and the separate Barriers page has been removed. Row 5 is one two-column screen for the Hospital role, with "Fill with AI"; the stepper described above is from the design pass. Several component names in the table (for example `KPIRibbon`, `PriorityQueueTable`, `TriageDrawer` and `LifelineStepper`) are design names and do not appear in `src/`. Check the page file for the current structure.

---

## 3. Supporting Platform Views

| View Name                    | Route                | Main React Component    | Purpose & Alignment                                                                                                                                                                                                                                           |
| ---------------------------- | -------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Role & Persona Selection** | `/`                  | `RoleSelection.jsx`     | Unified landing page allowing reviewers to switch between Care Coordinator, Patient & Family, and Facility personas, with one tile per role (Care Coordinator, Hospital, Patient & Family). Formatted with Stitch typography, cards, and tokens.              |
| **Patients**                 | `/patients`          | `Patients.jsx`          | The coordinator's work list for every open case, with filter tabs (`?show=`) and the barrier tables. Replaces the Queue, Caseload and Barriers screens.                                                                                                       |
| **Family assistant**         | `/patient/assistant` | `AssistantScreen.jsx`   | Full-screen family assistant under Get help. The floating assistant button on other patient screens opens it. Added after the Stitch pass.                                                                                                                    |
| **Facility Operations**      | `/facility`          | `FacilityDashboard.jsx` | Receiving hospital operations view (Sanjeevani Regional Perinatal Centre) tracking inbound transfers, outbound referrals, and action queues, styled with Stitch cards and status lifelines while preserving existing acknowledge/confirm arrival transitions. |
| **Referral Network**         | `/network`           | `NetworkView.jsx`       | Directory of 14 interconnected Midwest Perinatal Hub facilities, bed velocities, and transport conduit fleet status.                                                                                                                                          |

---

## 4. Reusable Component Hierarchy & Design Tokens

### Layout & App Shell

- `src/components/AppShell.jsx`: Persistent layout wrapper. The desktop sidebar is fixed at `w-sidebar` (270px), and the header is fixed at `h-header` (64px, 56px below 1024px). Below 1024px, the drawer (`MobileDrawer`) and bottom tabs (`MobileNav`) take over navigation.
- `src/components/Sidebar.jsx`: Navexa brand mark, navigation items with Material Symbols Rounded, the theme toggle, the demo role selector ("Demo only: view as") and "Back to start".
- `src/components/TopHeader.jsx`: Fixed top header with the menu button (below 1024px), the alerts bell and the "New referral" button (Hospital role only). The search input and facility badge from the Stitch pass have been removed.

### Design tokens (`src/styles/tokens.css`)

The hex values below are from the Stitch pass. `src/styles/tokens.css` holds the values in use.

- **Primary Color:** `#001D36` (`primary`) / `#17324D` (`primary-container`)
- **Secondary Color:** `#006A67` (`secondary`) / `#8DF0EB` (`secondary-container`) / `#90F3EE` (`secondary-fixed`)
- **Surface & Background:** `#F8F9FF` (`surface`, `background`) / `#EEF4FF` (`surface-container-low`) / `#FFFFFF` (`surface-container-lowest`)
- **Error / High Alert:** `#BA1A1A` (`error`) / `#FFDAD6` (`error-container`) / `#93000A` (`on-error-container`)
- **Typography:** `Plus Jakarta Sans` for headlines (`font-headline-xl`, `font-headline-lg`, `font-title-sm`), `Inter` for body text and data tabular (`font-body-md`, `font-body-sm`, `font-label-sm`).
- **Iconography:** Material Symbols Rounded for UI icons (the `.icon` class in `src/index.css`), and Healthicons for pictograms.

---

## 5. Business Logic & Functionality Verification

1. **State Persistence:**
   - Referrals synchronized to browser `localStorage` (`navexa_domain_v6`).
   - Dynamic patient switching via `activeReferralId`.
2. **Referral Creation:**
   - Initiating a referral via `/create` validates inputs, generates a persistent ID (`REF-2024-XXXX`), and redirects to `/referral/:id` with complete timeline records.
3. **Status Transitions:**
   - Handled via `updateReferralStatus` and `resolveBarrier` across `SENT` → `ACKNOWLEDGED` → `ARRIVAL_CONFIRMED` → `COMPLETED`.
4. **Transit & Logistics Actions:**
   - "Dispatch MediVan" triggers real-time transit dispatch state, adds live rows to the encrypted audit trail, and notifies receiving units.
