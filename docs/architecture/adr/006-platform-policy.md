<!-- adr-meta: {"id":"006-platform-policy","status":"accepted","decisionIds":["api-36-baseline","extension-evidence","external-blocked"],"riskIds":["submission-policy-drift","missing-console-prerequisite"],"sourceIds":["play-target-api","play-app-signing","play-aab-size","android-apk-splits","android-64-bit","android-abis","app-check-play-integrity","emulator-firestore","emulator-rules"],"claims":{"api":"36-on-or-after-2026-08-31","extension":"live-console-evidence-only","missingPrerequisites":"blocked"}} -->
# ADR 006: Android And Play Policy

## Decision
The Android baseline is API 36 on and after 2026-08-31. An extension to 2026-11-01 is allowed only when live Play Console eligibility and approval evidence exists; documentation is not that evidence. Release submission requires a new app AAB, Play App Signing custody with an upload key held outside the repository, and ARM64/64-bit support.

Size checks are documented through bundletool and Play size exports, but historical or default thresholds are not treated as live submission proof. Account deletion and Data Safety declarations must match the actual product behavior. App Check and Play Integrity are attestation controls, not authority; emulator behavior has documented limitations and must not substitute for device or console proof.

The following claim table is normative; prose remains explanatory.

| Claim | Value |
| --- | --- |
| api | 36-on-or-after-2026-08-31 |
| extension | live-console-evidence-only |
| missingPrerequisites | blocked |

## Consequences
Missing external evidence produces `BLOCKED:<prerequisite-id>`, never PASS. No validator result claims Play Console readiness, signing custody, Firebase setup, billing/ad setup, deletion URL, Data Safety approval, device lab, or production telemetry access.

## Risks And Controls
Submission policy drift is controlled by dated official sources and live-console proof. Missing console prerequisites remain explicitly blocked until evidence is supplied.

## Sources
| Source ID | URL | retrievedAt |
| --- | --- | --- |
| play-target-api | https://support.google.com/googleplay/android-developer/answer/11926878?hl=en | 2026-07-28 |
| play-app-signing | https://support.google.com/googleplay/android-developer/answer/9842756?hl=en | 2026-07-28 |
| play-aab-size | https://support.google.com/googleplay/android-developer/answer/9859152?hl=en | 2026-07-28 |
| android-apk-splits | https://developer.android.com/build/configure-apk-splits | 2026-07-28 |
| android-64-bit | https://developer.android.com/google/play/requirements/64-bit | 2026-07-28 |
| android-abis | https://developer.android.com/ndk/guides/abis | 2026-07-28 |
| app-check-play-integrity | https://firebase.google.com/docs/app-check/android/play-integrity-provider | 2026-07-28 |
| emulator-firestore | https://firebase.google.com/docs/emulator-suite/connect_firestore | 2026-07-28 |
| emulator-rules | https://firebase.google.com/docs/rules/emulator-setup | 2026-07-28 |
