# Responsive layout

Colours, sizes and components are defined in [design.md](design.md).

## Layout

- **Desktop (1024px and up):** fixed sidebar (`w-sidebar`), fixed 64px header (56px below 1024px), content offset with `lg:pl-sidebar`.
- **Below 1024px:** no sidebar. The header's menu button opens the same navigation in a drawer, and bottom tabs (`MobileNav`) show up to five items with one-line labels (`tabLabel`). If a role has more, the fifth tab is "More", which opens the drawer.
- **Dialogs:** bottom sheet on phones, centred from 640px.
- **Demo bar and toasts:** sit above the bottom tabs (`bottom-above-tabs`), clear of the device safe area.

## Touch

- Below 1024px, or on any coarse pointer, buttons, links, summaries and selects are at least 44px. Links inside a sentence are exempt.
- Fields use 16px text on phones so iOS does not zoom on focus.

## Reflow

Screens must not scroll sideways at 320px. Long values wrap, and field values end in an ellipsis.

## Theme

The theme follows the device until the person picks one with the "Dark mode" button (sidebar, drawer and landing page). The choice is saved as `navexa_theme`. An inline script in `index.html` applies it before first paint, so the page does not flash.
