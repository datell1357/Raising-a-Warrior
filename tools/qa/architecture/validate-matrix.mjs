import { EXCLUDED_SPECS, MUTATION_KEYS, OFFICIAL_SOURCES } from './constants.mjs';
import { array, childPointer, exactKeys, fail, object, sameArray, string, uniqueStrings, valueIn } from './contract-utils.mjs';
import { expectedMutationProfile } from './mutation-profiles.mjs';

const OWNERS = ['Identity', 'Privacy', 'Combat', 'Progression', 'Economy', 'Content', 'Commerce', 'Operations', 'Profile'];
const ROLE_NAMES = { 플레이어: 'player', 운영자: 'operator', 고객지원: 'customer-support' };

function validateSources(sources) {
  const entries = array(sources, '/sourceRegistry');
  if (entries.length !== OFFICIAL_SOURCES.length) fail('OFFICIAL_SOURCE_COVERAGE', '/sourceRegistry', 'official source registry length differs from canonical list');
  const ids = [];
  for (let index = 0; index < entries.length; index += 1) {
    const at = `/sourceRegistry/${index}`;
    const entry = exactKeys(entries[index], ['id', 'url', 'retrievedAt'], at);
    const [expectedId, expectedUrl] = OFFICIAL_SOURCES[index];
    const id = string(entry.id, childPointer(at, 'id'));
    if (id !== expectedId) fail('OFFICIAL_SOURCE_ID', childPointer(at, 'id'), `expected official source ${expectedId}`);
    const url = string(entry.url, childPointer(at, 'url'));
    if (url !== expectedUrl) fail('OFFICIAL_SOURCE_URL', childPointer(at, 'url'), `expected canonical URL for ${expectedId}`);
    if (entry.retrievedAt !== '2026-07-28') fail('OFFICIAL_SOURCE_RETRIEVED_AT', childPointer(at, 'retrievedAt'), 'official sources must record the required retrieval date');
    ids.push(id);
  }
  uniqueStrings(ids, '/sourceRegistry', 'OFFICIAL_SOURCE_DUPLICATE');
  return new Set(ids);
}

function validatePolicy(policy) {
  const record = object(policy, '/policy');
  if ('fixedOfflineRewardCapSeconds' in record || 'offlineRewardCapSeconds' in record) fail('FIXED_OFFLINE_CAP', '/policy/fixedOfflineRewardCapSeconds', 'offline cap must only come from immutable content');
  exactKeys(record, ['authoritativeStateWrite', 'firestoreClientAuthorityWrites', 'adminAccess', 'combat', 'offlineRewardCapSource', 'webGameplay', 'playerSeasonPass', 'api36Extension', 'idempotency'], '/policy');
  const expected = {
    authoritativeStateWrite: 'server-command-only', firestoreClientAuthorityWrites: 'denied', adminAccess: 'iam-explicit', combat: 'server-validated-20-tick-fixed-point', offlineRewardCapSource: 'immutable-catalog.offlineRewardCapSeconds', webGameplay: 'forbidden', playerSeasonPass: 'forbidden', api36Extension: 'live-play-console-evidence-required',
  };
  if (record.api36Extension === 'assumed-approved') fail('ASSUMED_API_EXTENSION', '/policy/api36Extension', 'API extension requires live Play Console evidence');
  for (const [key, value] of Object.entries(expected)) if (record[key] !== value) fail('FORBIDDEN_POLICY', `/policy/${key}`, `policy must be ${value}`);
  const idem = exactKeys(record.idempotency, ['dedupeIdentity', 'exactRetry', 'mismatch', 'semanticCollision', 'transactionCallback', 'externalEffects'], '/policy/idempotency');
  sameArray(idem.dedupeIdentity, ['authenticatedActor', 'operation', 'commandId', 'canonicalRequestHash'], '/policy/idempotency/dedupeIdentity', 'IDEMPOTENCY_IDENTITY');
  if (idem.exactRetry !== 'return-original-committed-response' || idem.mismatch !== 'IdempotencyConflict' || idem.semanticCollision !== 'AlreadyProcessed') fail('IDEMPOTENCY_POLICY', '/policy/idempotency', 'idempotency contract drifted');
  if (idem.transactionCallback !== 'side-effect-free') fail('TRANSACTION_SIDE_EFFECT', '/policy/idempotency/transactionCallback', 'transaction callbacks must be side-effect free');
  if (idem.externalEffects !== 'transactional-outbox-or-receipt-state') fail('OUTBOX_POLICY', '/policy/idempotency/externalEffects', 'external effects require outbox or receipt state');
}

function validateMutation(row, at, oracle) {
  if (!('serverOwner' in row) || (Array.isArray(row.serverOwner) && row.serverOwner.length !== 1)) fail('SERVER_OWNER_COUNT', `${at}/serverOwner`, 'each mutation requires exactly one server owner');
  if (!('zeroMutationFailure' in row)) fail('MISSING_ZERO_MUTATION_FAILURE', `${at}/zeroMutationFailure`, 'every mutation requires zero-mutation failure behavior');
  const mutation = exactKeys(row, MUTATION_KEYS, at);
  if (mutation.specId !== oracle.id) fail('MUTATION_SPEC_ORDER', `${at}/specId`, 'mutation spec order differs from canonical flow');
  if (mutation.label !== oracle.label) fail('MUTATION_LABEL_DRIFT', `${at}/label`, 'mutation label differs from canonical flow');
  sameArray(mutation.actorRoles, oracle.roles.map((role) => ROLE_NAMES[role]), `${at}/actorRoles`, 'MUTATION_ACTOR_DRIFT');
  sameArray(mutation.devices, oracle.devices, `${at}/devices`, 'MUTATION_DEVICE_DRIFT');
  valueIn(mutation.serverOwner, OWNERS, `${at}/serverOwner`, 'INVALID_SERVER_OWNER');
  const profile = expectedMutationProfile(mutation.specId, oracle.label);
  if (mutation.serverOwner !== profile.serverOwner) fail('SERVER_OWNER_DRIFT', `${at}/serverOwner`, 'server owner differs from frozen per-spec contract');
  if (mutation.authBoundary !== profile.authBoundary) fail('AUTH_BOUNDARY', `${at}/authBoundary`, 'auth boundary differs from frozen per-spec contract');
  if (mutation.appCheckIntegrity !== profile.appCheckIntegrity) fail('MISSING_APP_CHECK_INTEGRITY', `${at}/appCheckIntegrity`, 'App Check policy differs from frozen per-spec contract');
  for (const [key, value] of Object.entries({ serverTimePolicy: 'server-authoritative', contentCatalogPolicy: 'immutable-versioned-catalog', stateVersionPolicy: 'optimistic-state-version', transactionBoundary: 'atomic-authority-transaction', ledgerAudit: 'command-ledger-and-audit', replay: 'effect-once-command', writePath: 'server-command-only' })) if (mutation[key] !== value) fail(key === 'replay' ? 'REPLAY_SECOND_EFFECT' : 'MUTATION_POLICY', `${at}/${key}`, `invalid ${key}`);
  const success = exactKeys(mutation.successEffect, ['authorityCommit', 'clientWalletAuthority', 'trustedClientVictory', 'webGameplay', 'playerFacingSeasonPass', 'summary'], `${at}/successEffect`);
  if (success.clientWalletAuthority) fail('CLIENT_OWNED_WALLET', `${at}/successEffect/clientWalletAuthority`, 'client wallet authority is forbidden');
  if (success.trustedClientVictory) fail('TRUSTED_CLIENT_VICTORY', `${at}/successEffect/trustedClientVictory`, 'client victory must be server validated');
  if (success.webGameplay) fail('WEB_GAMEPLAY', `${at}/successEffect/webGameplay`, 'Web gameplay is forbidden');
  if (success.playerFacingSeasonPass) fail('PLAYER_SEASON_PASS', `${at}/successEffect/playerFacingSeasonPass`, 'player season-pass lifecycle is forbidden');
  if (success.authorityCommit !== true) fail('MUTATION_POLICY', `${at}/successEffect/authorityCommit`, 'success requires an authority commit');
  string(success.summary, `${at}/successEffect/summary`);
  if (mutation.classification !== profile.classification) fail('MUTATION_CLASSIFICATION', `${at}/classification`, 'mutation classification differs from frozen per-spec contract');
  if (mutation.classificationRationale !== profile.classificationRationale) fail('MUTATION_CLASSIFICATION_RATIONALE', `${at}/classificationRationale`, 'classification rationale differs from frozen per-spec contract');
  sameArray(mutation.securityProofs, profile.securityProofs, `${at}/securityProofs`, 'SECURITY_PROOF_DRIFT');
  if (JSON.stringify(mutation.commerceProof) !== JSON.stringify(profile.commerceProof)) fail('COMMERCE_PROOF_DRIFT', `${at}/commerceProof`, 'commerce proof differs from frozen contract');
  const failure = exactKeys(mutation.zeroMutationFailure, ['authoritativeState', 'orphanEffects', 'outcome', 'retry'], `${at}/zeroMutationFailure`);
  if (failure.authoritativeState !== 'unchanged' || failure.orphanEffects !== 'none' || failure.outcome !== 'deterministic-error-or-status' || failure.retry !== 'safe') fail('ZERO_MUTATION_FAILURE', `${at}/zeroMutationFailure`, 'failure behavior must preserve authoritative state and safe retries');
}

export function validateMatrix(matrix, references) {
  exactKeys(matrix, ['schemaVersion', 'canonicalBindings', 'sourceRegistry', 'adrRegistry', 'policy', 'exclusions', 'mutations'], '');
  if (matrix.schemaVersion !== 'warrior-mutation-matrix/v1') fail('INVALID_MATRIX_SCHEMA', '/schemaVersion', 'unsupported mutation matrix schema');
  const sourceIds = validateSources(matrix.sourceRegistry);
  validatePolicy(matrix.policy);
  const exclusions = array(matrix.exclusions, '/exclusions');
  if (exclusions.length !== EXCLUDED_SPECS.length) fail('EXCLUSION_COVERAGE', '/exclusions', 'expected exactly five display-only exclusions');
  const exclusionIds = exclusions.map((entry, index) => {
    const at = `/exclusions/${index}`;
    const item = exactKeys(entry, ['specId', 'reason'], at);
    string(item.reason, `${at}/reason`);
    return item.specId;
  });
  sameArray(exclusionIds, EXCLUDED_SPECS, '/exclusions', 'EXCLUSION_COVERAGE');
  const expected = references.scope.specs.filter((specId) => !EXCLUDED_SPECS.includes(specId));
  const flowRows = new Map(references.flow.specs.map((spec) => [spec.id, spec]));
  const mutations = array(matrix.mutations, '/mutations');
  if (mutations.length !== expected.length) fail('MUTATION_COVERAGE', '/mutations', 'expected exactly fifty persisted mutations');
  const pendingIds = new Set();
  for (let index = 0; index < mutations.length; index += 1) {
    const specId = mutations[index]?.specId;
    if (pendingIds.has(specId)) fail('DUPLICATE_MUTATION_SPEC', `/mutations/${index}/specId`, `duplicate mutation spec ${String(specId)}`);
    pendingIds.add(specId);
  }
  const ids = [];
  for (let index = 0; index < mutations.length; index += 1) {
    const at = `/mutations/${index}`;
    const candidate = object(mutations[index], at);
    const oracle = flowRows.get(expected[index]);
    if (!oracle) fail('CANONICAL_FLOW_UNREADABLE', at, 'canonical flow spec is absent');
    validateMutation(candidate, at, oracle);
    ids.push(candidate.specId);
  }
  uniqueStrings(ids, '/mutations', 'DUPLICATE_MUTATION_SPEC');
  sameArray(ids, expected, '/mutations', 'MUTATION_SPEC_ORDER');
  return sourceIds;
}
