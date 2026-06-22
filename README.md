# Facebook Message Helper

A practical starter app for helping with Facebook/Messenger replies.

Important limitation: Meta does not provide a normal API for reading your personal Facebook/Messenger inbox. The official Messenger Platform is for Facebook Pages / business accounts, not personal inbox scraping. This starter therefore uses:

1. Desktop browser extension: reads only the Messenger chat text visible on your screen.
2. Mobile approach: pair this web app with an Android Notification Listener app if you want automatic capture from phone notifications.
3. Optional server API: sends text to OpenAI for translation and reply suggestions.

## Folders

- `webapp/` — main dashboard for translation + reply suggestions.
- `desktop-extension/` — Chrome/Edge extension that captures visible Messenger/Facebook message text and sends it to the webapp.
- `server/` — optional Node server so your API key stays hidden.

## Quick Start

### 1. Run the web app
Open `webapp/index.html` directly in a browser, or host it on Vercel.

### 2. Run the server
```bash
cd server
npm install
cp .env.example .env
# Add your OpenAI API key inside .env
npm run dev
```
The web app expects the server at `http://localhost:8787` by default.

### 3. Install the desktop extension
1. Open Chrome or Edge.
2. Go to `chrome://extensions`.
3. Turn on Developer Mode.
4. Click Load unpacked.
5. Select the `desktop-extension` folder.
6. Open Messenger/Facebook messages in the browser.
7. Click the extension button → Capture Visible Messages.

## Mobile option
For Android, use the same architecture as your WhatsApp notification app:

Facebook/Messenger notification → Android Notification Listener → local store → send selected messages to this web app/server → translate → suggest reply.

This starter does not include the Android native project yet, but the web/server side is ready.
