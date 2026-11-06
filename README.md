# Navexa Health

Navexa helps a pregnant woman or a newborn get from a small clinic to the right hospital in India, and stay looked after for 42 days afterwards. It is a working demo built for a health hackathon. All patients in it are made up.

## Who uses it

| Role                   | What they do                                                                                                                                       | Home screen    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **Care coordinator**   | Sees every referral, clears problems that stop a family getting to hospital (money, transport, language), books the van, runs the 42-day follow-up | `/coordinator` |
| **Hospital**           | Sends new referrals, acknowledges or declines referrals coming in, confirms when the patient arrives, records the outcome                          | `/facility`    |
| **Patient and family** | Follows their journey, tracks the van, sees what to bring, chooses their hospital, asks for help in their own language                             | `/patient`     |

Pick a role on the start page (`/`). The **Demo only: view as** menu at the bottom of the sidebar switches roles at any time.

## Try the guided demo

The start page has a five-step guided story that follows one patient:

1. Accepted, not yet arrived
2. Clear the transport barrier
3. Hospital confirms arrival
4. What the family sees
5. Follow-up after discharge

A bar at the bottom of the screen moves you through it with **Back** and **Next**. **Exit demo** on the bar leaves the story.

## AI features

All three need API keys (see [Set up](#set-up)). Without them they show "AI isn't set up yet." and the rest of the app works as normal.

- **Fill with AI** (Hospital, on **New referral**). Type a note, record speech or photograph a paper referral slip, in any mix. The AI fills the empty fields and shows the exact words each value came from. It never overwrites what you typed: if it reads something different it offers "Use this" or "Keep mine". It never sets how urgent the referral is, and you must tick that you checked every field before sending.
- **Handoff summary** (staff, on any case page). The AI writes a short summary for the receiving hospital. Names, phone numbers and addresses are taken out before the AI sees the case. Hospital staff sign it off with their name.
- **Family assistant** (Patient, **Get help**). Answers questions about the visit in the family's language and can read the answer aloud. If the family mentions a danger sign, or a problem getting to hospital, it alerts their care coordinator. It never diagnoses.

The demo allows 20 AI uses per browser. Each one calls Claude (Anthropic); speech and translation use Sarvam.

## Set up

You need Node.js 24 or later.

```bash
npm install
cp .env.example .env    # then add your keys to .env
npm run dev             # http://localhost:5173
```

`.env` holds `ANTHROPIC_API_KEY` and `SARVAM_API_KEY`, plus `DATABASE_URL` for Neon (without it, `npm run dev` keeps the shared data in memory). They are used only by the server code and never reach the browser. `.env` is git-ignored: never commit it. Restart `npm run dev` after changing it.

## Commands

| Command            | What it does                                |
| ------------------ | ------------------------------------------- |
| `npm run dev`      | Runs the app locally, with the AI routes    |
| `npm test`         | Runs the tests (`node --test`)              |
| `npm run lint`     | oxlint and Biome; fails on any warning      |
| `npm run fix`      | Fixes what the linters can fix on their own |
| `npm run build`    | Builds the site into `dist/`                |
| `npm run deps:age` | Checks every package is at least 14 days old |

## How it is built

- **Front end:** React 19, Vite 8, Tailwind 4, React Router 7.
- **Saved data:** one shared copy in Neon Postgres, through `/api/state` (`server/state.js`). Every browser loads it on start and checks for changes every 3 seconds while the tab is visible, so a hospital laptop and a family phone see the same referrals. Two saves at once are merged referral by referral. Each browser also keeps a copy in `localStorage` and carries on with it if the server can't be reached. **Reset demo** in the sidebar starts everyone again. There is no sign-in check on `/api/state`, which is fine only because all the data is made up.
- **Phone sign-in for new referrals:** sending a referral links the patient's mobile and the emergency contact's mobile, so they can sign in with a code and see that referral (`src/domain/phoneAccounts.js`).
- **Self-registration:** on the sign-in screen, an unknown number is offered **Create an account** (code, name, who they are, and an optional referral number from the slip). If their mobile is the one on that referral, it opens at once. If not, the care coordinator sees **Families asking to be linked** on their dashboard, calls to check, and approves or declines. Until then the account sees only a waiting screen, with no case details (`src/domain/selfRegistration.js`).
- **Rules:** referral steps, alarms, follow-up plans and hospital choice are plain functions in `src/domain/`, with tests beside them.
- **AI server:** small request handlers in `server/`, served by Vercel functions in `api/` and by Vite in development.
- **Design:** calm, plain screens in the style of public health services, with colour tokens and 7:1 contrast. Rules are in `.claude/skills/navexa-ui/SKILL.md`.

## Deploying

Pushes to `main` deploy to production on Vercel, and other branches get a preview, through GitHub Actions after tests, lint and a secret scan pass. Add the two API keys to the Vercel project's environment variables. Details are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## More documents

- [Architecture](docs/ARCHITECTURE.md)
- [Workflow](docs/WORKFLOW_SPECIFICATION.md) and [referral lifecycle](docs/REFERRAL_LIFECYCLE_AUDIT.md)
- [Screens by role](docs/ROLE_NAVIGATION_SPEC.md)
- [Data model](docs/DATA_MODEL.md)
- [Security and clinical safety](docs/SECURITY_AND_CLINICAL_SAFETY_AUDIT.md)
- [Accessibility](docs/ACCESSIBILITY.md)
