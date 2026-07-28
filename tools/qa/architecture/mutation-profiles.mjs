const OWNER_GROUPS = {
  Identity: ['S-LVWHIB', 'NS-SESSION-RECONNECT', 'S-TGKDXL'],
  Privacy: ['S-RVSTQT', 'S-XJSOJJ', 'NS-WEB-DELETE'],
  Combat: ['S-YFLBRX', 'NS-AUTO-FARM', 'NS-SKILL-AUTO'],
  Progression: ['S-VLJARV', 'S-LXSNDL', 'NS-DAILY-WEEKLY', 'NS-ACHIEVEMENT', 'NS-ATTENDANCE', 'S-TWOQHT', 'NS-RESEARCH', 'NS-PROMOTION', 'S-LPEJNI', 'NS-SKILL-UPGRADE', 'NS-SKILL-LOADOUT', 'S-XANCZD', 'NS-EQUIP-LOCK', 'NS-EQUIP-UPGRADE', 'NS-EQUIP-FUSION'],
  Economy: ['S-AOQYYC', 'NS-DRAW-TEN', 'NS-DRAW-RECOVERY', 'NS-STORE-DAILY', 'NS-MAIL-CLAIM'],
  Content: ['S-UHNSOK', 'NS-CELL-PROGRESS', 'S-AJNKBZ', 'NS-CONTENT-ROLLBACK', 'NS-SCHEDULED-UNLOCK', 'NS-EVENT-PARTICIPATE'],
  Commerce: ['S-IRLFRY', 'S-OJRSXR', 'NS-IAP-RECOVERY', 'NS-IAP-REFUND'],
  Operations: ['S-AJLBYA', 'NS-MAIL-PUBLISH', 'NS-MAINTENANCE', 'S-AHBKUR', 'NS-ATTENDANCE-GATE', 'NS-SEASON-GATE', 'S-MXZRCE', 'S-BSTFCP'],
  Profile: ['NS-LOCALE-SELECT', 'NS-A11Y-SETTINGS', 'NS-POWER-SAVE'],
};

export const OWNER_BY_SPEC = Object.fromEntries(Object.entries(OWNER_GROUPS).flatMap(([owner, specs]) => specs.map((spec) => [spec, owner])));

export const BORDERLINE_RATIONALES = {
  'NS-SESSION-RECONNECT': 'Rotates or records server session restoration metadata only; never overwrites progression.',
  'NS-DRAW-RECOVERY': 'Atomically acknowledges or reopens an existing receipt without a second grant.',
  'S-UHNSOK': 'Persists current eligible stage and token basis; locked selection writes nothing.',
  'NS-SCHEDULED-UNLOCK': 'Persists account compatibility and unlock basis at server date; early or old client writes nothing.',
  'NS-POWER-SAVE': 'Persists Profile preference only; authoritative elapsed time continues.',
};

export const COMMERCE_PROOFS = {
  'S-IRLFRY': { kind: 'rewarded-ad', consent: 'update-each-launch-and-can-request-before-request', nonce: 'server-bound-account-placement-ad-unit-reward-expiry', ssv: 'signature-key-verified-unmodified-fields', dedupe: 'transaction-id-and-nonce-single-consumption' },
  'S-OJRSXR': { kind: 'purchase', token: 'globally-unique-idempotency-key', verify: 'play-developer-api', grant: 'purchased-only-never-pending', acknowledge: 'backend-after-grant-within-3-days' },
  'NS-IAP-RECOVERY': { kind: 'purchase-recovery', reconciliation: 'authoritative-api-reconciliation', token: 'purchase-token-dedupe', grant: 'purchased-only-never-pending' },
  'NS-IAP-REFUND': { kind: 'purchase-refund', reconciliation: 'authoritative-api-reconciliation', voided: 'voided-purchase-reconciliation', ledger: 'entitlement-ledger-reconciliation' },
};

const WEB_ONLY_SPECS = new Set([
  'NS-WEB-DELETE',
  'S-AJNKBZ',
  'NS-CONTENT-ROLLBACK',
  'NS-IAP-REFUND',
  'S-AJLBYA',
  'NS-MAIL-PUBLISH',
  'NS-MAINTENANCE',
  'S-AHBKUR',
  'NS-ATTENDANCE-GATE',
  'NS-SEASON-GATE',
  'S-MXZRCE',
  'S-BSTFCP',
]);

const ANDROID_PROOFS = ['firebase-auth', 'app-check-play-integrity', 'command-id', 'expected-state-version'];
const WEB_PROOFS = ['authenticated-session', 'rbac', 'audit'];

function expectedSecurityProofs(specId) {
  const proofs = specId === 'NS-IAP-RECOVERY'
    ? [...ANDROID_PROOFS, ...WEB_PROOFS]
    : WEB_ONLY_SPECS.has(specId) ? [...WEB_PROOFS] : [...ANDROID_PROOFS];
  if (['NS-WEB-DELETE', 'NS-IAP-RECOVERY', 'NS-IAP-REFUND'].includes(specId)) proofs.push('verified-delegation');
  if (specId === 'S-IRLFRY') proofs.push('consent-gate', 'server-nonce', 'nonce-expiry', 'provider-ssv-signature', 'transaction-id-dedupe', 'nonce-single-consumption');
  if (specId === 'S-OJRSXR') proofs.push('purchase-token', 'play-developer-api', 'purchased-state', 'backend-acknowledgement', 'purchase-token-dedupe');
  if (specId === 'NS-IAP-RECOVERY') proofs.push('authoritative-api-reconciliation');
  if (specId === 'NS-IAP-REFUND') proofs.push('authoritative-api-reconciliation', 'voided-purchase-reconciliation');
  if (['S-YFLBRX', 'NS-AUTO-FARM', 'NS-CELL-PROGRESS'].includes(specId)) proofs.push('signed-stage-token', 'server-replay');
  return proofs;
}

export function expectedMutationProfile(specId, label) {
  const webOnly = WEB_ONLY_SPECS.has(specId);
  return {
    serverOwner: OWNER_BY_SPEC[specId],
    authBoundary: specId === 'NS-WEB-DELETE' ? 'firebase-auth-or-verified-rbac-delegation' : specId === 'NS-IAP-RECOVERY' ? 'firebase-auth-and-web-rbac-delegation' : webOnly ? 'authenticated-rbac-delegation' : 'firebase-auth',
    appCheckIntegrity: specId === 'NS-IAP-RECOVERY' ? 'required-play-integrity-and-web-rbac' : webOnly ? 'not-applicable-web' : 'required-play-integrity',
    classification: 'persisted-authority-command',
    classificationRationale: BORDERLINE_RATIONALES[specId] ?? `Persists the authoritative result of ${label} through a server command.`,
    securityProofs: expectedSecurityProofs(specId),
    commerceProof: COMMERCE_PROOFS[specId] ?? null,
  };
}
