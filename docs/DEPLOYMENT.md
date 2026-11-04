# Deploying to Vercel

GitHub Actions deploys the app to a private Vercel project (`.github/workflows/vercel.yml`).

| Event                               | Checks (tests, lint, diagrams, build, gitleaks) | Deploy     |
| :---------------------------------- | :---------------------------------------------- | :--------- |
| Push to `main`                      | Yes                                             | Production |
| Push to another branch in this repo | Yes                                             | Preview    |
| Pull request from a fork            | Yes                                             | None       |

A deploy only runs if the checks pass. If gitleaks finds a secret, rotate it, because deleting it from the code leaves it in git history. Vercel's own Git deploys are turned off in `vercel.json`, so each push deploys once.

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

3. Add the AI keys. In the Vercel dashboard, open **Settings > Environment Variables** and add `ANTHROPIC_API_KEY` (Claude) and `SARVAM_API_KEY` (speech and translation) for the Production and Preview environments. They are read only by the functions in `api/`, never by the browser. Without them the AI features show "AI isn't set up yet." and the rest of the app still works.

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
- For local work, copy `.env.example` to `.env` and add the two keys. `npm run dev` serves the AI routes too. `.env` is git-ignored: never commit it.
- Workflows in a fork skip the deploy job, because it only runs in `Shabnam852/health-a-thon`. If the repo moves, update that name in the workflow.
- The Vercel CLI version is pinned in the workflow. Update it there when upgrading.
