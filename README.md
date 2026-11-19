# Eduvia student planner

Eduvia is a school-, course-, and level-neutral study planner for primary and high school learners, college and university students, postgraduate learners, and people in vocational or professional training.

At first use, each learner enters their own school or provider, country, programme, level, term, study days, and available hours. They can import a course list and class timetable, add study materials, generate a weekly plan, create local study guides, and practise with questions based on their own course details. My education lets learners backfill past school years, semesters, and sessions with their subjects and results, then save current results when they archive a term and move forward.

## Start Eduvia locally

Python 3 is required; no Python packages are needed. From this folder run:

```sh
python server.py
```

Open `http://127.0.0.1:8000`. Course lists and timetables can be imported as CSV, TSV, Excel, JSON, PDF, Word, PowerPoint, text, or PNG/JPG/WebP images. Photos and scanned PDFs are read with in-browser OCR, then the detected courses or class times appear in a review step before they are added. The first PDF, Office, image OCR, or portable ZIP import loads its reader from a public CDN, so an internet connection is needed for that first use.

## Study guides and practice

Eduvia creates study guides and practice questions on the device from course topics and uploaded materials. It has no AI connection or API key requirement. Use **Find a course outline online** to open a normal web search; review the results yourself and save useful links or notes to the learning kit.

## Materials and privacy

Uploaded files are read in the browser. Extracted text and planner details stay in that browser on that device. The original files are not uploaded to an Eduvia server. Settings can download a planner JSON backup; Personal documents can create a portable ZIP with files, education history, and recorded results. The ZIP is not encrypted, so keep it private. There are no accounts or automatic cloud sync in this version.

## Phone notifications

In the browser and installed PWA, Eduvia can send class and study alerts about five minutes before they start, plus a daily reading reminder, through its own phone notification service. The free service uses Cloudflare Workers and D1; it does not use Google Calendar. Phone notification permissions and sound settings still apply. iPhone and iPad require Eduvia to be added to the Home Screen (iOS/iPadOS 16.4 or later).

The browser notification service stores a device subscription and scheduled reminder titles and times so it can deliver alerts while the PWA is closed. In the Android app, alarms are scheduled locally on the phone instead; Android asks for notification access and exact-alarm access, and Eduvia asks for camera access only when the learner taps **Take a photo**. Courses, results, uploaded materials, and personal documents remain on the device.

To deploy the free service, follow `notifications-worker/README.md`, then set its Worker URL in `push-config.js`.
## First launch and welcome screens

New installations open with the Eduvia brand splash, a short introduction to learning, practice, and progress, and a country picker. The introduction is shown once per device; the country choice is saved into the existing study profile and prefilled in the planner setup screen. The country screen asks only for a country — it does not ask for ethnicity or a nickname.

The same HTML/CSS/JavaScript entry flow is included in the website and the Capacitor Android build. Existing planner data, local privacy, and study tools are unchanged.

## Android APK

GitHub Actions builds an installable Android beta APK from the main branch and publishes it on the Eduvia Android beta release page. It is debug-signed for direct installation and is not a Google Play release. On the first run, open **Settings → Eduvia phone notifications** and allow notification and exact-alarm access. To take a document photo, use a **Take a photo** button in the study studio or document cabinet.

## Install the web app on iPhone

Publish the files on an HTTPS host, then open Eduvia in Safari, tap Share, and choose **Add to Home Screen**. The Android APK is not an iPhone app; iOS needs its own signed app build.

The app shell can open offline after its first load, but each phone keeps its own local data. Use the portable backup to move data between devices.


## Scheduled lecture and study alarms

Eduvia schedules lecture and study notifications for the event's actual start time. The Android app uses local notifications with an audible multi-pulse sound and requests notification and exact-alarm permissions. Android notification-channel settings, silent mode, battery policies, and Do Not Disturb can still affect delivery or sound. Eduvia does not silently bypass Do Not Disturb; Android requires separate user-granted special access for apps that are allowed to override it. The browser version depends on the configured push service for delivery while closed; foreground browser timers alone are not guaranteed in the background.
