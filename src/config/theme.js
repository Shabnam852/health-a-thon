export const THEME_KEY = "navexa_theme";

// A saved choice wins. Without one, follow the device setting.
export const resolveTheme = (saved, prefersDark) => {
  if (saved === "dark" || saved === "light") return saved;
  return prefersDark ? "dark" : "light";
};
