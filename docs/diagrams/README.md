# Diagrams

The `.mmd` files here are the source for the project map. They are drawn from the code, so update them when a flow changes.

| Command                  | What it does                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `npm run diagrams`       | Builds the page, SVG, PNG, text and zoom versions into `out/`, which is not committed |
| `npm run diagrams:check` | Validates every diagram. CI runs this too                                             |
| `npm run diagrams:web`   | Opens zombie-mermaid's live editor                                                    |

Open `out/index.html` to see the page. `page.template.html` holds its text.

The numbers in `15-demo-status`, `16-tests` and `18-demo-barriers` are typed in by hand, measured on 2 November 2026. The positions in `17-priorities` are estimates.

zombie-mermaid needs Node 24 or newer, and is a dev dependency only: the app itself doesn't load it.
