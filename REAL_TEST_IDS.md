# Real Ticket IDs For Verification

Use these ticket IDs in the app to verify commit lookup and AI explanation:

- `REAL-101`
- `REAL-102`
- `REAL-103`
- `DEMO-777`

Verification checklist:

1. Start app with `npm run dev`.
2. Enter one ID from the list above.
3. Click **Analyze Ticket**.
4. Confirm `Data Source` is `github` (if commit is in remote repo) or `local` (if only local commit exists).
5. If GitHub/Gemini are unavailable, fallback analysis still returns structured sections and a `confidence` hint.
