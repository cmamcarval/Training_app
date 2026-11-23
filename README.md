# Crux Cycle

Mobile-first climbing training PWA built from the revised 24-week plan. It runs on GitHub Pages, uses Firebase email/password authentication, and syncs each user's training data through Cloud Firestore.

## Run locally

```bash
npm install
npm run dev
```

Open the local address shown in the terminal. Use `npm run build` for a production build and `npm test` for the source and rendering checks.

## Product rules

- The checked-in plan in `lib/plan.ts` is immutable reference data.
- Completed, partial, skipped, and unscheduled sessions are saved separately in IndexedDB.
- Signed-in data is mirrored to `users/{uid}/app/state` in Firestore and protected by the checked-in rules.
- Each signed-in account can only read and write its own training data.
- Backup and restore use a versioned JSON file.
- Fingerboard loads are stored per hand. Historical Tindeq values are reference-only.
- No session or load is adjusted automatically.

## Installation

- iPhone/iPad: open in Safari, Share, Add to Home Screen, and enable Open as Web App.
- Android: open in Chrome and choose Install app.
- macOS Sonoma or later: open in Safari and choose Add to Dock.

## Deployment

Pushes to `main` deploy through `.github/workflows/pages.yml` to <https://cmamcarval.github.io/Training_app/>. The Firebase project must keep Email/Password enabled and `cmamcarval.github.io` in Authentication's authorized domains. Publish `firestore.rules` before using the app.
