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

## Eduvia Recall notifications

Recall questions are built on the learner's device from saved flashcards, course topics and locally indexed course materials. The notification service receives only the short question prompt, its delivery time and a same-site route back to that question. Answers, course documents, source passages and learning results are not uploaded to the Worker. Applying migration `0003_recall_notification_routes.sql` adds the validated in-app destination used when a learner taps a Recall notification.

## AI Tutor and Google Workspace integrations

The Worker also provides Eduvia's optional AI Tutor, AI lecture summaries, user-selected Drive import, Google Meet transcript import and manual Calendar sync. Setup, required secrets, Google APIs, OAuth scopes, deployment, privacy and current limitations are documented in [docs/ai-tutor-google-workspace.md](../docs/ai-tutor-google-workspace.md).

After merging the integration changes:

1. From this folder, run `npm run db:migrate` to apply migration `0004_intelligence_integrations.sql`.
2. Add the required Worker secrets described in the integration guide. At minimum, configure `OPENAI_API_KEY` and `OPENAI_MODEL` before making AI Tutor available.
3. Configure the Google OAuth client, Picker API key, Cloud project number and token-encryption key before enabling Google Workspace.
4. Deploy the Worker and then deploy the Eduvia web bundle.

The Worker never receives an OpenAI API key from the browser. Google refresh tokens are encrypted in D1. The Tutor uses a per-device daily allowance and a per-source-network daily allowance; learners sharing a campus or public Wi-Fi network share that network limit. Google OAuth is currently enabled only in the web app. Android Google sign-in remains disabled pending the external-browser and deep-link flow.
