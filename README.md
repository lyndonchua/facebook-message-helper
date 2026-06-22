# Facebook Message Helper

A Vite React app for pasting/importing Facebook messages, viewing original and translated messages in mirrored panels, generating reply suggestions, and saving chat records to Firebase Firestore.

## Setup

```bash
npm install
npm run dev
```

## Firebase

Firebase config has been added in `src/main.jsx`. The app uses Firestore collection `threads`.

If saving/loading fails, check Firestore rules. For testing, allow authenticated or temporary development access in Firebase Console.
