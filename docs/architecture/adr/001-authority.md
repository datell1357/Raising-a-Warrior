<!-- adr-meta: {"id":"001-authority","status":"accepted","decisionIds":["server-authority","firestore-client-deny","iam-explicit"],"riskIds":["client-write-bypass","privileged-access-confusion"],"sourceIds":["firestore-client-libraries","firestore-rest","firestore-iam","app-check"],"claims":{"authority":"server-only","firestoreAuthorityWrites":"denied","iam":"explicit"}} -->
# ADR 001: Authority Boundary

## Decision
Functions and server code are authoritative for identity, server time, combat approval, progression, economy, the command ledger, commerce, content activation, rollout, and privileged operations. The client predicts and renders only; it never confirms victory, owns a wallet, or directly mutates authority state.

Firestore client writes to authority collections are denied. Admin/server access is not constrained by Firestore Security Rules and can bypass them, so server service identities and their IAM bindings are an explicit reviewed authority boundary, not an implied safety property. App Check supports attestation enforcement but does not turn client input into authority.

The following claim table is normative; prose remains explanatory.

| Claim | Value |
| --- | --- |
| authority | server-only |
| firestoreAuthorityWrites | denied |
| iam | explicit |

## Consequences
Every authority mutation enters through an authenticated server command, commits atomically, and is recorded through its command ledger/audit boundary. Web remains deletion, support, and operations only, never gameplay. Direct wallet or authority edits are prohibited, including support tooling.

## Risks And Controls
Client-write bypass is controlled by Rules denial and server-only write paths. Privileged-access confusion is controlled through explicit least-privilege IAM review and service identity evidence.

## Sources
| Source ID | URL | retrievedAt |
| --- | --- | --- |
| firestore-client-libraries | https://firebase.google.com/docs/firestore/client/libraries | 2026-07-28 |
| firestore-rest | https://firebase.google.com/docs/firestore/use-rest-api | 2026-07-28 |
| firestore-iam | https://firebase.google.com/docs/firestore/security/iam | 2026-07-28 |
| app-check | https://firebase.google.com/docs/app-check | 2026-07-28 |
