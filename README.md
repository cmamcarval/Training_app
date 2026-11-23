# Crux Cycle

Mobile-first, offline-capable climbing training PWA built from the revised 24-week plan.

## Run locally

```bash
npm install
npm run dev
```

Open the local address shown in the terminal. Use `npm run build` for a production build and `npm test` for the source and rendering checks.

## Product rules

- The checked-in plan in `lib/plan.ts` is immutable reference data.
- Completed, partial, skipped, and unscheduled sessions are saved separately in IndexedDB.
- Backup and restore use a versioned JSON file.
- Fingerboard loads are stored per hand. Historical Tindeq values are reference-only.
- No session or load is adjusted automatically.

## Installation

- iPhone/iPad: open in Safari, Share, Add to Home Screen, and enable Open as Web App.
- Android: open in Chrome and choose Install app.
- macOS Sonoma or later: open in Safari and choose Add to Dock.
