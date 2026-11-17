# Eduvia student planner

Eduvia is a school-, course-, and level-neutral study planner for secondary and high school learners, college and university students, postgraduate learners, and people in vocational or professional training.

At first use, each learner enters their own school or provider, country, programme, level, term, study days, and available hours. They can import a course list and class timetable, add study materials, generate a weekly plan, create local study guides, and practise with questions based on their own course details.

## Start Eduvia locally

Python 3 is required; no Python packages are needed. From this folder run:

```sh
python server.py
```

Open `http://127.0.0.1:8000`. Course lists and timetables can be imported as CSV, TSV, Excel, JSON, PDF, Word, PowerPoint, text, or PNG/JPG/WebP images. Photos and scanned PDFs are read with in-browser OCR, then the detected courses or class times appear in a review step before they are added. The first PDF, Office, image OCR, or portable ZIP import loads its reader from a public CDN, so an internet connection is needed for that first use.

## Study guides and practice

Eduvia creates study guides and practice questions on the device from course topics and uploaded materials. It has no AI connection or API key requirement. Use **Find a course outline online** to open a normal web search; review the results yourself and save useful links or notes to the learning kit.

## Materials and privacy

Uploaded files are read in the browser. Extracted text and planner details stay in that browser on that device. The original files are not uploaded to an Eduvia server. Settings can download a planner JSON backup; Personal documents can create a portable ZIP with files and archived education records. The ZIP is not encrypted, so keep it private. There are no accounts or automatic cloud sync in this version.

## Phone calendar alerts

In the timetable, choose **Add to phone calendar** and open the downloaded `.ics` file on your phone. Class and study events include a 10-minute alert by default. If a daily reading reminder is set in Settings, the export includes it as a repeating calendar alert. The phone calendar can alert you while Eduvia is closed. Browser notifications are available while Eduvia is open.

## Install on Android or iPhone

Publish the files on an HTTPS host, then install Eduvia from the browser. Android shows an install button when the browser offers installation. On iPhone or iPad, open the site in Safari, tap Share, then **Add to Home Screen**. On either phone, use the phone-calendar export for reminders that should work while Eduvia is closed.

The app shell can open offline after its first load, but each phone keeps its own local data. Use the portable backup to move data between devices.

