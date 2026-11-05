import { useEffect, useState } from "react";
import { THEME_KEY } from "../config/theme.js";
import { Button, Icon } from "./ui/index.js";

// The browser bar matches the page canvas, read from the canvas token (tokens.css) so no colour is copied here.
// The token holds RGB channels ("247 244 240").
const canvasColor = () => {
  const channels = getComputedStyle(document.documentElement).getPropertyValue("--color-canvas").trim();
  return channels ? `rgb(${channels.split(/\s+/).join(", ")})` : null;
};
// The desktop sidebar stays mounted behind the phone drawer, so toggles must keep each other in step.
const THEME_CHANGED = "navexa-theme-changed";

const readSaved = () => {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
};

const save = (theme) => {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private windows can block storage. The theme still applies until reload.
  }
};

const ThemeToggle = ({ fullWidth = false, iconOnly = false }) => {
  // Start from the class index.html already set: a toggle mounted later (the phone drawer) must not undo a
  // choice that could not be saved, which re-resolving from storage and the device setting would do.
  const [theme, setTheme] = useState(() => (document.documentElement.classList.contains("dark") ? "dark" : "light"));
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    const color = canvasColor();
    if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  }, [isDark]);

  // Follow the device until the person makes their own choice.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      if (!readSaved()) setTheme(e.matches ? "dark" : "light");
    };
    const handleToggled = (e) => setTheme(e.detail);
    media.addEventListener("change", handleChange);
    window.addEventListener(THEME_CHANGED, handleToggled);
    return () => {
      media.removeEventListener("change", handleChange);
      window.removeEventListener(THEME_CHANGED, handleToggled);
    };
  }, []);

  const toggle = () => {
    const next = isDark ? "light" : "dark";
    save(next);
    window.dispatchEvent(new CustomEvent(THEME_CHANGED, { detail: next }));
  };

  // The button names what it switches to, so it never reads "Dark mode" while dark mode is on.
  const label = isDark ? "Light mode" : "Dark mode";
  return (
    <Button
      onClick={toggle}
      aria-label={`Switch to ${label.toLowerCase()}`}
      title={`Switch to ${label.toLowerCase()}`}
      fullWidth={fullWidth}
      size={iconOnly ? "icon" : "md"}
    >
      <Icon name={isDark ? "light_mode" : "dark_mode"} />
      {!iconOnly && label}
    </Button>
  );
};

export default ThemeToggle;
