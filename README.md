# Eduvia learning platform

Eduvia is a learning platform for anyone building knowledge or developing skills. It supports formal education learners, self-directed learners, professionals, exam and certification candidates, and people exploring knowledge for personal interest.

Before the main app opens on a new installation, each learner chooses a learning path (formal education, self-directed learning, professional development, exam and certification preparation, or general knowledge), then completes a learning profile with their name, country, main learning focus and study preferences. School, programme, level, academic session and student identifiers are only required for formal education learners; they remain optional or hidden from the default experience for everyone else. Learners can organise subjects, skills and topics as learning areas, create schedules, add materials, generate personal plans and practise with their own resources. University-specific records such as results, CGPA, semester history and carryovers remain available to formal education learners.

## Validate and test

Use Node.js 22 or later to run the automated unit tests:

```sh
npm test
```

The tests cover course-material retrieval and learner-path migration, including compatibility with profiles created before the universal learning update.

## Start Eduvia locally

Python 3 is required; no Python packages are needed. From this folder run:

```sh
python server.py
```

Open `http://127.0.0.1:8000`. Learning-area lists and schedules can be imported as CSV, TSV, Excel, JSON, PDF, Word, PowerPoint, text, or PNG/JPG/WebP images. Photos and scanned PDFs are read with in-browser OCR, then the detected learning areas or scheduled items appear in a review step before they are added. The first PDF, Office, image OCR, or portable ZIP import loads its reader from a public CDN, so an internet connection is needed for that first use.

## Personal learning roadmaps

Learners can create personal roadmaps around academic, career, professional-skill, exam-preparation, creative or personal-interest goals. Each roadmap can be linked to a learning area and broken into dated or undated milestones. Progress is tracked from completed milestones and saved with the learner's local Eduvia data; it does not require an account or cloud service.

## Study guides and practice

Eduvia's existing study guides and practice questions are generated on the device from learning-area topics and uploaded materials, and continue to work without an AI key. The optional AI Tutor is a separate, server-backed feature described below. Use **Find a learning resource online** to open a normal web search; review the results yourself and save useful links or notes to the learning kit.

## Recorded lectures and image scanning

Each course workspace includes a **Recorded lectures** area. Import a saved Google Meet transcript as TXT, VTT, SRT or DOCX, and attach lecture PDFs, PowerPoint slides, screenshots or photographs. Eduvia extracts embedded PDF and slide text, and uses its existing browser OCR reader to scan image uploads and scanned PDF pages. Extracted text keeps page, slide and source-file markers where available.

The existing local lecture reader still selects major statements directly from source text and labels each point with its source location. When the optional AI service is configured, a learner can also request a structured AI-generated study guide for a saved lecture. Check technical details, equations and OCR output against the original lecture. Notes and extracted text remain saved with the course on the current device and are included in the existing course-material backup flow.

The optional integrations can import selected private Google Drive files after the learner authorises Google, retrieve accessible Google Meet transcript/recording artifacts, and transcribe an eligible recording. A Meet transcript is preferred when one exists. Recording transcription uses OpenAI and this first version supports files up to 25 MB. Google Meet artifact access is limited to meetings and files the connected account is permitted to access; Meet transcripts are time-limited by Google. Direct Meet/Drive processing is not enabled until the Worker and Google Cloud credentials are configured.

## AI Tutor and Google Workspace integrations

The optional **AI & Google Workspace** workspace is available from **More tools** after the integrations branch is deployed. It brings together the GPT-powered AI Tutor, AI lecture summaries, Google Drive import, Google Meet transcript/recording import and Google Calendar import/export.

- **AI Tutor:** asks for a course or learning area, searches relevant uploaded passages locally, and sends the learner's question, recent conversation and selected excerpts to the OpenAI Responses API. The tutor is instructed to distinguish source-backed claims from general explanation and not invent citations.
- **AI lecture summaries:** a learner can generate an optional study guide from a saved lecture. It includes an overview, detailed explanation, keywords/concepts, definitions, examples, points to verify, revision questions and takeaways. An opt-in setting can request a summary after an imported lecture is saved.
- **Google Drive:** the learner connects Google, chooses a file through Google Picker and chooses the Eduvia learning area to receive it. Eduvia downloads the selected file through the Worker and reuses the existing browser document reader. Google Docs and Slides are exported as PDF, Sheets as CSV, and ordinary supported files are downloaded as-is.
- **Google Meet:** the learner can list recent conference records, select generated transcript artifacts, and import transcript entries into Recorded Lectures. If a meeting has a permitted recording but no transcript, Eduvia can transcribe the recording through OpenAI. This first version supports recording files up to 25 MB. Meet artifact access depends on the user's Google permissions and meeting access; Meet transcript artifacts are time-limited.
- **Google Calendar:** the learner can manually import dated events into Eduvia or export Eduvia classes, personal study sessions and examinations to the primary Google Calendar. Exported items carry an Eduvia identifier so repeat exports update existing events instead of making duplicates. Incremental sync tokens reduce repeat imports. This is user-initiated import/export, not continuous background two-way sync. The current importer skips all-day events and non-weekly recurrence rules; weekly repeating events are bounded by their start/end dates.

### Required service setup

These integrations are implemented in the application branch but are **not live until deployment configuration is complete**. The Cloudflare Worker requires these secrets:
- `OPENAI_API_KEY`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_TOKEN_ENCRYPTION_KEY` (base64 encoding of a random 32-byte key)

It also requires Google OAuth client ID, the exact redirect URI in `notifications-worker/wrangler.jsonc`, Google Picker API key, and Google Cloud project number. Enable Google Drive API, Google Picker API, Google Calendar API and Google Meet REST API, and configure the OAuth consent screen and approved scopes. Google may require app verification or Workspace administrator approval for some scopes.

Run the D1 migration before deploying the Worker:
```sh
cd notifications-worker
npm install
npx wrangler d1 migrations apply eduvia-notifications --remote
npx wrangler deploy
```

Then configure the Eduvia web origin in the Worker, rebuild and deploy the web app. The AI service uses separate OpenAI API billing; a ChatGPT subscription does not include OpenAI API credits. Google credentials and the OpenAI API key must never be placed in browser JavaScript or an APK. In the Android APK, Google consent opens in the system browser and returns to Eduvia through the registered `com.eduvia.studyplanner://oauth` deep link.

## Materials and privacy

Uploaded local files are read in the browser. Extracted text and planner details stay in that browser on that device by default. When a learner explicitly uses the AI Tutor or requests an AI lecture summary/transcription, the selected question, recent conversation, source excerpts or lecture recording/transcript are sent through the Eduvia Worker to OpenAI for processing. When the learner connects Google, Google refresh credentials are encrypted in the Worker database; selected Drive content and permitted Meet artifacts are fetched only for the requested import. Calendar events are exchanged only when the learner runs a sync. The ZIP backup is not encrypted, so keep it private. There are no general Eduvia accounts or automatic planner cloud sync in this version.

## Phone notifications

In the browser and installed PWA, Eduvia schedules class and learning-session alerts for their scheduled start time, plus a daily learning reminder, through its own phone notification service. Browser push can arrive late because a scheduled Worker checks once per minute and sends up to ten due reminders per run. The service uses Cloudflare Workers and D1. Google Calendar integration is optional and is described separately below. Phone notification permissions and sound settings still apply. iPhone and iPad require Eduvia to be added to the Home Screen (iOS/iPadOS 16.4 or later).

On first-time profile setup, Eduvia offers a one-time invitation to enable class, learning-session and daily reminder alerts. The operating-system or browser permission request appears only after the learner taps **Enable alerts**. Dismissing the invitation does not make it appear again when an existing learner reopens Eduvia; notification controls remain available in **Settings**.

The browser notification service stores a device subscription and scheduled reminder titles and times so it can deliver alerts while the PWA is closed. In the Android app, alarms are scheduled locally on the phone instead; Android asks for notification access and exact-alarm access, and Eduvia asks for camera access only when the learner taps **Take a photo**. Courses, results, uploaded materials, and personal documents remain on the device.

To deploy the free service, follow `notifications-worker/README.md`, then set its Worker URL in `push-config.js`.
## First launch and welcome screens

New installations open with the Eduvia brand splash and a short introduction to learning, practice, and progress. The learner then chooses a country and completes the learning profile and study routine before the main app is unlocked. The profile is saved locally and can be updated later from Learning Profile. The flow does not ask for ethnicity or a nickname.

The same HTML/CSS/JavaScript entry flow is included in the website and the Capacitor Android build. Existing learning data, local privacy, and saved academic records are retained; academic tools are shown in the context of formal education. The shared learner-path rules live in `learner-profile.js` and are covered by the test suite.

## Android APK

GitHub Actions builds an installable Android beta APK from the main branch and publishes it on the Eduvia Android beta release page. It is debug-signed for direct installation and is not a Google Play release. On first-time profile setup, choose **Enable alerts** on the one-time notification invitation. The operating system then asks for notification and exact-alarm access. If you dismiss the invitation or want to change this later, use **Settings → Eduvia phone notifications**. To take a document photo, use a **Take a photo** button in the study studio or document cabinet.

## Install the web app on iPhone

Publish the files on an HTTPS host, then open Eduvia in Safari, tap Share, and choose **Add to Home Screen**. The Android APK is not an iPhone app; iOS needs its own signed app build.

The app shell can open offline after its first load, but each phone keeps its own local data. Use the portable backup to move data between devices.


## Scheduled scheduled class and learning-session alarms

Eduvia schedules class and learning-session notifications for the event's actual start time. The Android app uses local notifications with an audible multi-pulse sound and requests notification and exact-alarm permissions. Android notification-channel settings, silent mode, battery policies, and Do Not Disturb can still affect delivery or sound. Eduvia does not silently bypass Do Not Disturb; Android requires separate user-granted special access for apps that are allowed to override it. The browser version depends on the configured push service for delivery while closed; foreground browser timers alone are not guaranteed in the background.


## Learning experiences, wellness and insights

Play & Learn includes a short recall sprint using saved flashcards; completed cards receive the existing spaced-review intervals. Ask Eduvia continues to retrieve source passages locally and keeps a local recent-search list. The separate optional AI Tutor sends the learner's question and selected source excerpts to OpenAI for conversational, step-by-step teaching. Discover includes saved guides, reading history and digital-skills and career-readiness topics. Study Wellness stores one editable daily study-balance check-in on the device. Performance Insights summarises saved study quizzes, topic mastery, mock-exam self-assessments and activity; it does not infer or invent official grades.
