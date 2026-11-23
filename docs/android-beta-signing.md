# Stable Eduvia Android beta signing

Eduvia's direct-install APK must keep the same Android signing certificate across every published build. Android rejects an update when the installed copy and the new APK have the same application ID but different signing certificates.

The app ID remains `com.eduvia.studyplanner`. Do not change it to work around a signature conflict.

## Create the signing key once

On a computer with Java's `keytool` installed, run:

```bash
keytool -genkeypair -v \
  -keystore eduvia-beta.jks \
  -storetype JKS \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias eduvia-beta
```

Choose strong passwords when prompted. Keep the keystore and passwords in a secure password manager or offline backup. **Never regenerate this key for a later build**: every future beta update must use this exact keystore, key alias and passwords.

Create the base64 value without changing the keystore:

- macOS/Linux: `base64 -w 0 eduvia-beta.jks` (on macOS, use `base64 eduvia-beta.jks | tr -d '\n'`)
- Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\eduvia-beta.jks"))`

## Add four GitHub Actions secrets

Open the Eduvia repository's **Settings → Secrets and variables → Actions → New repository secret**, and add:

| Secret name | Value |
| --- | --- |
| `EDUVIA_ANDROID_KEYSTORE_BASE64` | The base64 output from the keystore file |
| `EDUVIA_ANDROID_KEYSTORE_PASSWORD` | The keystore password |
| `EDUVIA_ANDROID_KEY_ALIAS` | `eduvia-beta` |
| `EDUVIA_ANDROID_KEY_PASSWORD` | The key password |

The workflow reads these values as Actions secrets. They are not written into the repository or printed in the build log.

Pull-request builds may use an ephemeral CI key to verify compilation, but their APK artifacts are not uploaded. A build from `main` or a manually dispatched release requires the persistent key and fails rather than publishing an APK that cannot update the installed beta.

## One-time migration from an APK signed by an old temporary key

If the Eduvia copy currently installed on a phone was signed by an earlier GitHub runner's temporary debug key, that private key cannot be reconstructed from the APK. A new persistent key cannot update that old install in place.

Before uninstalling the old app:

1. Open the installed Eduvia and confirm your courses and records are present.
2. Open **Personal documents / Vault** and choose **Download portable backup**. Keep the ZIP private; it contains your learning data and uploaded files.
3. Confirm the ZIP has downloaded successfully and keep a second copy somewhere safe.
4. Only then uninstall the old Eduvia app and install a beta APK built after the four secrets have been configured.
5. Open the new Eduvia and use **Import backup from another device** in Personal documents / Vault to restore the ZIP.

The portable ZIP includes class voice recordings and other files stored by Eduvia. Do not clear app data or uninstall before the backup has completed. After migrating, future APKs signed with this persistent key can update the installed app normally.