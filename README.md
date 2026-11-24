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

Eduvia creates study guides and practice questions on the device from learning-area topics and uploaded materials. The Ask Eduvia workspace now also includes an optional AI Tutor for explanations and worked examples. The Tutor uses a secure server-side OpenAI connection and can include relevant excerpts retrieved from the learner's local course materials. This online capability stays unavailable until the Worker secrets are configured. Use **Find a learning resource online** to open a normal web search; review the results yourself and save useful links or notes to the learning kit.

## Recorded lectures and image scanning

Each course workspace includes a **Recorded lectures** area. Import a saved Google Meet transcript as TXT, VTT, SRT or DOCX, and attach lecture PDFs, PowerPoint slides, screenshots or photographs. Eduvia extracts embedded PDF and slide text, and uses its existing browser OCR reader to scan image uploads and scanned PDF pages. Extracted text keeps page, slide and source-file markers where available.

The local version selects major statements directly from the uploaded source text and labels each point with its source location. When the AI service is configured, learners can also generate a structured AI-written summary, detailed notes, key terms and practice questions from the extracted text. The original extractive points remain available for comparison. Check technical details, equations and OCR output against the original lecture. Notes and extracted text are saved with the course on the current device and are included in the existing course-material backup flow.

After the Google OAuth service is configured, learners can select private Drive files through Google Picker and import generated Google Meet transcript artifacts that their account can access. A Meet transcript must already exist; Eduvia does not join or record a live meeting and does not transcribe raw audio/video recordings in this release. Google Calendar sync is manual and currently covers timed events in the primary calendar plus dated one-off Eduvia timetable items. Recurring weekly timetable rules and all-day events are not synchronised. See docs/ai-tutor-google-workspace.md for service setup and feature boundaries. First-time PDF/Office/OCR processing may need an internet connection to load the existing document-reader libraries.

## Materials and privacy

Without connected integrations, uploaded files are read in the browser and extracted text, planner details and original files stay on that device. When a learner explicitly imports a Drive file, the Worker temporarily fetches the selected file and returns it to the browser; imported content is saved locally. When AI Tutor or AI lecture summaries are used, the learner's question or selected extracted text is sent to the configured OpenAI service. Google refresh tokens are encrypted in D1. Tutor chat history is stored on the current device. Eduvia does not currently provide a general learner account or cross-device data sync. Settings can download a planner JSON backup; Personal documents can create a portable ZIP with files, education history, and recorded results. The ZIP is not encrypted, so keep it private.

## Phone notifications

In the browser and installed PWA, Eduvia schedules class and learning-session alerts for their scheduled start time, plus a daily learning reminder, through its own phone notification service. Browser push can arrive late because a scheduled Worker checks once per minute and sends up to ten due reminders per run. The free service uses Cloudflare Workers and D1; it does not use Google Calendar. Phone notification permissions and sound settings still apply. iPhone and iPad require Eduvia to be added to the Home Screen (iOS/iPadOS 16.4 or later).

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

Play & Learn includes a short recall sprint using saved flashcards; completed cards receive the existing spaced-review intervals. Ask Eduvia keeps its local, source-cited retrieval search and adds an optional AI Tutor chat that can use relevant saved course passages when the secure service is enabled. Discover includes saved guides, reading history and digital-skills and career-readiness topics. Study Wellness stores one editable daily study-balance check-in on the device. Performance Insights summarises saved study quizzes, topic mastery, mock-exam self-assessments and activity; it does not infer or invent official grades.
