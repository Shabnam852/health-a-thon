# Deploying to Vercel

GitHub Actions deploys the app to a private Vercel project (`.github/workflows/vercel.yml`).

| Event                               | Checks (tests, lint, package age, build, gitleaks) | Deploy     |
| :---------------------------------- | :---------------------------------------------- | :--------- |
| Push to `main`                      | Yes                                             | Production |
| Push to another branch in this repo | Yes                                             | Preview    |
| Pull request from a fork            | Yes                                             | None       |

A deploy only runs if the checks pass. If gitleaks finds a secret, rotate it, because deleting it from the code leaves it in git history. `vercel.json` leaves Vercel's own Git deploys on, so a project imported from GitHub also deploys each push by itself.

## Running your own copy

Anyone can import this repo into their own Vercel project, with no secrets or setup. It runs with no environment variables: every screen works, the AI features show "AI isn't set up yet.", and with no database each browser keeps its own copy of the data. Add `ANTHROPIC_API_KEY` and `SARVAM_API_KEY` for the AI (each works on its own, see the README), and connect Neon Postgres from the Vercel Marketplace so every device shares one copy.

## One-time setup

The repo owner does this once. The order matters: a new project's first deployment is always production, so turn on protection before it runs.

1. Install the CLI and link the project from the repo root:

   ```bash
   npm install --global vercel@65.9.0
   vercel login
   vercel link
   ```

   Choose to create a new project. This writes `.vercel/project.json`, which is ignored by git.

2. Make the site private. In the Vercel dashboard, open the project, then **Settings > Deployment Protection**:
   - Turn on **Vercel Authentication**.
   - Set the scope to **All Deployments**. **Standard Protection** leaves the production domain public.

3. Add the AI keys. In the Vercel dashboard, open **Settings > Environment Variables** and add `ANTHROPIC_API_KEY` (Claude) and `SARVAM_API_KEY` (speech and translation) for the Production and Preview environments. They are read only by the functions in `api/`, never by the browser. Each works on its own: with only the Claude key the typed AI features work and voice is off. Without either, the AI features show "AI isn't set up yet." and the rest of the app still works.

4. Create a token at https://vercel.com/account/tokens.

5. In GitHub, open **Settings > Secrets and variables > Actions** and add these repository secrets:

   | Secret              | Value                                 |
   | :------------------ | :------------------------------------ |
   | `VERCEL_TOKEN`      | The token from step 4                 |
   | `VERCEL_ORG_ID`     | `orgId` in `.vercel/project.json`     |
   | `VERCEL_PROJECT_ID` | `projectId` in `.vercel/project.json` |

6. Run the first deploy: open **Actions > CI and Vercel deploy > Run workflow** on `main`, or push to `main`.

7. Open the production URL in a private window. It should ask for a Vercel login.

## Who can view the site

- The Vercel account owner and any project members.
- Anyone with a Shareable Link, created from the deployment's share menu. Anyone holding the link gets in, so revoke it when it's no longer needed.
- A logged-in Vercel user who requests access and is approved. The Hobby plan allows one such external user per account.

## Notes

- The app is a single page app. The rewrite in `vercel.json` sends every path except `/api/` to `index.html`, so direct links such as `/patient?view=transit` load.
- The AI routes (`/api/assistant`, `/api/assistant/speak`, `/api/ai/handoff`, `/api/ai/referral-draft`) are Vercel functions in `api/`, which call the shared handlers in `server/`. Each function may run for up to 60 seconds (`vercel.json`).
- For local work, `npm run dev` needs no `.env`. To try the AI, copy `.env.example` to `.env` and add either key or both. `npm run dev` serves the AI routes too. `.env` is git-ignored: never commit it.
- The deploy job only runs in `Bougerous/health-a-thon`, the team's own fork, which holds the Vercel secrets. Workflows anywhere else, including `Shabnam852/health-a-thon`, run the checks and skip the deploy. If the repo moves, update that name in the workflow.
- `vercel.json` sends security headers on every response: a Content-Security-Policy that only allows the site itself (plus the OpenStreetMap embed in a frame, and `data:`/`blob:` for images and the assistant's audio), HSTS with preload, `nosniff`, `X-Frame-Options: DENY`, a referrer policy, a Permissions-Policy that allows only the microphone (plus autoplay and fullscreen for the site itself), `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy` set to `same-origin`, `X-Permitted-Cross-Domain-Policies: none`, `X-DNS-Prefetch-Control: off` and `Origin-Agent-Cluster`. `/api/` answers are also sent `Cache-Control: no-store`. `server/securityHeaders.test.js` fails if any of these is removed or loosened, or if `index.html` gains an inline script. Keep scripts and styles in files: an inline `<script>` or `<style>` is blocked. That is why the theme script is `public/theme.js`. A new outside service (an API, font or embed) needs its own entry in the policy.
- The build has no source maps, and the browser bundle holds no keys or server code. The keys are read only in `server/`, which runs as Vercel functions.
- The Vercel CLI version and every action are pinned in the workflow, the actions to a commit SHA with the tag in a comment. When upgrading, pick a release at least 14 days old and update the SHA.
- `.npmrc` sets `ignore-scripts=true`, so no package install script runs in CI or on Vercel, where the deploy token is in the environment. A new dependency that needs one has to be allowed on purpose.
- Anyone with write access to the fork can deploy, and could change the workflow to read the secrets. Keep collaborators to the team.
- Repo settings (set once on GitHub): the repo is private, the workflow token is read-only, Actions are limited to GitHub's own and gitleaks and must be pinned to a SHA, and Dependabot alerts are on. Branch protection needs GitHub Pro on a private repo, so `main` is protected only by who has write access.
