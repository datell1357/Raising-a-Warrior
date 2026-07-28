<!-- adr-meta: {"id":"003-idempotency-ledger","status":"accepted","decisionIds":["effect-once","idempotency-conflict","transaction-outbox"],"riskIds":["transport-retry","transaction-retry-side-effect"],"sourceIds":["firestore-transactions","play-billing-security","play-billing-integrate","play-billing-one-time","play-billing-rtdn","play-voided-purchases","admob-unity-ssv","admob-unity-privacy"],"claims":{"transport":"at-least-once","command":"effect-once","rewardedAds":{"consent":"update-each-launch-and-can-request-before-request","nonce":"server-bound-single-consumption","ssv":"signature-key-verified-unmodified-fields","dedupe":"transaction-id","keyCache":"max-24h","callbacks":"idempotent"},"purchases":{"token":"globally-unique-idempotency-key","verify":"play-developer-api","grant":"purchased-only-never-pending","acknowledge":"backend-after-grant-within-3-days","rtdn":"message-id-dedupe-then-api-read","recovery":"authoritative-api-reconciliation","refunds":"voided-refund-chargeback-ledger-reconciliation","clientCallback":"never-grants"}}} -->
# ADR 003: Idempotency And Ledger

## Decision
Transport is at-least-once; commands are effect-once. Dedupe identity is authenticated actor plus operation, commandId, and canonical request hash. An exact retry returns the original committed response; reuse with a different actor, operation, or request hash returns `IdempotencyConflict`; a new command colliding with an already-consumed semantic entitlement returns `AlreadyProcessed`.

Firestore transaction callbacks can retry and must be side-effect free. External effects never occur inside a retryable callback: use transactional outbox or receipt state, then deliver after the state and ledger commit.

Rewarded ads require consent `Update` on each launch and `CanRequestAds` before request. The server issues a nonce bound to authenticated account, placement/ad unit, expected reward, and expiry; it verifies the provider SSV signature/key and unmodified callback fields, deduplicates `transaction_id`, and consumes the nonce once in the effect-once ledger. `user_id` and custom data are correlation only, not trust; cached verification keys are no older than 24 hours and callback retries are idempotent.

Purchase clients submit a purchaseToken; the backend treats it as a globally unique idempotency key and verifies it with the Play Developer API. It grants only `PURCHASED`, never `PENDING`, then acknowledges or consumes after grant within three days. RTDN deduplicates messageId and reads full state from the API; recovery/reconciliation is authoritative API based, and voided, refunded, or chargeback records reconcile entitlement and ledger. Client callbacks never grant.

The following claim table is normative; prose remains explanatory.

| Claim | Value |
| --- | --- |
| transport | at-least-once |
| command | effect-once |
| rewardedAds.consent | update-each-launch-and-can-request-before-request |
| rewardedAds.nonce | server-bound-single-consumption |
| rewardedAds.ssv | signature-key-verified-unmodified-fields |
| rewardedAds.dedupe | transaction-id |
| rewardedAds.keyCache | max-24h |
| rewardedAds.callbacks | idempotent |
| purchases.token | globally-unique-idempotency-key |
| purchases.verify | play-developer-api |
| purchases.grant | purchased-only-never-pending |
| purchases.acknowledge | backend-after-grant-within-3-days |
| purchases.rtdn | message-id-dedupe-then-api-read |
| purchases.recovery | authoritative-api-reconciliation |
| purchases.refunds | voided-refund-chargeback-ledger-reconciliation |
| purchases.clientCallback | never-grants |

## Consequences
Every debit, grant, entitlement, or state transition has one ledger/audit record and safe retry behavior. A rejected command leaves authoritative state unchanged and creates no orphan debit, grant, or ledger effect.

## Risks And Controls
Transport retry is controlled by the command ledger. Transaction retry side effects are controlled by the outbox/receipt boundary.

## Sources
| Source ID | URL | retrievedAt |
| --- | --- | --- |
| firestore-transactions | https://firebase.google.com/docs/firestore/manage-data/transactions | 2026-07-28 |
| play-billing-security | https://developer.android.com/google/play/billing/security | 2026-07-28 |
| play-billing-integrate | https://developer.android.com/google/play/billing/integrate | 2026-07-28 |
| play-billing-one-time | https://developer.android.com/google/play/billing/lifecycle/one-time | 2026-07-28 |
| play-billing-rtdn | https://developer.android.com/google/play/billing/rtdn-reference | 2026-07-28 |
| play-voided-purchases | https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.voidedpurchases/list | 2026-07-28 |
| admob-unity-ssv | https://developers.google.com/admob/unity/ssv | 2026-07-28 |
| admob-unity-privacy | https://developers.google.com/admob/unity/privacy | 2026-07-28 |
