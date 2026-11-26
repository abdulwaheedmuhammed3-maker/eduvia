# Eduvia AI Tutor and Google Workspace integrations

This integration adds a server-side AI and Google Workspace layer to the existing Eduvia app. The app remains local-first for its planner, course materials, lecture files and personal records. AI requests and Google actions are opt-in and use a separate Cloudflare Worker service.

## What is included

- **Eduvia Tutor:** course-aware conversation, beginner-to-advanced explanations, worked examples and follow-up questions. When enabled, it can retrieve relevant passages from the learner's existing local course materials and submit those excerpts with the question.
- **AI lecture summaries:** a learner can generate a structured AI summary from the text already extracted by Recorded Lectures. The original extractive key points remain available and are not replaced.
- **Google Drive:** Google Picker lets a learner select up to ten files at a time. Selected Drive files are downloaded through the Worker, returned to the browser for the existing PDF/Office/image/text readers, and saved locally with the course. Each file is limited to 8 MB.
- **Google Meet:** the learner can list accessible conference records and import generated Meet transcript entries. This is not live meeting capture or automatic video/audio transcription. The meeting must have a transcript artifact available to the connected Google account.
- **Google Calendar:** manual two-way sync imports timed events from the primary calendar and creates or updates dated, one-off Eduvia timetable events in that calendar. Linked events are tracked to prevent duplicate creation. If both copies change since the last sync, the Google Calendar version is kept and the conflict is reported. Deletions are not synchronised. Repeated weekly timetable rules, all-day events and unattended background sync are not included yet.

## Required services and configuration

The Worker uses the existing notifications-worker deployment, its existing D1 database, and Cloudflare Workers AI through the `AI` binding already declared in `notifications-worker/wrangler.jsonc`. Apply migration `0004_intelligence_integrations.sql` before enabling the endpoints.

**Eduvia Tutor and AI lecture summaries do not require an OpenAI account, OpenAI API key, or separate model-provider subscription.** The default model is `@cf/google/gemma-4-26b-a4b-it`, configured as the non-secret `AI_MODEL` variable. The current Cloudflare model listing marks it as available on Workers AI and identifies zero data retention. Workers AI's Free plan includes 10,000 Neurons per day; requests beyond that free daily allocation require the Workers Paid plan. Requests can be rate-limited or rejected when the allocation or model capacity is reached.

Only Google Workspace credentials are needed for the optional Google features. From the `notifications-worker` folder, set these Cloudflare Worker secrets. Never commit these values or paste them into a public issue or source file.

    npx wrangler secret put GOOGLE_CLIENT_ID
    npx wrangler secret put GOOGLE_CLIENT_SECRET
    npx wrangler secret put GOOGLE_REDIRECT_URI
    npx wrangler secret put APP_REDIRECT_URL
    npx wrangler secret put GOOGLE_TOKEN_ENCRYPTION_KEY
    npx wrangler secret put GOOGLE_PICKER_API_KEY
    npx wrangler secret put GOOGLE_CLOUD_PROJECT_NUMBER

Eduvia sends Tutor questions and learner-selected source excerpts to the configured Cloudflare Workers AI model to generate an answer. The learner's Tutor chat history remains in the browser's local storage for that device. The selected default model is marked by Cloudflare as zero-data-retention; nevertheless, do not submit passwords, private identifiers or sensitive documents.

Generate the AES-GCM encryption key with:

    openssl rand -base64 32

Use that output as GOOGLE_TOKEN_ENCRYPTION_KEY. Google refresh tokens are encrypted with AES-GCM before being stored in D1. The OAuth state and PKCE verifier are stored temporarily in D1 and expire after ten minutes. The Worker deletes expired sessions and OAuth states during its scheduled cleanup.

GOOGLE_REDIRECT_URI must be the exact callback URL on the deployed Worker, for example:

    https://eduvia-notifications.abdulwaheedmuhammed3-996.workers.dev/v1/google/callback

APP_REDIRECT_URL must be Eduvia's production web URL with the Ask page fragment, for example:

    https://eduvia-study-planner.onrender.com/#ask

The existing Worker ALLOWED_ORIGIN list includes the two configured Eduvia web origins, Capacitor localhost origins, and the documented Python local-server origins on port 8000. Add any custom production domain or alternate local development origin to that list before deployment.

## Google Cloud setup

Use one Google Cloud project and enable these APIs:

1. Google Drive API
2. Google Picker API
3. Google Meet REST API
4. Google Calendar API

Create a Web application OAuth client. Add the exact Worker callback URL above as an authorised redirect URI. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to that client. Set GOOGLE_CLOUD_PROJECT_NUMBER to the numeric project number, not the project ID string.

Create a browser API key for Google Picker and set it as GOOGLE_PICKER_API_KEY. Restrict the key to the Google Picker API (and Drive API if the console requires it) and to the Eduvia production website. Google Picker runs in a docs.google.com iframe, so follow Google's current referrer restriction instructions and include the required Docs origin. The picker key is returned to the browser and is therefore a public browser credential; it must be restricted and must never be treated as a private secret.

The Worker requests these OAuth scopes:

- drive.file — access only to Drive files the learner chooses for Eduvia through Google Picker.
- meetings.space.readonly — read meeting records and generated transcript artifacts the connected user can access.
- calendar.events.owned — read and edit events on calendars owned by the connected user.

Google may require OAuth consent-screen testing or app verification for the requested sensitive scopes before general public use. Do not request broad drive.readonly access: Drive import is designed around explicit file selection.

## Deployment steps

1. Set the Worker secrets above in the correct Cloudflare account.
2. Run npm run db:migrate from notifications-worker.
3. Deploy the Worker from notifications-worker using the existing Workers Builds pipeline after the feature PR has been reviewed and merged, or use npm run deploy manually.
4. Deploy the Eduvia web bundle. The push-config.js URL already points to the existing Worker.
5. Open Ask Eduvia in the web app. Tutor is available to the web app and Android app once the Worker is configured. Connect Google Workspace from the web app.

The health endpoint `GET /v1/intelligence/health` reports whether the Workers AI binding and Google configuration values are present. It never returns credentials. AI usage is limited to 35 requests per device session per day and 240 requests per source network per day; new sessions are limited to 20 per network per day. The network limit can affect learners sharing a campus or public Wi-Fi connection, so review these values before a broad campus rollout.

## Platform and feature boundaries

- **Android Google sign-in:** the Android APK currently displays a disabled Google sign-in state. It needs a supported external-system-browser OAuth flow and verified app deep links before Google account linking should be enabled in the APK. Do not try to embed Google's OAuth sign-in page inside the Android WebView.
- **Meet recordings:** only generated transcript artifacts are imported in this release. Eduvia does not join, record or listen to a live meeting and does not transcribe a raw Meet video/audio recording.
- **Calendar:** sync is manual and targets the primary Google calendar. It imports and updates timed events, and exports dated one-off Eduvia events. Recurring weekly timetable rules and all-day events are not synchronised.
- **Google Drive files:** imports happen only after a user explicitly selects the file. The Worker temporarily handles file bytes to fetch the selected item; extracted text and notes are then processed in the browser and saved to the learner's device. When the learner requests an AI summary or asks Tutor to use source passages, the selected text is sent to the configured AI provider.
- **Local-first behaviour:** planner data, original course files, lecture records and Tutor conversation history remain in browser/device storage. This integration does not create a general Eduvia user account or cross-device database sync.
