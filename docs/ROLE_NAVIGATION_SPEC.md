# Roles and navigation

Navigation is defined in `src/config/navigationConfig.js`. The sidebar, drawer and bottom tabs all read `getNavigationForRole(role)`.

## Roles

| Role id       | Title            | Home           |
| ------------- | ---------------- | -------------- |
| `coordinator` | Care Coordinator | `/coordinator` |
| `facility`    | Hospital         | `/facility`    |
| `patient`     | Patient & Family | `/patient`     |

Care navigation has no role of its own: the Coordinator does it from Caseload. A case can still name an assigned navigator, who is the family's contact. The role dropdown in the menu exists only to switch views in this demo.

## Navigation items

**Coordinator:** Dashboard (`/coordinator`), Queue (`/coordinator?view=queue`), Barriers (`/barriers`), Caseload (`/navigator`), Transport (`/transport`), Hospitals (`/network`), 42-day follow-up (`/continuity`). New referral (`/create`) is in the header.

**Facility:** Intake (`/facility`), Hospitals (`/network`). Intake's tabs are on the screen itself.

**Patient:** My journey (`/patient`), My ride (`?view=transit`), What to bring (`?view=checklist`), 42-day plan (`/continuity`), Get help (`?view=support`). Each topic appears in one place only: My journey shows status and next step, and the other tabs hold the detail. The emergency 108 call is on every patient view.
## Route guard

`AppShell` checks `isRouteAllowedForRole`. On a route the role can't use, it shows who the screen is for, with buttons to go back or switch role. This is a demo guard on the client, not security.

Unknown routes show `NotFound`. An unknown referral id shows a not-found card.

## Switching roles

For the demo, the sidebar and drawer have a role selector and a "Back to start" link. The landing page (`/`) lists all roles.
