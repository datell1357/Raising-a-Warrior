<!-- adr-meta: {"id":"005-privacy-delete","status":"accepted","decisionIds":["consent-gating","verified-delegation","deletion-lifecycle"],"riskIds":["unauthorized-deletion","incomplete-third-party-propagation"],"sourceIds":["auth-unity","auth-admin","play-account-deletion","play-data-safety"],"claims":{"consent":"versioned-gate","delegation":"verified-only","lifecycle":"submitted-in-progress-completed"}} -->
# ADR 005: Privacy And Deletion

## Decision
Consent is versioned and gates SDK behavior. Players can request and check deletion status in-app and on the deletion Web surface. Support can act only through verified delegation; reauthentication is required where the authenticated provider or sensitive action requires it. The lifecycle is `submitted` to `in-progress` to `completed`.

Deletion processing records associated data, third-party propagation, and retention disclosures. Admin bulk deletion is not treated as a user deletion workflow because it does not trigger per-user `onDelete`; the authority workflow schedules and audits its own propagation. Neither players nor support directly edit wallets or authority collections.

The following claim table is normative; prose remains explanatory.

| Claim | Value |
| --- | --- |
| consent | versioned-gate |
| delegation | verified-only |
| lifecycle | submitted-in-progress-completed |

## Consequences
The Web surface is privacy/support only, never Web gameplay. Unauthorized, invalid, or undelegated requests disclose no personal data and leave authority state unchanged except for a valid lifecycle command.

## Risks And Controls
Unauthorized deletion is controlled by authentication, reauthentication where required, and verified delegation. Incomplete third-party propagation is controlled by explicit retention and propagation records.

## Sources
| Source ID | URL | retrievedAt |
| --- | --- | --- |
| auth-unity | https://firebase.google.com/docs/auth/unity/manage-users | 2026-07-28 |
| auth-admin | https://firebase.google.com/docs/auth/admin/manage-users | 2026-07-28 |
| play-account-deletion | https://support.google.com/googleplay/android-developer/answer/10144311?hl=en | 2026-07-28 |
| play-data-safety | https://support.google.com/googleplay/android-developer/answer/10787469?hl=en | 2026-07-28 |
