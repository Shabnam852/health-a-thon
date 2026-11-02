/**
 * Validates every docs/diagrams/*.mmd file, and any mermaid block in the docs.
 * Exits non-zero on the first invalid diagram, so CI can run it.
 * Run with: npm run diagrams:check
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CLI = "node_modules/.bin/zombie-mermaid";
const SOURCE_DIR = "docs/diagrams";

const sources = readdirSync(SOURCE_DIR).filter((file) => file.endsWith(".mmd"));
for (const file of sources) {
  execFileSync(CLI, ["validate", join(SOURCE_DIR, file)], { stdio: "inherit" });
}

const markdown = readdirSync("docs")
  .filter((file) => file.endsWith(".md"))
  .map((file) => join("docs", file))
  .filter((file) => readFileSync(file, "utf8").includes("```mermaid"));
if (markdown.length) execFileSync(CLI, ["--check", ...markdown], { stdio: "inherit" });

console.log(`${sources.length} diagrams and ${markdown.length} Markdown files are valid`);
