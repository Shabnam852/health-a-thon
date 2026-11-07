# Navexa Health design system

Quiet, clear and consistent. Hierarchy comes from type and spacing, not colour.

## Where things live

| What                                              | Where                                                   |
| ------------------------------------------------- | ------------------------------------------------------- |
| Token values, light and dark                      | `src/styles/tokens.css`                                 |
| Token names as Tailwind classes                   | `tailwind.config.js`                                    |
| Reusable pieces                                   | `src/components/ui/`                                    |
| Global rules (focus, touch sizes, reduced motion) | `src/index.css`                                         |
| Theme choice and toggle                           | `src/config/theme.js`, `src/components/ThemeToggle.jsx` |

To change a colour, edit `tokens.css` only. No hex values, arbitrary Tailwind values or local button styles in screens.

## Tailwind 4

Tailwind 4.3 runs through its Vite plugin (`@tailwindcss/vite`), and `src/index.css` loads `tailwind.config.js` with `@config`. Screens look exactly as they did on Tailwind 3. The top of `src/index.css` keeps three Tailwind 3 behaviours:

- **Stacked spacing.** `space-y-*` puts the gap above every visible child after the first, and that gap wins over the child's own margin.
- **Base styles.** A border with no colour class uses the line colour. Buttons show a pointer, and disabled controls show the default arrow. Table cells and dropdown options keep the browser's padding.
- **Layer order.** Utilities sit outside a cascade layer, so the plain rules for touch sizes, phone text size and the focus ring still win.

Two things work differently from Tailwind 3:

- To hide something at some widths, use a `max-*` variant: `max-lg:hidden`, not `hidden lg:inline-flex`. In Tailwind 4, a display class from a component, such as Button's `inline-flex`, can win over a plain `hidden`.
- A `leading-*` class now wins over the line height of a responsive text size. To keep a size's own line height at that width, add it back, as in `sm:text-4xl sm:leading-10`.

Placeholders use `ink-muted` instead of Tailwind 3's grey, so they meet 7:1 contrast. This is the only visible change.

Tailwind 4 needs Safari 16.4, Chrome 111 or Firefox 128, or newer. On older browsers, such as phones that no longer get updates, the colours and layout break.

## Colour tokens

| Class                                                 | Use                                         |
| ----------------------------------------------------- | ------------------------------------------- |
| `bg-canvas`                                           | Page background                             |
| `bg-surface`                                          | Cards, dialogs, header, sidebar             |
| `bg-muted`, `bg-subtle`, `bg-subtle-strong`           | Hover states, quiet blocks, empty steps     |
| `border-line`, `border-line-strong`                   | Dividers; field and control edges           |
| `text-ink`, `text-ink-muted`                          | Main and secondary text                     |
| `bg-brand`, `bg-brand-hover`                          | Navy panels (patient hero, demo bar, toast) |
| `bg-accent`, `bg-accent-hover`                        | Main action fill                            |
| `bg-danger`, `bg-danger-hover`                        | Urgent or destructive fill                  |
| `text-on-fill`, `text-on-fill-muted`                  | Text on brand, accent and danger fills      |
| `text-accent`, `bg-accent-soft`                       | Links, active navigation                    |
| `text-danger`, `text-danger-strong`, `bg-danger-soft` | Urgent text and quiet alert blocks          |
| `text-warning`, `bg-warning-soft`                     | Warning badges                              |
| `text-caution`, `bg-caution-soft`                     | Caution badges                              |
| `bg-highlight`, `text-on-highlight`                   | "Now" and "Next" pills, same in both themes |
| `outline-focus`                                       | Focus ring                                  |

`bg-accent` and `text-accent` are different values on purpose. The fill must hold white text in both themes; the text must stay readable on the page. The same applies to `danger`.

Every text pair must reach 7:1, in both themes. Check new tokens against this before using them.

## Other tokens

- **Radius:** `rounded-control` (buttons, fields), `rounded-card` (cards, dialogs), `rounded-full` (pills).
- **Shadow:** `shadow-card`, `shadow-raised`, `shadow-overlay`.
- **Size:** `min-h-control` (44px), `min-h-control-sm` (36px, raised to 44px on touch screens), `w-sidebar`, `w-drawer`, `h-header`, `min-h-tabbar`.
- **Type:** Inter for body, `font-display` (Plus Jakarta Sans) for headings. Use the Tailwind scale, `text-xs` (12px) as the minimum. `tabular-nums` for numbers.

## Components

Import from `src/components/ui/index.js`.

| Component                              | Notes                                                                                                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                               | `variant`: primary, brand, secondary, danger, danger-quiet, ghost, link, tab. `size`: sm, md, icon, flush. `wrap` for long labels. Use `as={Link} to="..."` or `as="a" href="..."` for links. |
| `Card`                                 | Optional `title` renders an h2.                                                                                                                                                               |
| `Badge`                                | `tone`: neutral, accent, danger, danger-solid, warning, caution, highlight.                                                                                                                   |
| `Field`, `Input`, `Select`, `Textarea` | `Field` wraps its control in a label.                                                                                                                                                         |
| `Icon`                                 | `size`: sm, md, lg, xl. Hidden from screen readers; give icon-only buttons an `aria-label`.                                                                                                   |
| `PageHeader`                           | The screen's one h1, which also names the browser tab.                                                                                                                                        |
| `EmptyState`                           | Message for an empty list.                                                                                                                                                                    |
| `Tile`                                 | Large choice button with stacked content.                                                                                                                                                     |
| `Page`                                 | Content column of a screen. `width`: sm, md, lg, full.                                                                                                                                        |
| `FilterTabs`                           | One row of filters that scrolls sideways on narrow screens.                                                                                                                                   |
| `FilterSelect`                         | A filter dropdown you can type into. Arrow keys and Enter pick an option.                                                                                                                     |
| `DataTable`                            | A work list with its own search and filters. Use it for every list of cases.                                                                                                                  |
| `Disclosure`                           | A section that opens and closes. Built on native `<details>`. `variant`: card or inline. Use it instead of bare `<details>`.                                                                  |
| `Pictogram`                            | A Healthicons pictogram, drawn in `currentColor`. Decorative: the text beside it carries the meaning.                                                                                         |

`DetailRow` (`src/components/ui/DetailRow.jsx`) is one labelled line in a row's expanded details.

Icons come from Material Symbols Rounded (UI) and Healthicons (pictograms, through `Pictogram`).

`Dialog` and `Toast` live in `src/components/`. Use `Dialog` for every modal, because it handles focus, Escape and scroll lock.

## Rules for screens

- One filled button per card at most. Filled danger is for urgent actions only.
- Short labels and plain words. See [ACCESSIBILITY.md](ACCESSIBILITY.md) for the medical term exception.
- One h1 per screen, with no skipped heading levels.
- No animation, transitions, gradients, glows, blur or emoji. See `.claude/skills/navexa-ui/SKILL.md`.
