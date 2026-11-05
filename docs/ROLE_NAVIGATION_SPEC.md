# Roles and navigation

Navigation is defined in `src/config/navigationConfig.js`. The sidebar, drawer and bottom tabs all read `getNavigationForRole(role)`.

## Roles

| Role id       | Title            | Home           |
| ------------- | ---------------- | -------------- |
| `coordinator` | Care Coordinator | `/coordinator` |
| `facility`    | Hospital         | `/facility`    |
| `patient`     | Patient & Family | `/patient`     |

Care navigation has no role of its own: the Coordinator does it on the Patients screen. A case can still name an assigned navigator, who is the family's contact. The role dropdown in the menu (labelled "Demo only: view as") exists only to switch views in this demo.

## Navigation items

**Coordinator:** Dashboard (`/coordinator`), Patients (`/patients`), Transport (`/transport`), Hospitals (`/network`), 42-day follow-up (`/continuity`). Patients is one screen with filter tabs (`?show=`): All, Mothers, Newborns, Needs transport, No reply yet, Blocked and Barriers solved. It replaces the old Queue, Caseload and Barriers screens.

**Facility:** Intake (`/facility`), Hospitals (`/network`). Intake's tabs are on the screen itself: To acknowledge, On the way, Arrived, Done and Declined. New referral (`/create`) is a button in the header, shown to the Hospital role only, because a hospital makes the referral.

**Patient:** My journey (`/patient`), My ride (`?view=transit`), What to bring (`?view=checklist`), 42-day plan (`/continuity`), Get help (`?view=support`). Each topic appears in one place only: My journey shows status and next step, and the other tabs hold the detail. The emergency 108 call is on every patient view. The family assistant (`/patient/assistant`) is a full screen under Get help. On the other patient screens, a floating button opens the assistant: a link to the full screen on phones, and a chat panel on desktop.

**Old paths:** `/navigator` redirects to `/patients`. `/barriers` redirects to `/patients?show=blocked`. `/coordinator?view=queue` redirects to `/patients`. `/referrals` opens the role's own queue.

## Route guard

`AppShell` checks `isRouteAllowedForRole`. On a route the role can't use, it shows who the screen is for, with buttons to go back or switch role. This is a demo guard on the client, not security.

Unknown routes show `NotFound`. An unknown referral id shows a not-found card.

## Switching roles

For the demo, the sidebar and drawer have a role selector and a "Back to start" link. The landing page (`/`) lists all roles.
