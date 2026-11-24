# Eduvia phone notification service

This is a small, serverless push service for Eduvia. It uses Cloudflare Workers and D1 on their free plan. It does not use Google Calendar and does not need an always-on server.

The Worker checks due reminders once per minute and can send up to ten per run. Lecture and study reminders are scheduled for the event's actual start time (not five minutes before), so browser push delivery may arrive up to roughly one scheduler interval late. It claims each reminder before sending so overlapping checks do not send the same alert twice. Alerts more than ten minutes late are discarded. Phone operating-system notification settings still control whether an alert makes a sound.

## One-time setup

1. Create or sign in to a free Cloudflare account. Do not choose a paid Workers plan.
2. Install Node.js, then open a terminal in this folder (`notifications-worker`).
3. Run `npm install` and `npx wrangler login`.
4. Create the free D1 database with `npx wrangler d1 create eduvia-notifications`.
5. Copy the database ID printed by Wrangler into `wrangler.jsonc`, replacing the zero ID currently in `wrangler.jsonc` (Wrangler may update it automatically).
6. Run `npm run db:migrate`, then `npm run deploy`.
7. Wrangler prints the Worker URL, similar to `https://eduvia-notifications.<your-workers-subdomain>.workers.dev`. Set that full URL in the root `push-config.js` file, then deploy the Eduvia site.

The first request to `/v1/config` creates the VAPID push key pair and stores it in D1. The private key is not committed to the repository. The Worker accepts browser requests only from the Eduvia site origin configured in `wrangler.jsonc`.

## What is stored

D1 stores a random device token hash, the phone push subscription, and reminder titles, messages, and send times for up to 90 days. Eduvia does not upload course lists, results, class materials, or personal documents. Turning notifications off removes the device and its pending reminders.

## Free-tier fit

The schedule is sent only when reminders or the phone subscription change. The Worker runs 1,440 scheduled checks per day. Cloudflare publishes free daily limits for Workers and D1; exceeding a free limit can pause or reject requests, so the service does not silently switch to a paid Render plan.

## Cloudflare dashboard deployment

For Workers Builds, connect the GitHub repository on production branch `main`, set the root directory to `notifications-worker`, leave the build command blank, and use `npm run db:migrate && npm run deploy` as the production deploy command. The Worker name must be `eduvia-notifications`. The D1 database ID is already set in `wrangler.jsonc`.

This service only needs a production deployment, so disable Preview builds. If you later enable previews for testing, configure a separate Preview command, Preview-safe variables, and a separate D1 database. Do not point Preview builds at the production database.

## AI and Google Workspace integrations

The same Worker can now serve optional AI and Google Workspace endpoints. Run the D1 migration `0004_ai_google_integrations.sql` before deploying the updated Worker. The migration creates short-lived OAuth state rows, encrypted Google connection records, and AI usage counters.

### Required configuration

Set these Worker secrets with Wrangler (use a new randomly generated encryption key and keep a secure backup of it):

```sh
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put GOOGLE_CLIENT_SECRET
openssl rand -base64 32
npx wrangler secret put GOOGLE_TOKEN_ENCRYPTION_KEY
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_PICKER_API_KEY
npx wrangler secret put GOOGLE_APP_ID
```

Set `GOOGLE_REDIRECT_URI` to the exact OAuth redirect URL in `wrangler.jsonc`:
`https://eduvia-notifications.abdulwaheedmuhammed3-996.workers.dev/v1/google/callback`.
The OAuth web client in Google Cloud must contain this exact authorised redirect URI. The Picker key must be HTTP-referrer restricted to the Eduvia web origins, and `GOOGLE_APP_ID` is the numeric Google Cloud project number. Keep `OPENAI_MODEL` set to `gpt-6.2-sol` unless the service owner intentionally chooses another Responses API model.

In Google Cloud, enable Google Drive API, Google Picker API, Google Calendar API and Google Meet REST API. Configure the OAuth consent screen and request only the scopes used by Eduvia: OpenID/email, `drive.file`, `drive.meet.readonly`, `meetings.space.readonly`, and `calendar.events.owned`. Google verification or Workspace administrator approval may be required before general public use.

The frontend receives a short-lived Google access token only to open Google Picker. The refresh token stays encrypted in D1 using AES-GCM and the server-only encryption key. Disconnecting Google removes the encrypted connection for that Eduvia device. Clearing local browser/app data also clears that device's integration token; reconnect Google on the new installation.

The AI Tutor sends the learner's question, recent messages and only the locally retrieved source passages to OpenAI. AI lecture summaries send the selected lecture transcript. Audio transcription uploads the selected recording to the OpenAI transcription endpoint and accepts recordings up to 25 MB in this first version. OpenAI API use is billed separately from ChatGPT subscriptions. Usage is rate-limited by IP and tool type, and OpenAI Responses requests use `store: false`.

Google Meet imports only transcript/recording artifacts the connected account can access. Transcript artifacts are normally available for 30 days. If a generated transcript is present, Eduvia imports it without spending OpenAI transcription credits. If only a recording is available, the learner can use OpenAI transcription, subject to the 25 MB limit.

Google Calendar import/export is initiated from Eduvia's **AI & Google Workspace** page. The first import uses an incremental sync token; a Google 410 response triggers a full resync. The current version supports timed single events and weekly recurring events, skips all-day events and other recurrence patterns, and does not continuously synchronise in the background.

Apply the migration before deployment:
```sh
npm run db:migrate
npm run deploy
```

## Eduvia Recall notifications

Recall questions are built on the learner's device from saved flashcards, course topics and locally indexed course materials. The notification service receives only the short question prompt, its delivery time and a same-site route back to that question. Answers, course documents, source passages and learning results are not uploaded to the Worker. Applying migration `0003_recall_notification_routes.sql` adds the validated in-app destination used when a learner taps a Recall notification.
