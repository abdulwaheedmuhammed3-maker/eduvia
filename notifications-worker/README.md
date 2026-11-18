# Eduvia phone notification service

This is a small, serverless push service for Eduvia. It uses Cloudflare Workers and D1 on their free plan. It does not use Google Calendar and does not need an always-on server.

The Worker checks due reminders once per minute and sends one push per run. If several reminders have the same send time, later ones can arrive on the next minute check. Phone operating-system notification settings still control whether an alert makes a sound.

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

For Workers Builds, connect the GitHub repository on branch `feat/free-phone-notifications`, set the root directory to `notifications-worker`, leave the build command blank, and use `npm run db:migrate && npm run deploy` as the deploy command. The Worker name must be `eduvia-notifications`. The D1 database ID is already set in `wrangler.jsonc`.

