#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { ContractError, array, exactKeys, fail, object, string } from './contract-utils.mjs';
import { SECRET_RULES } from './candidate-validator.mjs';
import { assertSafePath } from './path-safety.mjs';

const root = resolve(process.cwd());
const evidenceRoot = resolve(root, '.omo/evidence');
const defaultManifest = 'tools/qa/repository/negative-fixtures.json';
const defaultValidator = 'tools/qa/repository/validate-candidate.mjs';
const validatorTimeoutMs = 5000;
const secretRuleIds = SECRET_RULES.map(({ id }) => id);
const secretRuleIdSet = new Set(secretRuleIds);
const canonicalCandidateFixtureInventory = Object.freeze([
  Object.freeze({ id: 'seeded-secret', path: 'tools/qa/repository/fixtures/negative/seeded-secret.json', expect: Object.freeze({ code: 'SECRET_DETECTED', pointer: '/files/release~1environments~1prod.json/content' }) }),
  Object.freeze({ id: 'forbidden-asmdef-edge', path: 'tools/qa/repository/fixtures/negative/forbidden-asmdef-edge.json', expect: Object.freeze({ code: 'ASMDEF_FORBIDDEN_REFERENCE', pointer: '/assemblies/Warrior.Domain/references/0' }) }),
  Object.freeze({ id: 'dev-endpoint-in-prod', path: 'tools/qa/repository/fixtures/negative/dev-endpoint-in-prod.json', expect: Object.freeze({ code: 'PROD_DEV_ENDPOINT', pointer: '/environments/prod/parameterRefs/apiBaseUrl' }) }),
  Object.freeze({ id: 'relaxed-ts-strictness', path: 'tools/qa/repository/fixtures/negative/relaxed-ts-strictness.json', expect: Object.freeze({ code: 'TS_STRICT_DISABLED', pointer: '/typescript/projects/backend~1functions/compilerOptions/strict' }) }),
  Object.freeze({ id: 'environment-drift', path: 'tools/qa/repository/fixtures/negative/environment-drift.json', expect: Object.freeze({ code: 'ENVIRONMENT_DRIFT', pointer: '/environments/stage/parameterRefs' }) }),
  Object.freeze({ id: 'lockfile-drift', path: 'tools/qa/repository/fixtures/negative/lockfile-drift.json', expect: Object.freeze({ code: 'LOCKFILE_DRIFT', pointer: '/lockfile' }) }),
  Object.freeze({ id: 'missing-provenance-signature', path: 'tools/qa/repository/fixtures/negative/missing-provenance-signature.json', expect: Object.freeze({ code: 'PROVENANCE_SIGNATURE_REQUIRED', pointer: '/provenance/signature/required' }) }),
  Object.freeze({ id: 'missing-files', path: 'tools/qa/repository/fixtures/regression/missing-files.json', expect: Object.freeze({ code: 'MISSING_REQUIRED_FIELD', pointer: '/files' }) }),
  Object.freeze({ id: 'base64-secret', path: 'tools/qa/repository/fixtures/regression/base64-secret.json', expect: Object.freeze({ code: 'SECRET_DETECTED', pointer: '/files/release~1environments~1prod.json/content' }) }),
  Object.freeze({ id: 'assembly-cycle', path: 'tools/qa/repository/fixtures/regression/assembly-cycle.json', expect: Object.freeze({ code: 'ASMDEF_CYCLE', pointer: '/assemblies' }) }),
  Object.freeze({ id: 'incomplete-provenance', path: 'tools/qa/repository/fixtures/regression/incomplete-provenance.json', expect: Object.freeze({ code: 'PROVENANCE_SIGNATURE_REQUIRED', pointer: '/provenance/signature/required' }) }),
  Object.freeze({ id: 'fake-aws-access-key', path: 'tools/qa/repository/fixtures/regression/fake-aws-access-key.json', expect: Object.freeze({ code: 'SECRET_DETECTED', pointer: '/files/fixtures~1aws-access-key.txt/content' }) }),
  Object.freeze({ id: 'fake-google-api-key', path: 'tools/qa/repository/fixtures/regression/fake-google-api-key.json', expect: Object.freeze({ code: 'SECRET_DETECTED', pointer: '/files/fixtures~1google-api-key.txt/content' }) }),
  Object.freeze({ id: 'fake-github-token', path: 'tools/qa/repository/fixtures/regression/fake-github-token.json', expect: Object.freeze({ code: 'SECRET_DETECTED', pointer: '/files/fixtures~1github-token.txt/content' }) }),
  Object.freeze({ id: 'fake-pem-private-key', path: 'tools/qa/repository/fixtures/regression/fake-pem-private-key.json', expect: Object.freeze({ code: 'SECRET_DETECTED', pointer: '/files/fixtures~1private-key.pem/content' }) }),
  Object.freeze({ id: 'fake-google-service-account', path: 'tools/qa/repository/fixtures/regression/fake-google-service-account.json', expect: Object.freeze({ code: 'SECRET_DETECTED', pointer: '/files/fixtures~1service-account.json/content' }) }),
  Object.freeze({ id: 'fake-jwt', path: 'tools/qa/repository/fixtures/regression/fake-jwt.json', expect: Object.freeze({ code: 'SECRET_DETECTED', pointer: '/files/fixtures~1jwt.txt/content' }) }),
  Object.freeze({ id: 'fake-firebase-debug-token', path: 'tools/qa/repository/fixtures/regression/fake-firebase-debug-token.json', expect: Object.freeze({ code: 'SECRET_DETECTED', pointer: '/files/fixtures~1firebase-debug-token.txt/content' }) }),
  Object.freeze({ id: 'fake-play-test-sku', path: 'tools/qa/repository/fixtures/regression/fake-play-test-sku.json', expect: Object.freeze({ code: 'SECRET_DETECTED', pointer: '/files/fixtures~1play-test-sku.txt/content' }) }),
  Object.freeze({ id: 'fake-admob-test-unit', path: 'tools/qa/repository/fixtures/regression/fake-admob-test-unit.json', expect: Object.freeze({ code: 'SECRET_DETECTED', pointer: '/files/fixtures~1admob-test-unit.txt/content' }) }),
  Object.freeze({ id: 'fake-google-oauth-client-secret', path: 'tools/qa/repository/fixtures/regression/fake-google-oauth-client-secret.json', expect: Object.freeze({ code: 'SECRET_DETECTED', pointer: '/files/fixtures~1google-oauth-client-secret.txt/content' }) }),
  Object.freeze({ id: 'fake-slack-token', path: 'tools/qa/repository/fixtures/regression/fake-slack-token.json', expect: Object.freeze({ code: 'SECRET_DETECTED', pointer: '/files/fixtures~1slack-token.txt/content' }) }),
  Object.freeze({ id: 'fake-stripe-key', path: 'tools/qa/repository/fixtures/regression/fake-stripe-key.json', expect: Object.freeze({ code: 'SECRET_DETECTED', pointer: '/files/fixtures~1stripe-key.txt/content' }) }),
  Object.freeze({ id: 'fake-basic-auth-url', path: 'tools/qa/repository/fixtures/regression/fake-basic-auth-url.json', expect: Object.freeze({ code: 'SECRET_DETECTED', pointer: '/files/fixtures~1basic-auth-url.txt/content' }) }),
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}
function payloadHash(value) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}
const canonicalCandidateFixtureInventorySha256 = payloadHash(canonicalCandidateFixtureInventory);

function candidateFixtureMatchesInventory(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === 3 && Object.hasOwn(value, 'id') && Object.hasOwn(value, 'path') && Object.hasOwn(value, 'expect')
    && value.id === expected.id && value.path === expected.path
    && value.expect && typeof value.expect === 'object' && !Array.isArray(value.expect)
    && Object.keys(value.expect).length === 2 && Object.hasOwn(value.expect, 'code') && Object.hasOwn(value.expect, 'pointer')
    && value.expect.code === expected.expect.code && value.expect.pointer === expected.expect.pointer;
}

function assertCanonicalCandidateFixtureInventory(fixtures) {
  if (!Array.isArray(fixtures) || fixtures.length !== canonicalCandidateFixtureInventory.length) {
    fail('CANDIDATE_FIXTURE_INVENTORY_INVALID', '/manifest/fixtures', 'candidate fixtures must exactly match the canonical inventory');
  }
  for (let index = 0; index < canonicalCandidateFixtureInventory.length; index += 1) {
    if (!candidateFixtureMatchesInventory(fixtures[index], canonicalCandidateFixtureInventory[index])) {
      fail('CANDIDATE_FIXTURE_INVENTORY_INVALID', `/manifest/fixtures/${index}`, 'candidate fixture differs from the canonical inventory');
    }
  }
  return fixtures;
}

function copyInventory() {
  return JSON.parse(JSON.stringify(canonicalCandidateFixtureInventory));
}

function assertCanonicalCandidateFixtureInventoryRegressionTests() {
  const remove = (id) => () => copyInventory().filter((fixture) => fixture.id !== id);
  const replace = () => {
    const fixtures = copyInventory();
    fixtures[7] = copyInventory()[11];
    return fixtures;
  };
  const swap = () => {
    const fixtures = copyInventory();
    [fixtures[7], fixtures[8]] = [fixtures[8], fixtures[7]];
    return fixtures;
  };
  const drift = () => {
    const fixtures = copyInventory();
    fixtures[10].expect.code = 'SECRET_DETECTED';
    return fixtures;
  };
  const probes = [
    { label: 'remove-missing-files', fixtures: remove('missing-files'), pointer: '/manifest/fixtures' },
    { label: 'remove-base64-secret', fixtures: remove('base64-secret'), pointer: '/manifest/fixtures' },
    { label: 'remove-assembly-cycle', fixtures: remove('assembly-cycle'), pointer: '/manifest/fixtures' },
    { label: 'remove-incomplete-provenance', fixtures: remove('incomplete-provenance'), pointer: '/manifest/fixtures' },
    { label: 'replace-same-count', fixtures: replace, pointer: '/manifest/fixtures/7' },
    { label: 'swap-order', fixtures: swap, pointer: '/manifest/fixtures/7' },
    { label: 'drift-expectation', fixtures: drift, pointer: '/manifest/fixtures/10' },
  ];
  return probes.map((probe) => {
    try {
      assertCanonicalCandidateFixtureInventory(probe.fixtures());
    } catch (error) {
      if (error instanceof ContractError && error.code === 'CANDIDATE_FIXTURE_INVENTORY_INVALID' && error.pointer === probe.pointer) {
        return { label: probe.label, code: error.code, pointer: error.pointer };
      }
      fail('CANDIDATE_FIXTURE_INVENTORY_REGRESSION_TEST_FAILED', probe.pointer, `${probe.label} did not fail with the inventory diagnostic`);
    }
    fail('CANDIDATE_FIXTURE_INVENTORY_REGRESSION_TEST_FAILED', probe.pointer, `${probe.label} unexpectedly matched the canonical inventory`);
  });
}
function parseArguments(args) {
  const options = { validator: defaultValidator, manifest: defaultManifest, evidenceDir: null };
  const flags = new Map([
    ['--validator=', 'validator'],
    ['--manifest=', 'manifest'],
    ['--evidence-dir=', 'evidenceDir'],
  ]);
  const seen = new Set();
  for (const arg of args) {
    const flag = [...flags.keys()].find((prefix) => arg.startsWith(prefix));
    if (!flag) fail('UNSUPPORTED_ARGUMENT', '', `unsupported argument ${arg}`);
    const option = flags.get(flag);
    if (seen.has(option)) fail('DUPLICATE_ARGUMENT', '', `duplicate argument ${flag.slice(0, -1)}`);
    seen.add(option);
    options[option] = arg.slice(flag.length);
  }
  return options;
}

function repositoryPath(path, pointer) {
  const candidate = resolve(root, string(path, pointer));
  const withinRoot = relative(root, candidate);
  if (!withinRoot || withinRoot.startsWith('..') || resolve(root, withinRoot) !== candidate) fail('PATH_OUTSIDE_REPOSITORY', pointer, 'path must remain within the repository');
  return candidate;
}

function manifestPath(path) {
  const value = string(path, '/manifest');
  if (isAbsolute(value) || !value.endsWith('.json')) fail('MANIFEST_PATH_INVALID', '/manifest', 'manifest must be a repository-relative JSON file');
  return repositoryPath(value, '/manifest');
}

async function readJson(path, pointer) {
  await assertSafePath(root, path, pointer, true);
  const stat = await lstat(path).catch(() => null);
  if (!stat?.isFile() || stat.isSymbolicLink()) fail('INPUT_UNSAFE', pointer, 'input must be a regular file');
  let source;
  try {
    source = await readFile(path, 'utf8');
  } catch (error) {
    fail('INPUT_UNREADABLE', pointer, error instanceof Error ? error.message : 'input could not be read');
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    fail('INPUT_INVALID_JSON', pointer, error instanceof Error ? error.message : 'input JSON could not be parsed');
  }
}

function decodePointer(value, at) {
  const encoded = string(value, at);
  if (!encoded.startsWith('/')) fail('INVALID_PATCH_POINTER', at, 'patch pointer must begin with /');
  return encoded.slice(1).split('/').map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
}

function applyPatch(candidate, patch, at) {
  exactKeys(patch, ['op', 'pointer', 'value'], at);
  if (!['add', 'remove', 'replace'].includes(patch.op)) fail('INVALID_PATCH_OPERATION', `${at}/op`, 'only add, remove, and replace patches are supported');
  const parts = decodePointer(patch.pointer, `${at}/pointer`);
  let parent = candidate;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    if (!parent || typeof parent !== 'object' || !(key in parent)) fail('INVALID_PATCH_POINTER', `${at}/pointer`, 'patch parent does not exist');
    parent = parent[key];
  }
  const key = parts.at(-1);
  if (Array.isArray(parent)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index > parent.length || (patch.op !== 'add' && index === parent.length)) fail('INVALID_PATCH_POINTER', `${at}/pointer`, 'array patch index does not exist');
    if (patch.op === 'remove') parent.splice(index, 1);
    else if (patch.op === 'add') parent.splice(index, 0, patch.value);
    else parent[index] = patch.value;
    return;
  }
  const record = object(parent, `${at}/pointer`);
  if (patch.op !== 'add' && !(key in record)) fail('INVALID_PATCH_POINTER', `${at}/pointer`, 'object patch key does not exist');
  if (patch.op === 'remove') delete record[key];
  else record[key] = patch.value;
}

function issueFrom(stderr) {
  const lines = stderr.split(/\r?\n/).filter((value) => value.startsWith('{'));
  if (lines.length !== 1) fail('VALIDATOR_PROTOCOL_ERROR', '/stderr', 'validator must emit exactly one machine-readable issue');
  let value;
  try {
    value = JSON.parse(lines[0]);
  } catch (error) {
    fail('VALIDATOR_PROTOCOL_ERROR', '/stderr', error instanceof Error ? error.message : 'validator issue could not be parsed');
  }
  exactKeys(value, ['code', 'pointer', 'message'], '/stderr');
  return {
    code: string(value.code, '/stderr/code'),
    pointer: typeof value.pointer === 'string' ? value.pointer : fail('STRING_REQUIRED', '/stderr/pointer', 'expected non-empty string'),
    message: string(value.message, '/stderr/message'),
  };
}

function runValidator(validator, candidate) {
  const result = spawnSync(process.execPath, [validator], {
    cwd: root,
    encoding: 'utf8',
    input: `${JSON.stringify(canonicalize(candidate))}\n`,
    maxBuffer: 1024 * 1024,
    timeout: validatorTimeoutMs,
  });
  if (result.error?.code === 'ETIMEDOUT') fail('VALIDATOR_TIMEOUT', '/validator', `validator exceeded ${validatorTimeoutMs}ms`);
  if (result.error) fail('VALIDATOR_EXECUTION_FAILURE', '/validator', result.error.message);
  return {
    exitCode: result.status,
    signal: result.signal ?? null,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function misleadingPassCanary() {
  const result = spawnSync(process.execPath, ['-e', "process.stdout.write('PASS\\n'); process.exit(1)"], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 1 || result.stdout !== 'PASS\n') fail('VALIDATOR_PROTOCOL_ERROR', '/canary', 'misleading PASS/exit-1 canary did not behave as expected');
  return { exitCode: result.status, stdout: result.stdout, stderr: result.stderr ?? '' };
}

async function evidenceDirectory(path) {
  if (!path) return null;
  const absolute = repositoryPath(path, '/evidenceDir');
  const withinEvidence = relative(evidenceRoot, absolute);
  if (!withinEvidence || withinEvidence.startsWith('..') || resolve(evidenceRoot, withinEvidence) !== absolute) fail('EVIDENCE_PATH_INVALID', '/evidenceDir', 'evidence directory must descend from .omo/evidence');
  if ((await lstat(evidenceRoot)).isSymbolicLink()) fail('EVIDENCE_PATH_INVALID', '/evidenceDir', 'evidence root must not be a symlink');
  let current = evidenceRoot;
  for (const segment of withinEvidence.split('/')) {
    current = resolve(current, segment);
    if ((await lstat(current).catch(() => null))?.isSymbolicLink()) fail('EVIDENCE_PATH_INVALID', '/evidenceDir', 'evidence directory must not include symlinks');
  }
  await mkdir(absolute, { recursive: true });
  return absolute;
}

async function writeReceipt(directory, name, receipt) {
  if (directory) await writeFile(resolve(directory, name), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

async function loadSuite(manifestPath) {
  const suite = object(await readJson(manifestPath, '/manifest'), '/manifest');
  if (!Object.hasOwn(suite, 'secretRuleFixtures')) fail('SECRET_RULE_FIXTURE_BINDING_INVALID', '/manifest/secretRuleFixtures', 'secret rule fixtures must bind every exported rule exactly once');
  exactKeys(suite, ['kind', 'canonical', 'secretRuleFixtures', 'fixtures'], '/manifest');
  if (suite.kind !== 'repository-validation-suite') fail('INVALID_SUITE_KIND', '/manifest/kind', 'unsupported suite kind');
  const secretRuleFixtures = suite.secretRuleFixtures;
  const bindingKeys = secretRuleFixtures && typeof secretRuleFixtures === 'object' && !Array.isArray(secretRuleFixtures) ? Object.keys(secretRuleFixtures) : [];
  if (bindingKeys.length !== secretRuleIds.length
    || !bindingKeys.every((id) => secretRuleIdSet.has(id))
    || !secretRuleIds.every((id) => Object.hasOwn(secretRuleFixtures, id))
    || secretRuleIds.some((id) => typeof secretRuleFixtures[id] !== 'string' || secretRuleFixtures[id].length === 0)) {
    fail('SECRET_RULE_FIXTURE_BINDING_INVALID', '/manifest/secretRuleFixtures', 'secret rule fixtures must bind every exported rule exactly once');
  }
  const primarySecretRules = new Map();
  for (const ruleId of secretRuleIds) {
    const fixtureId = secretRuleFixtures[ruleId];
    if (primarySecretRules.has(fixtureId)) fail('SECRET_RULE_FIXTURE_DUPLICATE', `/manifest/secretRuleFixtures/${ruleId}`, `primary fixture ${fixtureId} is bound more than once`);
    primarySecretRules.set(fixtureId, ruleId);
  }
  const fixtures = assertCanonicalCandidateFixtureInventory(suite.fixtures);
  const fixtureIds = new Set();
  const parsed = fixtures.map((entry, index) => {
    const at = `/manifest/fixtures/${index}`;
    exactKeys(entry, ['id', 'path', 'expect'], at);
    const id = string(entry.id, `${at}/id`);
    if (fixtureIds.has(id)) fail('DUPLICATE_FIXTURE_ID', `${at}/id`, `duplicate fixture id ${id}`);
    fixtureIds.add(id);
    const expect = object(entry.expect, `${at}/expect`);
    exactKeys(expect, ['code', 'pointer'], `${at}/expect`);
    return {
      id,
      path: string(entry.path, `${at}/path`),
      expect: { code: string(expect.code, `${at}/expect/code`), pointer: string(expect.pointer, `${at}/expect/pointer`) },
    };
  });
  for (const [fixtureId] of primarySecretRules) {
    const fixture = parsed.find((entry) => entry.id === fixtureId);
    if (!fixture || fixture.expect.code !== 'SECRET_DETECTED') fail('SECRET_RULE_FIXTURE_BINDING_INVALID', '/manifest/secretRuleFixtures', 'each primary secret-rule fixture must exist once and expect SECRET_DETECTED');
  }
  return { canonical: string(suite.canonical, '/manifest/canonical'), fixtures: parsed, primarySecretRules };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const inventoryRegressionTests = assertCanonicalCandidateFixtureInventoryRegressionTests();
  const receiptDirectory = await evidenceDirectory(options.evidenceDir);
  const validator = repositoryPath(options.validator, '/validator');
  const validatorStat = await assertSafePath(root, validator, '/validator').catch(() => null);
  if (!validatorStat?.isFile() || validatorStat.isSymbolicLink()) fail('VALIDATOR_NOT_FILE', '/validator', 'validator must be a regular file');
  const suite = await loadSuite(manifestPath(options.manifest));
  const canonical = object(await readJson(repositoryPath(suite.canonical, '/manifest/canonical'), '/canonical'), '/canonical');
  const canonicalResult = runValidator(validator, canonical);
  if (canonicalResult.exitCode !== 0 || canonicalResult.stdout !== 'PASS\n' || canonicalResult.stderr !== '') fail('REPOSITORY_CANONICAL_FAILURE', '/canonical', 'canonical candidate did not pass the supplied validator');
  const candidateHashes = new Map();
  const results = [];
  for (const fixture of suite.fixtures) {
    const fixturePayload = object(await readJson(repositoryPath(fixture.path, `/fixtures/${fixture.id}`), `/fixtures/${fixture.id}`), `/fixtures/${fixture.id}`);
    exactKeys(fixturePayload, ['kind', 'patches'], `/fixtures/${fixture.id}`);
    if (fixturePayload.kind !== 'repository-validation-fixture') fail('INVALID_FIXTURE_KIND', `/fixtures/${fixture.id}/kind`, 'unsupported fixture kind');
    const candidate = JSON.parse(JSON.stringify(canonicalize(canonical)));
    const patches = array(fixturePayload.patches, `/fixtures/${fixture.id}/patches`);
    for (let index = 0; index < patches.length; index += 1) applyPatch(candidate, object(patches[index], `/fixtures/${fixture.id}/patches/${index}`), `/fixtures/${fixture.id}/patches/${index}`);
    const candidateSha256 = payloadHash(candidate);
    if (candidateHashes.has(candidateSha256)) fail('DUPLICATE_FIXTURE_PAYLOAD', `/fixtures/${fixture.id}`, `duplicates ${candidateHashes.get(candidateSha256)}`);
    candidateHashes.set(candidateSha256, fixture.id);
    const result = runValidator(validator, candidate);
    const observedIssue = result.exitCode === 0 ? null : issueFrom(result.stderr);
    if (result.exitCode !== 0 && /(?:^|\n)PASS(?:\n|$)/.test(result.stdout)) fail('VALIDATOR_PROTOCOL_ERROR', `/fixtures/${fixture.id}`, 'validator must not print PASS when failing');
    const expectedSecretRuleId = suite.primarySecretRules.get(fixture.id) ?? null;
    const observedSecretRuleId = expectedSecretRuleId ? /^rule:([^;]+);/.exec(observedIssue?.message ?? '')?.[1] ?? null : null;
    const matchesExpectedDiagnostic = observedIssue?.code === fixture.expect.code
      && observedIssue.pointer === fixture.expect.pointer
      && (expectedSecretRuleId === null || observedSecretRuleId === expectedSecretRuleId);
    results.push({
      id: fixture.id,
      expected: fixture.expect,
      fixturePayloadSha256: payloadHash(fixturePayload),
      candidateSha256,
      result,
      observedIssue,
      expectedSecretRuleId,
      observedSecretRuleId,
      matchesExpectedDiagnostic,
    });
  }
  const missingDiagnostics = results.filter((entry) => !entry.matchesExpectedDiagnostic).map((entry) => entry.id);
  const mismatchedSecretRuleFixtures = results
    .filter((entry) => entry.expectedSecretRuleId !== null && entry.observedIssue?.code === 'SECRET_DETECTED'
      && entry.observedIssue.pointer === entry.expected.pointer && entry.observedSecretRuleId !== entry.expectedSecretRuleId)
    .map(({ id, expectedSecretRuleId, observedSecretRuleId }) => ({ id, expectedRuleId: expectedSecretRuleId, observedRuleId: observedSecretRuleId }));
  const canary = misleadingPassCanary();
  const receipt = {
    phase: missingDiagnostics.length === 0 && mismatchedSecretRuleFixtures.length === 0 ? 'GREEN' : 'RED',
    validator: options.validator,
    validatorTimeoutMs,
    canonical: canonicalResult,
    fixtureCount: results.length,
    distinctFixturePayloads: candidateHashes.size,
    secretRuleCount: secretRuleIds.length,
    secretRuleBindingCount: suite.primarySecretRules.size,
    distinctSecretRuleFixtureCount: new Set(suite.primarySecretRules.keys()).size,
    candidateFixtureInventory: {
      algorithm: 'SHA-256',
      canonicalization: 'recursive-key-sorted JSON with source array order preserved',
      sha256: canonicalCandidateFixtureInventorySha256,
      expectedCount: canonicalCandidateFixtureInventory.length,
      matchedCount: results.length,
      regressionTests: inventoryRegressionTests,
    },
    missingSecretRuleFixtures: [],
    duplicateSecretRuleFixtures: [],
    mismatchedSecretRuleFixtures,
    discoveredFixtureIds: results.map((entry) => entry.id),
    negativeFixtures: results,
    missingExpectedDiagnostics: missingDiagnostics,
    protocolCanary: canary,
  };
  await writeReceipt(receiptDirectory, receipt.phase === 'GREEN' ? 'green-receipt.json' : 'red-receipt.json', receipt);
  console.log(JSON.stringify(receipt, null, 2));
  if (mismatchedSecretRuleFixtures.length !== 0) {
    const mismatch = mismatchedSecretRuleFixtures[0];
    const fixture = results.find((entry) => entry.id === mismatch.id);
    fail('SECRET_RULE_FIXTURE_MISMATCH', fixture.expected.pointer, `fixture ${mismatch.id} expected rule ${mismatch.expectedRuleId}, observed ${mismatch.observedRuleId ?? 'none'}`);
  }
  if (missingDiagnostics.length !== 0) fail('REPOSITORY_SUITE_INCOMPLETE', '/negativeFixtures', `expected diagnostics were absent for ${missingDiagnostics.join(', ')}`);
  console.log('PASS');
}

main().catch(async (error) => {
  const issue = error instanceof ContractError
    ? { code: error.code, pointer: error.pointer, message: error.message }
    : { code: 'REPOSITORY_RUNNER_FAILURE', pointer: '', message: error instanceof Error ? error.message : String(error) };
  process.stderr.write(`${JSON.stringify(issue)}\n`);
  process.exitCode = 1;
});
