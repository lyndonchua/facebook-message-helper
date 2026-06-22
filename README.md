# Facebook Message Helper

A desktop/mobile-friendly web app for Facebook/Messenger-style message help.

## What it does now
- Paste/import Facebook messages line by line.
- View them as chat threads.
- Translate the latest incoming message.
- Generate short reply suggestions.
- Copy the selected reply and open Messenger.

## Important Facebook limitation
This app does **not** secretly scrape personal Facebook Messenger inboxes. Meta's official Messenger Platform is mainly for Facebook Page/business messaging and requires a Page, permissions, webhooks, review, and access tokens.

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Host on Vercel
1. Upload this project to GitHub.
2. Import the GitHub repo into Vercel.
3. Set environment variables for your AI API key in Vercel, not inside the browser code.
4. Deploy.

## Recommended next build
Add a `/api/ai` server route in Vercel/Node so the browser sends messages to your backend, and the backend calls your AI provider for translation/reply suggestions. This keeps API keys hidden.

## Official Facebook Page integration idea
For a Facebook Page inbox, add:
- Meta Developer app
- Messenger Platform product
- Webhook URL
- Page access token
- `pages_messaging` and related permissions

Then incoming Page messages can be saved to a database and displayed in this app.
