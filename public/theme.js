// Sets the theme before the page paints, so dark mode doesn't flash light first.
// A separate file (not inline) so the Content-Security-Policy can stay script-src 'self'.
try {
  const saved = localStorage.getItem("navexa_theme");
  const dark =
    saved === "dark" || saved === "light" ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", dark);
} catch {}
