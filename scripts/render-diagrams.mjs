/**
 * Builds everything from docs/diagrams/*.mmd into docs/diagrams/out (not committed):
 *   svg/     light and dark SVGs, coloured from the app's design tokens
 *   png/     images for places that don't accept SVG
 *   text/    plain-text drawings for terminals, issues and commits
 *   viewer/  self-contained pan and zoom pages
 *   index.html  the project map page, from page.template.html
 *
 * Run with: npm run diagrams
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { renderMermaidASCII, renderMermaidSVG, THEMES } from "zombie-mermaid";

const SOURCE_DIR = "docs/diagrams";
const OUTPUT_DIR = join(SOURCE_DIR, "out");
const CLI = "node_modules/.bin/zombie-mermaid";
const PNG_THEME = "github-light";

const output = (folder, file) => join(OUTPUT_DIR, folder, file);
const escapeHtml = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

// Reads the "r g b" colour tokens from one selector's block in tokens.css.
const tokensCss = readFileSync("src/styles/tokens.css", "utf8");
const readColours = (selector) => {
  const block = tokensCss.slice(tokensCss.indexOf(`${selector} {`));
  const body = block.slice(0, block.indexOf("}"));
  const colours = {};
  for (const [, name, r, g, b] of body.matchAll(/--color-([\w-]+):\s*(\d+) (\d+) (\d+);/g)) {
    colours[name] = `rgb(${r},${g},${b})`;
  }
  return colours;
};

const toTheme = (colours) => ({
  bg: colours.surface,
  fg: colours.ink,
  muted: colours["ink-muted"],
  accent: colours.accent,
  line: colours["line-strong"],
  surface: colours.muted,
  border: colours["line-strong"],
});

const lightColours = readColours(":root");
const appThemes = {
  light: toTheme(lightColours),
  dark: toTheme({ ...lightColours, ...readColours(":root.dark") }),
};

for (const folder of ["svg", "png", "text", "viewer"]) {
  mkdirSync(join(OUTPUT_DIR, folder), { recursive: true });
}

const renderFiles = (name, source, sourcePath) => {
  for (const [themeName, theme] of Object.entries(appThemes)) {
    writeFileSync(output("svg", `${name}.${themeName}.svg`), renderMermaidSVG(source, theme));
  }
  const text = renderMermaidASCII(source, { profile: "markdown" });
  writeFileSync(output("text", `${name}.txt`), text);
  execFileSync(CLI, ["render", sourcePath, "--html", "-o", output("viewer", `${name}.html`), "--force"]);
  execFileSync(CLI, [
    "render",
    sourcePath,
    "--png",
    "-o",
    output("png", `${name}.png`),
    "--theme",
    PNG_THEME,
    "--force",
  ]);
  return text;
};

const names = readdirSync(SOURCE_DIR)
  .filter((file) => file.endsWith(".mmd"))
  .map((file) => basename(file, ".mmd"));

// The page inlines one SVG per diagram. Its colours are CSS variables, so the page can switch theme live.
const figures = {};
for (const name of names) {
  const sourcePath = join(SOURCE_DIR, `${name}.mmd`);
  const source = readFileSync(sourcePath, "utf8");
  const text = renderFiles(name, source, sourcePath);
  figures[name] = {
    svg: renderMermaidSVG(source),
    extras: `<div class="extras"><a href="viewer/${name}.html">Open with zoom</a><details><summary>Text version</summary><pre>${escapeHtml(text)}</pre></details></div>`,
  };
}

// "Mono" sets only two colours, and the diagrams derive the rest from them.
const pageThemes = { ...THEMES, mono: { bg: "#ffffff", fg: "#1a1f36" } };
const themeOptions = ["navexa", ...Object.keys(pageThemes)]
  .map((name) => `<option value="${name}">${name === "navexa" ? "Navexa (follows page)" : name}</option>`)
  .join("");

const used = new Set();
const page = readFileSync(join(SOURCE_DIR, "page.template.html"), "utf8")
  .replace(/<figure( class="wide")?>\s*<!--diagram:([\w-]+)-->\s*<\/figure>/g, (_, wide = "", name) => {
    if (!figures[name]) throw new Error(`The page uses a diagram that does not exist: ${name}`);
    used.add(name);
    return `<figure${wide}>${figures[name].svg}</figure>${figures[name].extras}`;
  })
  .replace("<!--theme-options-->", themeOptions)
  .replace("/*themes*/{}", JSON.stringify(pageThemes));

const unused = names.filter((name) => !used.has(name));
if (unused.length) throw new Error(`Diagrams missing from the page: ${unused.join(", ")}`);

writeFileSync(join(OUTPUT_DIR, "index.html"), page);
console.log(`Rendered ${names.length} diagrams to ${OUTPUT_DIR}`);
