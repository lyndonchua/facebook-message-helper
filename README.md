# Facebook Message Helper

Vite React app for pasted Facebook chats.

## Updated

- Original and translation panels stay side by side and mirror each message row.
- Pasted Facebook dates/times are removed automatically.
- Demo/Melaka references removed.
- Firebase config is included.
- Saving is automatic and ongoing to Firestore collection `threads`.
- The green manual save button has been removed.
- English translation now includes the common Chinese/pinyin phrases used in the pasted chat.

## Run

```bash
npm install
npm run dev
```

If Firebase loading/saving fails, check Firestore rules in Firebase Console.
