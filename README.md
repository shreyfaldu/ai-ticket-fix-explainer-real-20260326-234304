# AI Ticket Fix Explainer

Small demo-ready Next.js application for hackathon presentations.

The app lets you enter a ticket ID (for example, `OTHK-221`) and get a structured explanation of what was fixed, where it changed, and why the fix works.

## Demo Flow

1. Enter a ticket ID.
2. Click **Analyze Ticket**.
3. App tries to find a matching commit in your GitHub repo first.
4. If GitHub is not configured or no match is found, it falls back to mock ticket data.
5. App sends commit message + diff to AI.
6. Result shows:
	- Problem Description
	- Root Cause
	- Fix Applied
	- Summary
	- Files Changed

## Included Mock Tickets

- `OTHK-221`
- `PAY-902`
- `CFG-114`

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## AI Setup (Gemini)

Create `.env.local`:

```bash
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
```

If no AI key is provided, the app still works using a deterministic fallback analyzer so your demo never breaks.

## GitHub Setup (For Real Repository Data)

Create or update `.env.local`:

```bash
GITHUB_OWNER=your-github-username-or-org
GITHUB_REPO=your-repo-name
GITHUB_TOKEN=your_github_pat
```

Token notes:

- For private repos, use a PAT with `repo` read access.
- For public repos, minimal read scopes are enough.

How lookup works:

1. Enter ticket ID, for example `OTHK-221`.
2. API scans recent commits in `GITHUB_OWNER/GITHUB_REPO` for commit messages containing that ticket ID.
3. It fetches commit files + patches and runs AI analysis.

## How To Verify It Is Using GitHub

1. Set valid `GITHUB_OWNER`, `GITHUB_REPO`, and `GITHUB_TOKEN`.
2. Use a ticket ID that appears in a real commit message in that repo.
3. Analyze in UI and check `Data Source` in Ticket Details.
4. If it shows `github`, the app is reading real GitHub commit data.
5. If it shows `mock`, either env vars are missing/invalid or no commit matched that ticket ID.

## Tech

- Next.js (App Router, TypeScript)
- API route at `src/app/api/analyze/route.ts`
- Mock dataset in `src/data/mockTickets.ts`
