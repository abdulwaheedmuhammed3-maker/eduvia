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

Eduvia can send class and study alerts about five minutes before they start, plus a daily reading reminder, through its own phone notification service. The free service uses Cloudflare Workers and D1; it does not use Google Calendar. Phone notification permissions and sound settings still apply. iPhone and iPad require Eduvia to be added to the Home Screen (iOS/iPadOS 16.4 or later).

The notification service stores a device subscription and scheduled reminder titles and times so it can deliver alerts while the app is closed. Courses, results, uploaded materials, and personal documents remain on the device.

To deploy the free service, follow `notifications-worker/README.md`, then set its Worker URL in `push-config.js`.
## Install on Android or iPhone

Publish the files on an HTTPS host, then install Eduvia from the browser. Android shows an install button when the browser offers installation. On iPhone or iPad, open the site in Safari, tap Share, then **Add to Home Screen**. Enable Eduvia phone notifications in Settings for reminders that should work while Eduvia is closed.

The app shell can open offline after its first load, but each phone keeps its own local data. Use the portable backup to move data between devices.
