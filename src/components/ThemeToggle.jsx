import { useEffect, useState } from "react";
import { resolveTheme, THEME_KEY } from "../config/theme.js";
import { Button, Icon } from "./ui/index.js";

const THEME_COLORS = { light: "#f6f8fa", dark: "#0d121e" };
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
  const [theme, setTheme] = useState(() =>
    resolveTheme(readSaved(), window.matchMedia("(prefers-color-scheme: dark)").matches),
  );
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  }, [theme, isDark]);

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

  return (
    <Button
      onClick={toggle}
      aria-pressed={isDark}
      aria-label="Dark mode"
      title="Dark mode"
      fullWidth={fullWidth}
      size={iconOnly ? "icon" : "md"}
    >
      <Icon name={isDark ? "dark_mode" : "light_mode"} />
      {!iconOnly && "Dark mode"}
    </Button>
  );
};

export default ThemeToggle;
