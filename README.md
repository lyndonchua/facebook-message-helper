# Facebook Message Helper

Safe Facebook chat helper for paste/import workflows.

## Updated features
- Original and translated panels mirror each message side by side.
- Dates/times are removed during paste import.
- Duplicate pasted messages are skipped.
- Old chats can be removed individually or all at once.
- Firebase auto-save is ongoing.
- Better translation workflow:
  - Uses `/api/translate` with OpenAI when deployed on Vercel with `OPENAI_API_KEY` set as an environment variable.
  - No API entry field appears in the app.
  - Falls back to improved local translations when the API key is not configured.

## Vercel setup for full AI translation
Add this environment variable in Vercel:

`OPENAI_API_KEY=your_key_here`

Then redeploy.
