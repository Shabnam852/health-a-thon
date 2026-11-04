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

`.env` holds two keys, `ANTHROPIC_API_KEY` and `SARVAM_API_KEY`. They are used only by the server code and never reach the browser. `.env` is git-ignored: never commit it. Restart `npm run dev` after changing it.

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

- **Front end:** React 18, Vite, Tailwind, React Router. Saved in the browser (`localStorage`), so each browser has its own demo data. **Reset demo** in the sidebar starts it again.
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
