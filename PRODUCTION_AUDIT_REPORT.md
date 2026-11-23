# Eduvia Production Audit Report

**Status:** Draft review; changes are not merged  
**Repository:** `abdulwaheedmuhammed3-maker/eduvia`  
**Audit baseline:** `main` at `5d441ba4b2eebe882da27bf90d8751fdd44b4059`  
**Audit branch:** `audit/full-application-production-2026-11-23`  
**Pull request:** [#41 — Full production audit fixes](https://github.com/abdulwaheedmuhammed3-maker/eduvia/pull/41)

## Scope reviewed

The audit used the complete main-branch repository tree and reviewed the application’s primary runtime and persistence paths, including:

- Main shell, route resolution, course workspace, timetable, dashboard and settings
- Learner onboarding/profile and migration behaviour
- Course materials, document cabinet, OCR/extraction and recorded-lecture ingestion
- Study-plan generation, class records, reflections, quiz attempts and academic history
- Exam Centre, timed mock exams, revision plans, mastery tracking and flashcards
- Roadmaps, Discover, Ask Eduvia, wellness and recall-sprint experiences
- LocalStorage and IndexedDB boundaries, backup/restore, file deletion and term archives
- Android/Capacitor notification bridge and native reminder queue
- Cloudflare notification Worker, D1 migrations, CORS/origin checks and Worker deployment configuration
- Service-worker cache, production asset loading, web build and CI workflows
- User-supplied and restored external source URLs

The changes are deliberately limited to defect correction and regression coverage. No product features or visual redesigns were introduced.

## Confirmed findings and corrections

### 1. One-off timetable entries could block weekly study planning indefinitely
**Severity:** High — scheduling correctness

The weekly plan generator treated all manual one-off events as recurring conflicts. A past extra lecture or study session could permanently reserve the same weekday/time slot, even after its date had passed.

**Correction:** The generator now preserves all manual timetable history but uses only recurring, future-dated or still-active-today events as blockers. It no longer discards old manual records. A failed plan save restores the previous events and plan metadata.

**Regression coverage:** Past event, recurring event, future event, in-progress event today, ended event today and history preservation.

### 2. Large PDFs could be silently truncated
**Severity:** High — incomplete study material

PDF extraction processed at most 250 pages without warning. A learner could therefore receive extracted text and generated notes while the remaining pages were silently ignored.

**Correction:** Eduvia now refuses PDFs over 250 pages before processing and asks the learner to split the file. The existing OCR limit for pages without embedded text remains 20 pages per PDF. README documentation now states both limits.

**Regression coverage:** 250 pages accepted; 251 pages rejected before extraction.

### 3. Android notification queue was not refreshed on resume
**Severity:** High — reminder reliability

The native bridge emitted `eduvia-native-resume`, but the app did not consume that event. The Android schedule therefore was not reliably refilled when the app returned from the background. The native bridge also limits its pending queue to 300 reminders without the user being told when that limit was reached.

**Correction:** App resume now refreshes the current-day view and reschedules event, daily and push/native reminders. When the native queue is truncated, Eduvia discloses the 300-reminder cap and advises reopening the app periodically to queue later items. The README reflects this behaviour.

**Regression coverage:** Resume listener, reminder rescheduling and truncation notice.

### 4. Storage failures could produce false success or inconsistent in-memory state
**Severity:** High — data integrity

Multiple actions mutated the live planner object, called `save()`, and continued as though the write had succeeded. That could show a success message, close a form or leave a changed screen even when localStorage rejected the write (including storage quota failures).

**Correction:** Added save-result checks and rollback snapshots to the audited paths, including:

- Course creation/editing/deletion, notes, tasks, resources and timetable entries
- Session completion, focus completion, theme/profile-photo and settings changes
- Onboarding, learner profile and study availability
- Study-plan generation, class/study reflections and session quiz attempts
- Exam creation/edit/delete, mock-exam start/submission/review, revision plans and checklist state
- Deadline state, flashcards, mastery status/score and source-linked revision cards
- Roadmap create/edit/delete, milestone add/complete/delete and linked flashcard references
- Recall sprint progress, wellness check-ins, Ask Eduvia history and Discover saved/read history
- Course/timetable category backup imports and imported study data
- Carryover activation and education-result/academic-history updates

These changes preserve the previous in-memory state when persistence fails and avoid reporting a successful save until the write has succeeded.

**Regression coverage:** New tests cover the failure/rollback cases across the modules above.

### 5. File metadata and IndexedDB bytes could become inconsistent on deletion
**Severity:** High — file integrity

Personal-document, course-material and recorded-lecture deletion did not consistently wait for IndexedDB deletion before removing metadata. A failed IndexedDB operation could leave stale metadata or orphaned files.

**Correction:** File-backed deletes now read the record first, await the file deletion, and only then update planner metadata. If the planner save fails, the previous metadata is restored and the file is written back where possible. Failed file reads/deletes now stop the operation and show an error instead of claiming success. New personal-document uploads and recorded-lecture saves remove their file when the planner metadata write fails; cleanup errors are surfaced.

**Regression coverage:** Personal-document, course-material and recorded-lecture deletion, including rollback.

### 6. Restored lecture source URLs were not revalidated at render time
**Severity:** Medium — link trust boundary

Google-source URLs were validated when a new lecture was imported, but a restored or otherwise pre-existing record could reach the renderer without repeating that protocol/host validation.

**Correction:** Source links are now passed through the Google host/protocol allow-list again immediately before becoming clickable. Invalid sources are omitted from the link UI.

**Regression coverage:** Render-time URL validation is required before constructing the link.

### 7. Cloudflare Worker Preview builds could target production resources
**Severity:** Critical — deployment/data safety

The Worker’s Cloudflare Builds settings had Preview builds enabled. The Preview deploy command matched the production command (`npm run db:migrate && npm run deploy`), while the Wrangler configuration bound the production D1 database. A branch Preview could therefore run migration/deploy steps against production resources.

**Correction:** Disabled Worker Preview builds in Cloudflare. Verified that production auto-build remains enabled on `main`. The production deploy command and D1 binding were not changed, and no production data was modified.

**Verification:** Cloudflare Worker Build configuration confirmed `previews_enabled=false`, `auto_build_enabled=true`, production branch `main`.

## Automated verification

The repository CI pipeline checks JavaScript syntax, runs the Node test suite, builds the production web bundle and verifies that assets are loaded/cached consistently. Android CI prepares the Capacitor project and builds the installable APK.

Earlier audit-branch validation runs have passed with **138 tests, 0 failures**, plus the production web bundle and asset/cache checks. The latest personal-document deletion and its updated regression test were added after that passing run; their newest validation and APK runs must finish before this PR is ready for merge.

## Not verified in this environment

- No live browser click-through of the hosted production site was completed.
- No physical Android phone acceptance run was performed for notifications, camera/document flows, Do Not Disturb behaviour or alarm delivery.
- No screen-reader/keyboard/device accessibility session was performed.
- Automated CI and source inspection do not replace those release acceptance tests.

## Release recommendation

Keep this PR in draft until the current-head CI and APK build pass. Then review the diff and perform a short real-device acceptance pass for onboarding, course/timetable editing, class notifications, OCR/recorded lectures, portable backup/restore, document deletion, Exam Centre and study-plan generation. Do not merge until that review is complete.
