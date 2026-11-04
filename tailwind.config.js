const color = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

// Names shared by text, borders and icons. Values live in src/styles/tokens.css.
const colors = Object.fromEntries(
  [
    "canvas",
    "surface",
    "muted",
    "subtle",
    "subtle-strong",
    "line",
    "line-strong",
    "ink",
    "ink-muted",
    "brand",
    "brand-hover",
    "on-fill",
    "on-fill-muted",
    "accent",
    "accent-soft",
    "danger",
    "danger-soft",
    "danger-strong",
    "warning",
    "warning-soft",
    "caution",
    "caution-soft",
    "highlight",
    "on-highlight",
    "focus",
  ].map((name) => [name, color(name)]),
);

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors,
      // bg-accent and bg-danger are solid fills for white text, so they differ from
      // text-accent and text-danger, which must stay readable on the page.
      backgroundColor: {
        accent: color("accent-fill"),
        "accent-hover": color("accent-fill-hover"),
        danger: color("danger-fill"),
        "danger-hover": color("danger-fill-hover"),
      },
      accentColor: { control: color("accent-fill") },
      borderRadius: { control: "var(--radius-control)", card: "var(--radius-card)", pill: "var(--radius-pill)" },
      boxShadow: { card: "var(--shadow-card)", raised: "var(--shadow-raised)", overlay: "var(--shadow-overlay)" },
      spacing: {
        sidebar: "var(--size-sidebar)",
        drawer: "var(--size-drawer)",
        header: "var(--size-header)",
        tabbar: "var(--size-tabbar)",
        control: "var(--size-control)",
        "control-sm": "var(--size-control-sm)",
      },
      minHeight: {
        control: "var(--size-control)",
        "control-sm": "var(--size-control-sm)",
        tabbar: "var(--size-tabbar)",
      },
      minWidth: { control: "var(--size-control)" },
      fontFamily: { display: "var(--font-display)", sans: "var(--font-sans)" },
    },
  },
};
