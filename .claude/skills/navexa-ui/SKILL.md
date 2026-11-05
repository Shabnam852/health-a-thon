---
name: navexa-ui
description: How Navexa Health's interface must look and behave. Use before changing any screen, component, colour, icon, pictogram, motion or copy in src/. Covers the Nordic public-health visual style, design tokens, the two icon sets (Material Symbols Rounded for UI, Healthicons for pictograms), the no-animation rule, contrast and accessibility.
---

# Navexa UI

Navexa is used by care coordinators, hospital staff, and mothers and families in India who may be scared,
in a hurry, or not read well. The interface follows government health services such as 1177 (Sweden),
Helsenorge (Norway), GOV.UK and NHS: calm, plain, fast, trustworthy. Nothing should look like a template
or a startup landing page.

## Visual rules

- **Colour comes only from tokens** in `src/styles/tokens.css`, used through Tailwind names (`bg-surface`,
  `text-ink`, `bg-accent`, `text-danger`, `rounded-card`, `rounded-pill`...). Never hard-code a colour.
  Every text pair meets 7:1 in both themes. Check a new pair before adding it.
- **Warm neutrals and one petrol green.** Red means danger only. Orange and amber mean urgent and
  priority only.
- **One neutral family in both themes.** Every grey (canvas, surfaces, lines, ink) shares one warm
  stone hue (OKLCH hue about 80) with very low chroma; dark mode is warm charcoal, not teal. Only
  petrol (hue about 184) carries colour. Never tint text or greys green, and never let the two
  themes use different grey families. Build new values in OKLCH, then check 7:1.
- **Dark mode is not inverted light mode.** Accents get lighter and less saturated, soft backgrounds
  get darker, and the highlight is a softer mint than in light mode so it doesn't glare.
- **No gradients, glows, blur, glassmorphism, neon accents, emoji or decorative blobs.**
- **Flat.** Separate things with borders (`border-line`), not shadows. Only overlays (dialogs, popovers,
  the demo card) get `shadow-overlay`.
- **One typeface: Inter.** Headings are `font-semibold` with normal letter-spacing. No `font-extrabold`,
  no `tracking-tight` display type, no hero-sized headlines.
- **Shapes:** buttons and badges are pills (`rounded-pill`, which Button does by default), inputs are
  `rounded-control`, cards are `rounded-card`.
- **Sentence case everywhere.** Plain words a family understands ("Your ride arrives in 12 mins").

## Motion

**No animation and no transitions.** Hover, press, open and close happen instantly. No fades, slides,
bounces, pulses, smooth scroll or rotating chevrons, and no artificial delays ("Opening case..." timers).
State changes are shown by content (a status line, a banner, a changed label), never by movement.
The reduced-motion rule in `src/index.css` stays as a safety net.

## Icons: two sets, two jobs

1. **UI icons: Material Symbols Rounded** via `<Icon name="..." />` (`src/components/ui/Icon.jsx`),
   weight 350, filled only for a selected state. Use them in buttons, nav and inline with text.
   Names are at fonts.google.com/icons (Rounded style).
   For a tinted square behind a UI icon, use `<IconTile name="..." tone="accent" />`.

2. **Pictograms: Healthicons** (healthicons.org, free, made for public health programmes) via
   `<Pictogram name="..." tone="accent" size="md" />` (`src/components/ui/Pictogram.jsx`).
   Use them where a picture helps someone who reads little: role tiles, the patient's ride and
   hospital cards, empty states, journey steps. Prefer Healthicons over a Material icon whenever a health
   concept is shown (hospital, ambulance, baby, pregnancy, mother and baby, nurse, health worker).
   - Pinned to `healthicons@2.0.0` with an exact version. Don't upgrade casually, and never to a
     release less than two weeks old.
   - To add one, find it on healthicons.org, then import the **outline** 48px SVG in `Pictogram.jsx`
     from `healthicons/public/icons/svg/outline/<group>/<file>.svg` and add it to `ICONS` under a plain
     name that says what it means in Navexa (`van`, not `ambulance`; `bag`, not `travel`).
   - The SVG is applied as a CSS mask over `currentColor`, so `tone` colours it in both themes. Do not
     inline SVG markup with `dangerouslySetInnerHTML`, and do not use `<img>` (it can't take the theme
     colour).
   - Pictograms are decorative (`aria-hidden`). The text beside them must carry the meaning.

**Tiles are rare.** A tinted square behind an icon or pictogram is for one moment per screen: a role
card, the ride panel, an empty state. Card headings are plain text with no icon. In lists and rows
(journey steps, checklist items, visits, hospital options) use `<Pictogram bare />` or nothing, never a
tile per row. Progress uses the standard stepper: a filled circle with a tick for done, a ring for the
current step, an empty circle for later steps, joined by a thin line, with the status also in words.

Never hand-draw new pictograms or mix in another icon library.

## Components to reach for

From `src/components/ui/index.js`: `Button`, `Card` (with `title` and an optional `icon`), `Badge`, `Tile`,
`EmptyState` (with a `pictogram`), `Disclosure` (open/close sections: never a bare `<details>`), `IconTile`, `Pictogram`, `Field`/`Input`/`Select`/`Textarea`,
`DataTable`, `FilterSelect`, `FilterTabs`, `Page`, `PageHeader`. Build from these instead of new one-off
styles.

Confirmation after an action is a banner on the destination page (a `role="status"` box with
`border-l-4 border-accent bg-accent-soft`, like a GOV.UK notification banner). Short feedback on the same
page uses the shared `Toast`.

## Accessibility (WCAG 2.2 AA, aiming for AAA contrast)

- One `h1` per screen (`PageHeader`). Headings go in order.
- Every control has a visible label or an `aria-label`. Repeated row buttons name their row
  ("Mark done for Sunita Devi").
- Touch targets are at least 44px (the tokens raise `control-sm` on touch screens).
- Focus is always visible. Dialogs trap focus and return it when they close.
- Live regions (`role="status"`, `role="alert"`) are for real updates only, never a ticking counter.
- Check the phone width (390px) for horizontal scroll and for buttons pushed off-screen.

## Before you finish

Run `npm run lint`, `npm test` and `npm run build`. Then look at the changed screens in the running app,
in light and dark mode, on desktop and at phone width.
