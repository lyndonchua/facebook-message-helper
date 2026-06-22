# Facebook Message Helper

Safe Facebook chat helper for paste/import workflows.

## Current build
- Original and translated panels mirror each message side by side.
- Controls, import, delete, reply helper and summary stay on the left panel.
- Dates/times are removed during paste import.
- Duplicate pasted messages are skipped.
- Old chats can be removed individually or all at once.
- Firebase auto-save is ongoing.
- No API entry appears in the app.
- The app calls `/api/translate` for real AI translation when deployed on Vercel with `OPENAI_API_KEY`.
- If the AI endpoint is unavailable, it uses a cleaner local fallback and never shows `Translation needs online AI` in the chat panel.

## Tested fallback lines
- 为什么今天有空 → Why are you free today?
- 空每天都有 → There is always free time every day.
- 今天看起来有点不一样 → You seem a little different today.
- 那里不一样？ → What is different?
- 好像很冷 → It seems quite cold.
- 对美女没有兴趣吗？ → Are you not interested in beautiful women?

## Vercel setup for full AI translation
Add this environment variable in Vercel:

`OPENAI_API_KEY=your_key_here`

Then redeploy.
