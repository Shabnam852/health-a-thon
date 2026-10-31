---
name: Navexa Health
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf4'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dbe9ff'
  surface-container-highest: '#d3e4fd'
  on-surface: '#0b1c2e'
  on-surface-variant: '#43474d'
  inverse-surface: '#213144'
  inverse-on-surface: '#eaf1ff'
  outline: '#74777e'
  outline-variant: '#c3c6ce'
  surface-tint: '#47607e'
  primary: '#001d36'
  on-primary: '#ffffff'
  primary-container: '#17324d'
  on-primary-container: '#819aba'
  inverse-primary: '#afc9ea'
  secondary: '#006a67'
  on-secondary: '#ffffff'
  secondary-container: '#8df0eb'
  on-secondary-container: '#006f6b'
  tertiary: '#121e1c'
  on-tertiary: '#ffffff'
  tertiary-container: '#263331'
  on-tertiary-container: '#8e9b99'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d1e4ff'
  primary-fixed-dim: '#afc9ea'
  on-primary-fixed: '#001d36'
  on-primary-fixed-variant: '#2f4865'
  secondary-fixed: '#90f3ee'
  secondary-fixed-dim: '#73d7d2'
  on-secondary-fixed: '#00201f'
  on-secondary-fixed-variant: '#00504d'
  tertiary-fixed: '#d7e5e3'
  tertiary-fixed-dim: '#bcc9c7'
  on-tertiary-fixed: '#121e1c'
  on-tertiary-fixed-variant: '#3d4947'
  background: '#f8f9ff'
  on-background: '#0b1c2e'
  surface-variant: '#d3e4fd'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  title-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  data-tabular:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-md: 1.5rem
  gutter-lg: 2rem
  margin: 1rem
  margin-md: 2rem
  margin-lg: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style
The design system establishes a clinical, high-trust environment tailored for maternal and newborn healthcare operations. It balances the exacting precision of high-stakes clinical workflows with a humane, calming touch designed to alleviate cognitive fatigue for clinicians and anxiety for care recipients.

### Visual Style
The interface employs a **Refined Clinical SaaS** aesthetic characterized by:
- Pure white container surfaces resting on a cool, crisp canvas.
- Structural stability achieved through hairline borders and tabular data density rather than heavy decorative elements.
- Muted clinical teal accents providing life and clarity against an authoritative, grounding deep navy structure.
- Calm, accessible contrast ratios exceeding WCAG AAA for critical operational text and data values.

## Colors
The palette is engineered to support mission-critical healthcare coordination with unmistakable semantic hierarchy and soothing clinical undertones.

### Primary Palette & Neutrals
- **Primary Deep Navy (`#17324D`) & Deep Navy Shade (`#10263D`):** Defines the structural foundations, high-level headers, primary brand actions, and authoritative navigation rails.
- **Healthcare Teal (`#168C88`):** Serves as the primary operational accent for active interactions, key focal points, progress metrics, and live care indicators.
- **Light Mint (`#E7F5F2`):** Used as a calming, low-arousal background for selected rows, positive alert states, active status pills, and vital trend containers.
- **Canvas (`#F6F8FB`):** A crisp, ultra-clean neutral background that differentiates the underlying workspace from active surfaces.
- **Surface Pure White (`#FFFFFF`):** High-density cards, panels, modal dialogs, and tabular views.
- **Primary Text Charcoal (`#243447`):** High-contrast, fatigue-reducing neutral for clinical records, patient labels, and body content.
- **Secondary Muted Slate (`#66758A`):** Low-strain contextual metadata, secondary labels, and inactive iconography.
- **Structural Border Slate (`#E2E8F0`):** Hairline container delimiters maintaining interface organization without visual weight.

### Semantic Alerts
- **Critical Red (`#C94C4C`):** Vital instability, critical newborn warnings, urgent lab thresholds, and allergy alerts.
- **Warning Amber (`#D99A32`):** Pending clearances, overdue triage milestones, and attention-required updates.
- **Success Green (`#278568`):** Verified discharges, stable infant indicators, and completed clinical care tasks.

## Typography
The system employs an authoritative dual-font approach: **Plus Jakarta Sans** provides a welcoming, humane presence in titles and structural section anchors, while **Inter** ensures legibility across dense clinical matrices, fetal monitoring readouts, and medication logs.

### Application Rules
- **Tabular Numerals (`font-variant-numeric: tabular-nums`):** Mandatory for vital signs (heart rates, APGAR scores, gestational dates, dosages). This prevents layout shifts during telemetry updates.
- **Labels:** Uppercase styling with tracking applied strictly to `label-sm` for system status, triage categories, and timeline markers.
- **Hierarchical Anchoring:** Patient identity headlines must remain visually linked to active care status tags to support rapid chart identification.

## Layout & Spacing
The layout relies on a strict 12-column grid system for large displays and an adaptable flex structure on viewports below 768px.

### Breakpoints & Grid Scaling
- **Mobile (< 768px):** 4-column flow with a `margin` of `1rem` and a `gutter` of `1rem`. Secondary clinical sidebars collapse into bottom action sheets.
- **Tablet (768px - 1024px):** 8-column layout with `gutter-md` (`1.5rem`) and `margin-md` (`2rem`). Care plans and patient profile headers remain fixed at the top.
- **Desktop (1024px+):** 12-column system constrained to a maximum width of 1600px with a persistent 260px administrative navigation spine. Uses `gutter-lg` (`2rem`) and `margin-lg` (`3rem`).

### Component Spacing Discipline
- `space-xs` (4px): Micro-badge padding, gap between value and unit (e.g., "124" and "bpm").
- `space-sm` (8px): Internal form input padding, tight list item separation, chip arrays.
- `space-md` (16px): Standard card body padding, stack gap for clinical notes, inter-element distance within card sections.
- `space-lg` (24px): Modular gap between distinct monitoring cards, layout sections, and modal footers.
- `space-xl` (36px): Vertical rhythm spacing between primary dashboard regions.

## Elevation & Depth
Depth in the system is rooted in functional distinction rather than dramatized lighting, ensuring that clinical information remains crisp and unoccluded.

### Surface Hierarchy
1. **Base Layer (Canvas):** Set to `#F6F8FB`. Provides zero-depth separation against which white clinical pods stand out.
2. **Surface Layer (Cards, Sheets):** Pure White (`#FFFFFF`) with a 1px solid border (`#E2E8F0`). Flat elevation by default, establishing a calm, paper-like clinical chart organization.
3. **Interactive Hover Layer:** Elevates slightly with a soft, diffused navy-tinted shadow: `0 4px 12px rgba(16, 38, 61, 0.05)`.
4. **Active Drawers & Modals:** Floated at higher elevation using an ambient shadow: `0 12px 32px rgba(16, 38, 61, 0.10)` bounded by a 1px solid border (`#E2E8F0`).
5. **Floating Critical Alerts:** Urgent patient notifications use a subtle dual-layer shadow: `0 2px 4px rgba(201, 76, 76, 0.08), 0 8px 24px rgba(16, 38, 61, 0.08)`.

## Shapes
The system utilizes a structured, soft-geometry approach (Level 2). This provides accessible, comfortable corners that feel approachable for mothers and clinicians while retaining the order of professional healthcare software.

### Radius Assignments
- **Micro-Badges & Status Chips:** 0.25rem (4px) to 0.5rem (8px), maintaining clean alignment next to tabular figures.
- **Form Controls & Inputs:** 0.5rem (8px) for buttons, select menus, and input fields.
- **Cards & Data Panels:** 0.75rem (12px) to 1rem (16px) bounded with crisp 1px borders.
- **Pill Tags:** Reserved strictly for acute maternal/infant triage tags and active communication presence indicators.

## Components

### Buttons
- **Primary:** Background `#17324D`, foreground `#FFFFFF`, border none, 8px radius. Active state transitions to `#10263D`. Used for definitive actions (e.g., "Assign Care Team", "Save Prescription").
- **Secondary Accent:** Background `#168C88`, foreground `#FFFFFF`. Used for direct patient outreach, Telehealth initiations, and primary care plan transitions.
- **Outline / Ghost:** Background transparent, 1px border `#E2E8F0`, text `#243447`. Hover triggers `#F6F8FB` background.
- **Critical Action:** Background `#C94C4C`, foreground `#FFFFFF`. Used for escalations and code triggers.

### Chips & Micro-Badges
- **Status Badges:** Compact footprint with `label-sm` font.
  - *Stable/Active:* Background `#E7F5F2`, text `#278568`.
  - *Attention Required:* Background `#FEF6E7`, text `#D99A32`.
  - *Critical Triage:* Background `#FDE8E8`, text `#C94C4C`.
- **Metadata Chips:** Pure white background, 1px border `#E2E8F0`, text `#66758A`.

### Lists & Tables
- **Care Coordination Rows:** Pure white background, separated by 1px bottom border `#E2E8F0`. Hover row state uses `#F6F8FB`.
- **Tabular Cells:** Explicit vertical alignment with `font-variant-numeric: tabular-nums` for medical metrics. Padding is fixed at `12px 16px`.

### Checkboxes & Radio Buttons
- **Checkboxes:** 18x18px, 4px corner radius, 1.5px border `#66758A`. Checked state fills with `#168C88` and displays an explicit white tick.
- **Radio Buttons:** 18x18px circular frame. Selected state features a solid 6px `#17324D` center dot with high clearance.

### Input Fields
- **Standard Field:** Background `#FFFFFF`, 1px solid `#E2E8F0`, 8px radius, text `#243447`, placeholder `#66758A`.
- **Focus State:** 1px border `#168C88` accompanied by an accessible glow: `0 0 0 3px rgba(22, 140, 136, 0.15)`.

### Cards & Care Pods
- **Clinical Overview Card:** Pure white `#FFFFFF` surface, 1px outline `#E2E8F0`, 12px corner radius. Sections inside are partitioned via hairline divider rules (`#E2E8F0`).
- **Telemetry Metric Card:** Includes integrated top hairline accent matching state color (e.g., `#168C88` for normal range, `#C94C4C` for critical outlier) with tabular data typography.