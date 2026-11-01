# Navexa Health — Responsive Design & Layout Architecture Specification

**Document:** `docs/RESPONSIVE_DESIGN_SPEC.md`  
**Version:** 3.1.0  
**Status:** IMPLEMENTED & VERIFIED  
**Architect:** UX & Accessibility Specialist, Frontend Lead  

---

## 1. Visual Identity & Google Stitch Token Integration

Navexa Health is styled in strict accordance with the Google Stitch Material 3 design tokens defined in `docs/design.md` and extracted from `docs/stitch-source/`. The visual architecture ensures an authoritative, clinical yet compassionate aesthetic optimized for intensive desktop clinical triage and mobile patient/navigator field coordination.

### 1.1 Color Palette & Semantic Tokens
| Token | Hex / Class | Semantic Usage |
| :--- | :--- | :--- |
| **Deep Navy (Brand Dark)** | `#001D36` / `bg-[#001D36]` | Primary sidebar, executive headers, high-contrast modal backdrops. |
| **Primary Teal (Clinical Action)** | `#006A67` / `text-[#006A67]` | Positive clinical actions, active navigation items, progress lifelines, primary CTAs. |
| **Teal Light (Tint)** | `#E6F4F1` / `bg-[#006A67]/10` | Badges, highlighted rows, subtle card accents. |
| **Critical Red (STAT / Emergency)** | `#BA1A1A` / `bg-rose-600` | STAT urgency badges, transport disruption alerts, severe preeclampsia flags, bed saturation. |
| **Urgent Amber (Warning)** | `#D97706` / `bg-amber-600` | 2-hour urgency triage, pending driver assignments, open socioeconomic barriers. |
| **Routine / Subdued Slate** | `#4B5563` / `text-slate-600` | Standard follow-up appointments, secondary labels, timestamp footnotes. |
| **Surface Background** | `#F8F9FA` / `bg-slate-50` | Primary application canvas background, reducing visual glare during long clinical shifts. |
| **Surface Card** | `#FFFFFF` / `bg-white` | Elevated clinical cards, table containers, modal bodies with `border border-slate-200/80 shadow-sm`. |

### 1.2 Typography
- **Headings & Brand Title:** `Plus Jakarta Sans`, sans-serif (Weights: 600 Semi-Bold, 700 Bold). Used for platform branding, page headers, metric numerals, and modal titles.
- **Body & Clinical Data Density:** `Inter`, sans-serif (Weights: 400 Regular, 500 Medium, 600 Semi-Bold). Used for tabular clinical metrics, timestamps, audit trails, and narrative text for optimal legibility at small sizes ($11\text{px} - 14\text{px}$).

---

## 2. Desktop Layout Architecture & Correction of Previous Flaws

### 2.1 The Previous Layout Defect (Root-Cause Analysis)
In previous revisions, desktop content appeared excessively offset towards the right/center with a gigantic empty space on the left:
- **The Double Padding Bug:** The desktop sidebar occupied $288\text{px}$ (`w-72`) in normal flex document flow, but the main content container was simultaneously given `lg:pl-72` ($288\text{px}$). This created an unintended $576\text{px}$ left margin before any content began!
- **Narrow Container Constraint:** Pages wrapped content in rigid `max-w-7xl mx-auto` (1280px), centering themselves within the residual right-hand space and crushing 6-column KPI cards and multi-column tables.

### 2.2 Corrected Stable Desktop Architecture
The corrected layout implements a rock-solid, fixed-sidebar + sticky-header + independently scrolling main workspace:

```
┌─────────────────────────────────────────────────────────────┐
│ Fixed Header (h-16, left: 0 [mobile] / left: 270px [desktop])│
├────────────────┬────────────────────────────────────────────┤
│                │                                            │
│ Fixed Sidebar  │       Scrollable Main Workspace            │
│ (w-[270px],    │       (lg:pl-[270px], pt-16)               │
│  inset-y-0,    │       - Starts immediately after sidebar   │
│  z-30, fixed,  │       - Zero double-padding                │
│  scrollable nav│       - Fluid max-w-[1600px] container     │
│  stationary)   │       - Rebalanced 8:4 / 9:3 split columns │
│                │                                            │
└────────────────┴────────────────────────────────────────────┘
```

### 2.3 Layout Dimensions & Proportions
- **Sidebar Width:** Fixed at `270px` (`w-[270px]`), stationary on desktop (`fixed inset-y-0 left-0 z-30`). The sidebar has independent `overflow-y-auto` for long navigation lists while the application canvas remains fixed.
- **Header Height:** Fixed at `64px` (`h-16`), aligning on desktop to `lg:left-[270px]` and `right-0`.
- **Main Workspace Offset:** `lg:pl-[270px]` with `pt-16`. The workspace starts **immediately** at the edge of the sidebar.
- **Horizontal Workspace Padding:** `px-4 sm:px-6 lg:px-8` ($16\text{px}$ to $32\text{px}$).
- **Page Container Max Width:** Expanded to `max-w-[1600px] mx-auto w-full`, allowing full, balanced usage of wide monitors ($1280\text{px}$, $1366\text{px}$, $1440\text{px}$, $1920\text{px}$) without awkward empty gaps.
- **KPI Ribbon Reflow:** `grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4`. Reflows into 3 generous columns on medium screens and 6 spacious columns on desktop.
- **Main Split Columns:** `grid grid-cols-1 xl:grid-cols-12 gap-6 items-start`. Left work queue receives `xl:col-span-8 2xl:col-span-9`, right triage drawer receives `xl:col-span-4 2xl:col-span-3`, creating a harmonious 66:33 to 75:25 ratio.

---

## 3. Tablet Responsive Architecture ($768\text{px} - 1023\text{px}$)

- **Sidebar:** Collapses into a responsive slide-over drawer triggered by the header hamburger button.
- **Split Grids:** 2-column or 3-column card layouts (`grid-cols-1 md:grid-cols-2` or `sm:grid-cols-3`).
- **Data Tables:** Priority queue table encased in `<div className="overflow-x-auto">` with `min-w-[700px]`, allowing clean horizontal touch swipe without squishing table headers or badges.
- **Split Panels:** Two-column split layouts (such as Coordinator Work Queue + Triage Drawer) stack vertically on tablet, placing the primary queue on top and secondary escalations below.

---

## 4. Mobile Responsive Architecture ($320\text{px} - 767\text{px}$)

### 4.1 Mobile Header & Navigation Drawer
- **Header:** Persistent sticky bar with:
  - Accessible hamburger button (`menu`) on the far left.
  - Responsive search input adapted for small viewports.
  - Notification center bell with unread badge.
  - Active role avatar pill.
- **Modal Drawer Panel:**
  - Slides in from left (`w-[280px] max-w-[85vw] h-full bg-surface-container-lowest shadow-2xl z-50`).
  - Dark backdrop overlay (`bg-black/50 backdrop-blur-xs`).
  - Displays **only the active role's navigation items** (derived from `getNavigationForRole`).
  - Active link highlighted with Stitch primary pill and filled icon.
  - Automatically closes upon navigation link tap (`onNavigate`).
  - Dismisses on backdrop touch or `Escape` key press.
  - Enforces body scroll lock (`document.body.style.overflow = "hidden"`) while open.

### 4.2 Mobile Touch & Layout Ergonomics
- **Touch Targets:** All interactive links, buttons, and status chips enforce a minimum touch area of $\ge 44\text{px} \times 44\text{px}$.
- **Patient Journey Lifeline:** Reflows into a single-column vertical timeline with large touch targets, 1-tap phone dialer links (`tel:108`, `tel:navigator`), and prominent driver vehicle updates.
- **No Horizontal Viewport Blowout:** Zero `overflow-x` on page body; table containers scroll independently inside dedicated wrapper cards.
