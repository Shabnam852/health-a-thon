# Responsive layout

Colours, sizes and components are defined in [design.md](design.md).

## Layout

- **Desktop (1024px and up):** fixed sidebar (`w-sidebar`), fixed 64px header (56px below 1024px), content offset with `lg:pl-sidebar`.
- **Below 1024px:** no sidebar. The header's menu button opens the same navigation in a drawer, and bottom tabs (`MobileNav`) show up to five items with one-line labels (`tabLabel`). If a role has more than five items, the fifth tab is "More", which opens the drawer. The Coordinator and Patient roles have exactly five, so they have no "More" tab.
- **Dialogs:** bottom sheet on phones, centred from 640px.
- **Demo bar and toasts:** sit above the bottom tabs (`bottom-above-tabs`), clear of the device safe area.
- **Wide content:** a filter row (`FilterTabs`) and a work list (`DataTable`) scroll inside their own box. The page itself does not.

## Touch

- Below 1024px, or on any coarse pointer, buttons, links, summaries and selects are at least 44px. Links inside a sentence are exempt.
- `Disclosure` headers are at least 48px tall.
- Fields use 16px text on phones so iOS does not zoom on focus.

## Reflow

The page must not scroll sideways at 320px. `html` and `body` use `overflow-x: clip`, and `scrollbar-gutter: stable` keeps the scrollbar's space so content does not shift (`src/index.css`). Long values wrap, and field values end in an ellipsis.

## Theme

The theme follows the device until the person picks one with the theme button (sidebar, drawer, and an icon-only button on the landing page). The button names the theme it switches to: "Dark mode" or "Light mode". The choice is saved as `navexa_theme` (`src/config/theme.js`). An inline script in `index.html` applies it before first paint, so the page does not flash.
