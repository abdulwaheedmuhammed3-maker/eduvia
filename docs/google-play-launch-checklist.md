# Eduvia Google Play launch checklist

This checklist tracks preparation for a free Google Play listing.

## Release build
- [ ] Create a dedicated Play upload keystore (do not reuse the beta/debug signing key).
- [ ] Back up the upload keystore securely in more than one private location.
- [ ] Add GitHub Actions secrets:
  - `PLAY_UPLOAD_KEYSTORE_BASE64`
  - `PLAY_UPLOAD_KEYSTORE_PASSWORD`
  - `PLAY_UPLOAD_KEY_ALIAS`
  - `PLAY_UPLOAD_KEY_PASSWORD`
- [ ] Verify generated AAB and signature.
- [ ] Verify target SDK and release configuration.

## Policy and disclosures
- [ ] Audit app storage and any server-side storage.
- [ ] Audit camera, microphone, speech recognition, notifications, files, and other permissions.
- [ ] Identify all SDKs, APIs, external services, and data sharing.
- [ ] Publish an accurate privacy policy at a public URL.
- [ ] Complete Play Console Data Safety form.
- [ ] Complete content rating and app access declarations.
- [ ] Complete account deletion disclosures if applicable.

## Store assets
- [ ] App name and short description.
- [ ] Full description.
- [ ] 512x512 store icon.
- [ ] Screenshots for phone and any supported device categories.
- [ ] Feature graphic (1024x500).
- [ ] Support contact and privacy-policy URL.

## Testing and release
- [ ] Test the AAB through Play internal testing.
- [ ] Check fresh install, update, notifications, camera, recording, speech-to-text, documents, backups, and offline behavior.
- [ ] Complete any applicable personal-account closed-testing requirements.
- [ ] Apply for production access.
- [ ] Review final listing and publish.

**Do not publish until privacy and Data Safety declarations have been verified against the actual implementation.**
