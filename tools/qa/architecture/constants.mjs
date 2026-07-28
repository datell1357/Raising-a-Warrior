export const EXCLUDED_SPECS = [
  'NS-DRAW-ODDS',
  'NS-COST-ALERT',
  'NS-NOTICE-VIEW',
  'NS-LOCALE-RENDER',
  'NS-SAFEAREA-PANEL',
];

export const OFFICIAL_SOURCES = [
  ['firestore-transactions', 'https://firebase.google.com/docs/firestore/manage-data/transactions'],
  ['firestore-client-libraries', 'https://firebase.google.com/docs/firestore/client/libraries'],
  ['firestore-rest', 'https://firebase.google.com/docs/firestore/use-rest-api'],
  ['firestore-iam', 'https://firebase.google.com/docs/firestore/security/iam'],
  ['app-check-play-integrity', 'https://firebase.google.com/docs/app-check/android/play-integrity-provider'],
  ['app-check', 'https://firebase.google.com/docs/app-check'],
  ['auth-unity', 'https://firebase.google.com/docs/auth/unity/manage-users'],
  ['auth-admin', 'https://firebase.google.com/docs/auth/admin/manage-users'],
  ['emulator-firestore', 'https://firebase.google.com/docs/emulator-suite/connect_firestore'],
  ['emulator-rules', 'https://firebase.google.com/docs/rules/emulator-setup'],
  ['play-target-api', 'https://support.google.com/googleplay/android-developer/answer/11926878?hl=en'],
  ['play-account-deletion', 'https://support.google.com/googleplay/android-developer/answer/10144311?hl=en'],
  ['play-data-safety', 'https://support.google.com/googleplay/android-developer/answer/10787469?hl=en'],
  ['android-apk-splits', 'https://developer.android.com/build/configure-apk-splits'],
  ['play-aab-size', 'https://support.google.com/googleplay/android-developer/answer/9859152?hl=en'],
  ['play-app-signing', 'https://support.google.com/googleplay/android-developer/answer/9842756?hl=en'],
  ['android-64-bit', 'https://developer.android.com/google/play/requirements/64-bit'],
  ['android-abis', 'https://developer.android.com/ndk/guides/abis'],
  ['unity-fixed-updates', 'https://docs.unity3d.com/6/Documentation/Manual/fixed-updates.html'],
  ['unity-physics-manual', 'https://docs.unity3d.com/6/Documentation/Manual/physics-optimization-cpu-manual-simulation.html'],
  ['unity-fixed-delta', 'https://docs.unity3d.com/6/Documentation/ScriptReference/Time-fixedDeltaTime.html'],
  ['play-billing-security', 'https://developer.android.com/google/play/billing/security'],
  ['play-billing-integrate', 'https://developer.android.com/google/play/billing/integrate'],
  ['play-billing-one-time', 'https://developer.android.com/google/play/billing/lifecycle/one-time'],
  ['play-billing-rtdn', 'https://developer.android.com/google/play/billing/rtdn-reference'],
  ['play-voided-purchases', 'https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.voidedpurchases/list'],
  ['admob-unity-ssv', 'https://developers.google.com/admob/unity/ssv'],
  ['admob-unity-privacy', 'https://developers.google.com/admob/unity/privacy'],
];

export const OFFICIAL_SOURCE_URL_BY_ID = Object.fromEntries(OFFICIAL_SOURCES);

export const PREREQUISITE_CONTRACTS = [
  { id: 'play-console-app', category: 'Play Console', ownerRole: 'release-engineering', blockingCommand: 'bun run verify:android-release', proofRequired: 'Live Play Console app record for the production package.', sourceUrl: 'https://support.google.com/googleplay/android-developer/answer/11926878?hl=en', proofKind: 'play-console-app-record' },
  { id: 'android-package-name', category: 'Android identity', ownerRole: 'release-engineering', blockingCommand: 'bun run verify:android-release', proofRequired: 'Approved immutable Android application ID recorded in release evidence.', sourceUrl: null, proofKind: 'android-package-record' },
  { id: 'play-app-signing-custody', category: 'Play signing', ownerRole: 'release-engineering', blockingCommand: 'bun run verify:android-release', proofRequired: 'Play App Signing enrollment and upload-key custody evidence, without key material.', sourceUrl: 'https://support.google.com/googleplay/android-developer/answer/9842756?hl=en', proofKind: 'play-app-signing-custody' },
  { id: 'api36-extension-eligibility', category: 'Play policy', ownerRole: 'release-engineering', blockingCommand: 'bun run verify:android-release', proofRequired: 'Live Play Console eligibility and approval evidence for any API 36 deadline extension.', sourceUrl: 'https://support.google.com/googleplay/android-developer/answer/11926878?hl=en', proofKind: 'play-api-extension-approval' },
  { id: 'firebase-dev-project', category: 'Firebase environment', ownerRole: 'backend', blockingCommand: 'bun run test:firebase-baseline -- --environment=dev', proofRequired: 'Non-production Firebase project identity and access evidence.', sourceUrl: 'https://firebase.google.com/docs/firestore/security/iam', proofKind: 'firebase-project-access' },
  { id: 'firebase-stage-project', category: 'Firebase environment', ownerRole: 'backend', blockingCommand: 'bun run test:firebase-baseline -- --environment=stage', proofRequired: 'Staging Firebase project identity and access evidence.', sourceUrl: 'https://firebase.google.com/docs/firestore/security/iam', proofKind: 'firebase-project-access' },
  { id: 'firebase-prod-project', category: 'Firebase environment', ownerRole: 'backend', blockingCommand: 'bun run test:firebase-baseline -- --environment=prod', proofRequired: 'Production Firebase project identity and approved access evidence.', sourceUrl: 'https://firebase.google.com/docs/firestore/security/iam', proofKind: 'firebase-project-access' },
  { id: 'firebase-service-identities', category: 'Firebase IAM', ownerRole: 'backend', blockingCommand: 'bun run test:firebase-baseline', proofRequired: 'Least-privilege server service identity inventory and IAM binding evidence.', sourceUrl: 'https://firebase.google.com/docs/firestore/security/iam', proofKind: 'firebase-iam-inventory' },
  { id: 'app-check-play-integrity', category: 'Attestation', ownerRole: 'backend', blockingCommand: 'bun run test:firebase-baseline -- --requires=app-check', proofRequired: 'App Check enforcement and Play Integrity provider setup evidence for the production Android app.', sourceUrl: 'https://firebase.google.com/docs/app-check/android/play-integrity-provider', proofKind: 'app-check-play-integrity-setup' },
  { id: 'billing-tester-products', category: 'Billing', ownerRole: 'product', blockingCommand: 'bun run verify:commerce -- --requires=billing', proofRequired: 'Licensed tester and approved product catalog evidence without tester identities or purchase data.', sourceUrl: 'https://developer.android.com/google/play/billing/integrate', proofKind: 'billing-tester-products' },
  { id: 'ads-ssv-tester', category: 'Advertising', ownerRole: 'product', blockingCommand: 'bun run verify:commerce -- --requires=ads-ssv', proofRequired: 'Rewarded ad server-side verification configuration and test evidence without credentials.', sourceUrl: 'https://developers.google.com/admob/unity/ssv', proofKind: 'admob-ssv-tester' },
  { id: 'deletion-web-url-domain', category: 'Privacy', ownerRole: 'legal-privacy', blockingCommand: 'bun run verify:privacy -- --requires=deletion-url', proofRequired: 'Public account deletion Web URL and controlled domain evidence.', sourceUrl: 'https://support.google.com/googleplay/android-developer/answer/10144311?hl=en', proofKind: 'deletion-web-url-domain' },
  { id: 'data-safety-privacy-approval', category: 'Privacy', ownerRole: 'legal-privacy', blockingCommand: 'bun run verify:privacy -- --requires=data-safety', proofRequired: 'Approved Data Safety declaration and privacy review evidence.', sourceUrl: 'https://support.google.com/googleplay/android-developer/answer/10787469?hl=en', proofKind: 'data-safety-privacy-approval' },
  { id: 'device-lab', category: 'Device QA', ownerRole: 'qa', blockingCommand: 'bun run verify:android -- --variant=release', proofRequired: 'Representative physical-device or managed device lab results for supported aspect ratios.', sourceUrl: null, proofKind: 'device-lab-results' },
  { id: 'bundletool-play-size-export', category: 'Release size', ownerRole: 'release-engineering', blockingCommand: 'bun run verify:android-release -- --requires=size-export', proofRequired: 'bundletool and Play size export evidence for the release candidate; historical thresholds are not submission proof.', sourceUrl: 'https://support.google.com/googleplay/android-developer/answer/9859152?hl=en', proofKind: 'bundletool-play-size-export' },
  { id: 'production-alert-telemetry-access', category: 'Operations', ownerRole: 'operations', blockingCommand: 'bun run verify:operations -- --requires=telemetry', proofRequired: 'Approved production telemetry and alert access evidence without account credentials.', sourceUrl: null, proofKind: 'production-alert-telemetry-access' },
];

export const ADR_REQUIREMENTS = {
  '001-authority': ['server-authority', 'firestore-client-deny', 'iam-explicit'],
  '002-deterministic-combat': ['fixed-point-20-tick', 'signed-start-stage', 'server-replay'],
  '003-idempotency-ledger': ['effect-once', 'idempotency-conflict', 'transaction-outbox'],
  '004-content-versioning': ['immutable-content', 'optimistic-state', 'catalog-offline-cap'],
  '005-privacy-delete': ['consent-gating', 'verified-delegation', 'deletion-lifecycle'],
  '006-platform-policy': ['api-36-baseline', 'extension-evidence', 'external-blocked'],
};

export const ADR_CONTRACTS = [
  { id: '001-authority', path: 'docs/architecture/adr/001-authority.md', title: 'Authority Boundary', decisionIds: ['server-authority', 'firestore-client-deny', 'iam-explicit'], riskIds: ['client-write-bypass', 'privileged-access-confusion'], sourceIds: ['firestore-client-libraries', 'firestore-rest', 'firestore-iam', 'app-check'] },
  { id: '002-deterministic-combat', path: 'docs/architecture/adr/002-deterministic-combat.md', title: 'Deterministic Combat', decisionIds: ['fixed-point-20-tick', 'signed-start-stage', 'server-replay'], riskIds: ['client-result-forgery', 'engine-timing-drift'], sourceIds: ['unity-fixed-updates', 'unity-physics-manual', 'unity-fixed-delta'] },
  { id: '003-idempotency-ledger', path: 'docs/architecture/adr/003-idempotency-ledger.md', title: 'Idempotency and Ledger', decisionIds: ['effect-once', 'idempotency-conflict', 'transaction-outbox'], riskIds: ['transport-retry', 'transaction-retry-side-effect'], sourceIds: ['firestore-transactions', 'play-billing-security', 'play-billing-integrate', 'play-billing-one-time', 'play-billing-rtdn', 'play-voided-purchases', 'admob-unity-ssv', 'admob-unity-privacy'] },
  { id: '004-content-versioning', path: 'docs/architecture/adr/004-content-versioning.md', title: 'Content Versioning', decisionIds: ['immutable-content', 'optimistic-state', 'catalog-offline-cap'], riskIds: ['catalog-rollback', 'stale-client'], sourceIds: ['firestore-transactions'] },
  { id: '005-privacy-delete', path: 'docs/architecture/adr/005-privacy-delete.md', title: 'Privacy and Deletion', decisionIds: ['consent-gating', 'verified-delegation', 'deletion-lifecycle'], riskIds: ['unauthorized-deletion', 'incomplete-third-party-propagation'], sourceIds: ['auth-unity', 'auth-admin', 'play-account-deletion', 'play-data-safety'] },
  { id: '006-platform-policy', path: 'docs/architecture/adr/006-platform-policy.md', title: 'Android and Play Policy', decisionIds: ['api-36-baseline', 'extension-evidence', 'external-blocked'], riskIds: ['submission-policy-drift', 'missing-console-prerequisite'], sourceIds: ['play-target-api', 'play-app-signing', 'play-aab-size', 'android-apk-splits', 'android-64-bit', 'android-abis', 'app-check-play-integrity', 'emulator-firestore', 'emulator-rules'] },
];

export const SOURCE_CLAIM_CONTRACTS = [
  { id: 'play-billing-security', url: 'https://developer.android.com/google/play/billing/security', retrievedAt: '2026-07-28', facts: ['backend-receives-purchase-token', 'purchase-token-globally-unique-primary-idempotency-key', 'verify-with-play-developer-api', 'grant-purchased-only-not-pending'], caveats: [] },
  { id: 'play-billing-integrate', url: 'https://developer.android.com/google/play/billing/integrate', retrievedAt: '2026-07-28', facts: ['acknowledge-after-entitlement-within-3-days', 'grant-purchased-only'], caveats: ['pending-purchases-require-resolution-window'] },
  { id: 'play-billing-one-time', url: 'https://developer.android.com/google/play/billing/lifecycle/one-time', retrievedAt: '2026-07-28', facts: ['acknowledge-non-consumable-or-consume-consumable', 'no-acknowledgement-within-3-days-causes-refund-or-revocation'], caveats: [] },
  { id: 'play-billing-rtdn', url: 'https://developer.android.com/google/play/billing/rtdn-reference', retrievedAt: '2026-07-28', facts: ['deduplicate-message-id', 'read-authoritative-state-from-api'], caveats: ['notification-is-not-full-purchase-state'] },
  { id: 'play-voided-purchases', url: 'https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.voidedpurchases/list', retrievedAt: '2026-07-28', facts: ['reconcile-canceled-refunded-and-chargeback-entitlements'], caveats: ['voided-purchase-record-identity-must-remain-unique-for-reconciliation'] },
  { id: 'admob-unity-ssv', url: 'https://developers.google.com/admob/unity/ssv', retrievedAt: '2026-07-28', facts: ['verify-signature-and-key', 'preserve-callback-query-fields-except-signature-and-key-id', 'deduplicate-transaction-id', 'cache-verification-keys-at-most-24-hours', 'handle-callback-retries'], caveats: ['nonce-expiry-and-single-consumption-are-application-architecture', 'user-id-and-custom-data-are-not-trust'] },
  { id: 'admob-unity-privacy', url: 'https://developers.google.com/admob/unity/privacy', retrievedAt: '2026-07-28', facts: ['update-consent-each-app-launch', 'check-can-request-ads-before-request'], caveats: [] },
];

export const MUTATION_KEYS = [
  'specId',
  'label',
  'actorRoles',
  'devices',
  'serverOwner',
  'authBoundary',
  'appCheckIntegrity',
  'serverTimePolicy',
  'contentCatalogPolicy',
  'stateVersionPolicy',
  'transactionBoundary',
  'ledgerAudit',
  'replay',
  'writePath',
  'successEffect',
  'zeroMutationFailure',
  'classification',
  'classificationRationale',
  'securityProofs',
  'commerceProof',
];

export const PREREQUISITE_KEYS = [
  'id',
  'category',
  'ownerRole',
  'status',
  'blockingCommand',
  'proofRequired',
  'sourceUrl',
  'proofKind',
  'verification',
];

export const CANONICAL_BINDINGS = [
  ['docs/Manyfast/워리어 키우기_PRD.md', 'e5022e677825192b0c1556c0d0a8dba62ecc169dbe5e848a361964b600636aa0'],
  ['docs/Manyfast/워리어 키우기_기능명세서.md', 'ae62160348dd60473fa3e2533aa118102cd5d1ac40c20af4e304df74822c42d0'],
  ['docs/Manyfast/워리어 키우기_유저플로우.md', 'd641842f326d9643fb48a43fdaf0fef28e90ba963859bd595db8bfbaad5ca406'],
  ['docs/production/scope-contract.json', '96a98565799a4f042ceb8ad5e6b72af16b738c468d816ed046b76b819923e0c2'],
  ['content/contracts/command.schema.json', '233d8a0ed5d4a8e04273661c5c0e74a7d8a89b7d59233c2d80cacbd787f8b3c9'],
  ['.omo/evidence/implementation/20260727T000000Z/contracts/a14/task-3/artifact-hashes.json', '9718320d9dc99bcfef744956b1279fcc99cb3982cd731b73611293d63f5d18b5'],
];

export const ADR_CLAIMS = {
  '001-authority': { authority: 'server-only', firestoreAuthorityWrites: 'denied', iam: 'explicit' },
  '002-deterministic-combat': { simulation: 'fixed-point-20-tick', stageToken: 'signed-and-bound', result: 'server-bounded-replay' },
  '003-idempotency-ledger': { transport: 'at-least-once', command: 'effect-once', rewardedAds: { consent: 'update-each-launch-and-can-request-before-request', nonce: 'server-bound-single-consumption', ssv: 'signature-key-verified-unmodified-fields', dedupe: 'transaction-id', keyCache: 'max-24h', callbacks: 'idempotent' }, purchases: { token: 'globally-unique-idempotency-key', verify: 'play-developer-api', grant: 'purchased-only-never-pending', acknowledge: 'backend-after-grant-within-3-days', rtdn: 'message-id-dedupe-then-api-read', recovery: 'authoritative-api-reconciliation', refunds: 'voided-refund-chargeback-ledger-reconciliation', clientCallback: 'never-grants' } },
  '004-content-versioning': { content: 'immutable', state: 'optimistic-versioned', offlineCap: 'immutable-catalog-only' },
  '005-privacy-delete': { consent: 'versioned-gate', delegation: 'verified-only', lifecycle: 'submitted-in-progress-completed' },
  '006-platform-policy': { api: '36-on-or-after-2026-08-31', extension: 'live-console-evidence-only', missingPrerequisites: 'blocked' },
};
