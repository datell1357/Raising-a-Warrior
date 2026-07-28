#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { SECRET_RULES, scanSecrets } from './candidate-validator.mjs';
import { buildRepositoryModel } from './repository-model.mjs';

const root = resolve(process.cwd());
const evidenceRoot = resolve(root, '.omo/evidence');
const defaultEvidenceDirectory = '.omo/evidence/implementation/20260728T000000Z/repository/a2/task-5';
const defaultLiveVerifier = 'tools/qa/repository/verify-repository.mjs';
const rootArtifacts = ['repo-bootstrap.json', 'dependency-graph.html', 'secret-scan.sarif', 'scope-hash-verification.json', 'cleanup-receipt.json'];
const preRemediationInventory = '.omo/evidence/implementation/20260728T000000Z/repository/a2/task-5/lanes/p1/pre-remediation-sha256-inventory.json';
const canonicalRepositoryContractSha256 = '756b8b514f195ebfe6ca9ec0f473a4aa85224291de62152a637aac20f9f0d491';
const canonicalCandidateFixtureInventorySha256 = '1ef282943e84e3173c9cee7bddef2c21ebdcdfce3e70e3fb4c23985d85fb480e';
const candidateFixtureInventoryRegressionLabels = ['remove-missing-files', 'remove-base64-secret', 'remove-assembly-cycle', 'remove-incomplete-provenance', 'replace-same-count', 'swap-order', 'drift-expectation'];
const plannedChanges = Object.freeze({
  package: ['package.json'],
  validator: [
    'tools/qa/repository/candidate-validator.mjs',
    'tools/qa/repository/repository-model.mjs',
    'tools/qa/repository/repository-policy.mjs',
    'tools/qa/repository/run-live-regressions.mjs',
    'tools/qa/repository/run-validation-suite.mjs',
  ],
  fixture: [
    'tools/qa/repository/live-regressions.json',
    'tools/qa/repository/negative-fixtures.json',
    'tools/qa/repository/fixtures/candidate-suite/duplicate-secret-rule-binding.json',
    'tools/qa/repository/fixtures/candidate-suite/missing-secret-rule-binding.json',
    'tools/qa/repository/fixtures/failing-live-verifier.mjs',
    'tools/qa/repository/fixtures/live/binary-jks-container.json',
    'tools/qa/repository/fixtures/live/binary-keystore-container.json',
    'tools/qa/repository/fixtures/live/binary-p12-container.json',
    'tools/qa/repository/fixtures/live/comment-only-infrastructure-allowed.json',
    'tools/qa/repository/fixtures/live/firebase-deploy.json',
    'tools/qa/repository/fixtures/live/forbidden-dockerfile-content.json',
    'tools/qa/repository/fixtures/live/forbidden-gradle-content.json',
    'tools/qa/repository/fixtures/live/forbidden-properties-content.json',
    'tools/qa/repository/fixtures/live/forbidden-shell-content.json',
    'tools/qa/repository/fixtures/live/forbidden-terraform-content.json',
    'tools/qa/repository/fixtures/live/forbidden-toml-content.json',
    'tools/qa/repository/fixtures/live/forbidden-typescript-url.json',
    'tools/qa/repository/fixtures/live/inner-environment-schema-drift.json',
    'tools/qa/repository/fixtures/live/job-permissions-escalation.json',
    'tools/qa/repository/fixtures/live/multiple-attestation-subjects.json',
    'tools/qa/repository/fixtures/live/nonempty-firestore-indexes.json',
    'tools/qa/repository/fixtures/live/npm-publish.json',
    'tools/qa/repository/fixtures/live/permissive-firestore-rules.json',
    'tools/qa/repository/fixtures/live/provenance-schema-drift.json',
    'tools/qa/repository/fixtures/live/release-track-drift.json',
    'tools/qa/repository/fixtures/live/repository-contract-lockfile-policy-drift.json',
    'tools/qa/repository/fixtures/live/repository-contract-validation-command-drift.json',
    'tools/qa/repository/fixtures/live/secret-lookalikes-allowed.json',
    'tools/qa/repository/fixtures/live/signature-schema-drift.json',
    'tools/qa/repository/fixtures/live/target-api-drift.json',
    'tools/qa/repository/fixtures/live/typescript-comment-only-allowed.json',
    'tools/qa/repository/fixtures/live/unexpected-workflow-file.json',
    'tools/qa/repository/fixtures/live/untrusted-pinned-action.json',
    'tools/qa/repository/fixtures/live-suite/duplicate-id.json',
    'tools/qa/repository/fixtures/live-suite/duplicate-path.json',
    'tools/qa/repository/fixtures/live-suite/empty.json',
    'tools/qa/repository/fixtures/live-suite/missing-coverage.json',
    'tools/qa/repository/fixtures/regression/fake-admob-test-unit.json',
    'tools/qa/repository/fixtures/regression/fake-aws-access-key.json',
    'tools/qa/repository/fixtures/regression/fake-basic-auth-url.json',
    'tools/qa/repository/fixtures/regression/fake-firebase-debug-token.json',
    'tools/qa/repository/fixtures/regression/fake-github-token.json',
    'tools/qa/repository/fixtures/regression/fake-google-api-key.json',
    'tools/qa/repository/fixtures/regression/fake-google-oauth-client-secret.json',
    'tools/qa/repository/fixtures/regression/fake-google-service-account.json',
    'tools/qa/repository/fixtures/regression/fake-jwt.json',
    'tools/qa/repository/fixtures/regression/fake-pem-private-key.json',
    'tools/qa/repository/fixtures/regression/fake-play-test-sku.json',
    'tools/qa/repository/fixtures/regression/fake-slack-token.json',
    'tools/qa/repository/fixtures/regression/fake-stripe-key.json',
  ],
  capture: ['tools/qa/repository/capture-evidence.mjs'],
});
const malformedLiveManifestProbes = Object.freeze([
  { label: 'malformed-live-empty', manifest: 'tools/qa/repository/fixtures/live-suite/empty.json', expected: { code: 'LIVE_SUITE_EMPTY', pointer: '/manifest/fixtures' } },
  { label: 'malformed-live-duplicate-id', manifest: 'tools/qa/repository/fixtures/live-suite/duplicate-id.json', expected: { code: 'DUPLICATE_FIXTURE_ID', pointer: '/manifest/fixtures/1/id' } },
  { label: 'malformed-live-duplicate-path', manifest: 'tools/qa/repository/fixtures/live-suite/duplicate-path.json', expected: { code: 'DUPLICATE_FIXTURE_PATH', pointer: '/manifest/fixtures/1/path' } },
  { label: 'malformed-live-missing-coverage', manifest: 'tools/qa/repository/fixtures/live-suite/missing-coverage.json', expected: { code: 'LIVE_FIXTURE_COVERAGE_INCOMPLETE', pointer: '/manifest/fixtures' } },
]);
const malformedCandidateBindingProbes = Object.freeze([
  { label: 'malformed-candidate-missing-binding', manifest: 'tools/qa/repository/fixtures/candidate-suite/missing-secret-rule-binding.json', expected: { code: 'SECRET_RULE_FIXTURE_BINDING_INVALID', pointer: '/manifest/secretRuleFixtures' } },
  { label: 'malformed-candidate-duplicate-binding', manifest: 'tools/qa/repository/fixtures/candidate-suite/duplicate-secret-rule-binding.json', expected: { code: 'SECRET_RULE_FIXTURE_DUPLICATE', pointer: '/manifest/secretRuleFixtures/google-service-account' } },
]);

class CaptureFailure extends Error {
  constructor(code, pointer, message) {
    super(message);
    this.code = code;
    this.pointer = pointer;
  }
}

function fail(code, pointer, message) {
  throw new CaptureFailure(code, pointer, message);
}

function parseArguments(args) {
  const options = { evidenceDirectory: defaultEvidenceDirectory, liveVerifier: defaultLiveVerifier };
  const seen = new Set();
  for (const argument of args) {
    const match = /^(--evidence-dir|--live-verifier)=(.+)$/.exec(argument);
    if (!match) fail('UNSUPPORTED_ARGUMENT', '', `unsupported argument ${argument}`);
    const key = match[1];
    if (seen.has(key)) fail('DUPLICATE_ARGUMENT', '', `duplicate argument ${key}`);
    seen.add(key);
    if (key === '--evidence-dir') options.evidenceDirectory = match[2];
    else options.liveVerifier = match[2];
  }
  return options;
}

async function safeEvidenceDirectory(path) {
  const evidenceDirectory = resolve(root, path);
  const local = relative(evidenceRoot, evidenceDirectory);
  if (!local || local.startsWith('..') || resolve(evidenceRoot, local) !== evidenceDirectory) fail('EVIDENCE_PATH_INVALID', '/evidenceDir', 'evidence directory must descend from .omo/evidence');
  if ((await lstat(evidenceRoot)).isSymbolicLink()) fail('EVIDENCE_PATH_INVALID', '/evidenceDir', 'evidence root must not be a symlink');
  let current = evidenceRoot;
  for (const part of local.split('/')) {
    current = resolve(current, part);
    if ((await lstat(current).catch(() => null))?.isSymbolicLink()) fail('EVIDENCE_PATH_INVALID', '/evidenceDir', 'evidence directory must not contain symlinks');
  }
  await mkdir(evidenceDirectory, { recursive: true });
  return evidenceDirectory;
}

async function safeLiveVerifier(path) {
  const verifier = resolve(root, path);
  const local = relative(root, verifier);
  if (!local || local.startsWith('..') || resolve(root, local) !== verifier) fail('LIVE_VERIFIER_PATH_INVALID', '/liveVerifier', 'live verifier must remain inside the repository');
  let current = root;
  for (const part of local.split('/')) {
    current = resolve(current, part);
    if ((await lstat(current).catch(() => null))?.isSymbolicLink()) fail('LIVE_VERIFIER_PATH_INVALID', '/liveVerifier', 'live verifier must not contain a symlink');
  }
  const stat = await lstat(verifier).catch(() => null);
  if (!stat?.isFile() || stat.isSymbolicLink()) fail('LIVE_VERIFIER_PATH_INVALID', '/liveVerifier', 'live verifier must be a regular file');
  return { absolute: verifier, relative: local };
}

function run(label, executable, args, input = undefined, environment = process.env) {
  const startedAt = Date.now();
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', input, timeout: 180000, maxBuffer: 4 * 1024 * 1024, env: environment });
  return { label, executable, args, exitCode: result.status, signal: result.signal ?? null, durationMs: Date.now() - startedAt, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error?.message ?? null };
}

function issue(result) {
  const line = result.stderr.split(/\r?\n/).find((value) => value.startsWith('{'));
  return line ? JSON.parse(line) : null;
}

function requireResult(result, expected, expectedExitCode = 1) {
  const observed = issue(result);
  if (result.exitCode !== expectedExitCode || observed?.code !== expected.code || observed.pointer !== expected.pointer) {
    fail('EVIDENCE_ASSERTION_FAILED', '', `${result.label} did not produce ${expected.code} at ${expected.pointer}`);
  }
}

function requireFinalPass(result, label) {
  if (result.exitCode !== 0 || !result.stdout.endsWith('PASS\n') || result.stderr !== '') fail('EVIDENCE_ASSERTION_FAILED', '', `${label} did not meet the final PASS protocol`);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}

function passReceipt(result, label) {
  requireFinalPass(result, label);
  try {
    return JSON.parse(result.stdout.slice(0, -'PASS\n'.length).trim());
  } catch (error) {
    fail('EVIDENCE_ASSERTION_FAILED', '', `${label} did not emit a JSON receipt: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function sameStrings(value, expected) {
  return Array.isArray(value) && value.length === expected.length && value.every((item, index) => item === expected[index]);
}

function requireCandidateSuiteFacts(receipt) {
  const missing = receipt.missingSecretRuleFixtures;
  const duplicate = receipt.duplicateSecretRuleFixtures;
  const mismatched = receipt.mismatchedSecretRuleFixtures;
  const incomplete = receipt.missingExpectedDiagnostics;
  const ids = receipt.discoveredFixtureIds;
  const inventory = receipt.candidateFixtureInventory;
  if (receipt.phase !== 'GREEN'
    || receipt.fixtureCount !== 24
    || receipt.distinctFixturePayloads !== 24
    || receipt.secretRuleCount !== 14
    || receipt.secretRuleBindingCount !== 14
    || receipt.distinctSecretRuleFixtureCount !== 14
    || !Array.isArray(ids) || ids.length !== 24 || new Set(ids).size !== 24
    || !Array.isArray(missing) || missing.length !== 0
    || !Array.isArray(duplicate) || duplicate.length !== 0
    || !Array.isArray(mismatched) || mismatched.length !== 0
    || !Array.isArray(incomplete) || incomplete.length !== 0
    || inventory?.algorithm !== 'SHA-256'
    || inventory.canonicalization !== 'recursive-key-sorted JSON with source array order preserved'
    || inventory.sha256 !== canonicalCandidateFixtureInventorySha256
    || inventory.expectedCount !== 24 || inventory.matchedCount !== 24
    || !Array.isArray(inventory.regressionTests) || inventory.regressionTests.length !== 7
    || !sameStrings(inventory.regressionTests.map((probe) => probe.label), candidateFixtureInventoryRegressionLabels)
    || !inventory.regressionTests.every((probe) => probe.code === 'CANDIDATE_FIXTURE_INVENTORY_INVALID' && typeof probe.pointer === 'string' && probe.pointer.startsWith('/manifest/fixtures'))
    || !Array.isArray(receipt.negativeFixtures) || receipt.negativeFixtures.length !== 24 || !receipt.negativeFixtures.every((fixture) => fixture.matchesExpectedDiagnostic === true)) {
    fail('EVIDENCE_ASSERTION_FAILED', '/candidateSuite', 'candidate suite did not retain canonical 24/14 fixture and secret-rule coverage');
  }
  return {
    fixtureCount: receipt.fixtureCount,
    distinctFixturePayloads: receipt.distinctFixturePayloads,
    secretRuleCount: receipt.secretRuleCount,
    secretRuleBindingCount: receipt.secretRuleBindingCount,
    distinctSecretRuleFixtureCount: receipt.distinctSecretRuleFixtureCount,
    candidateFixtureInventory: {
      algorithm: inventory.algorithm,
      canonicalization: inventory.canonicalization,
      sha256: inventory.sha256,
      expectedCount: inventory.expectedCount,
      matchedCount: inventory.matchedCount,
      regressionTestCount: inventory.regressionTests.length,
    },
    missingSecretRuleFixtures: missing,
    duplicateSecretRuleFixtures: duplicate,
    mismatchedSecretRuleFixtures: mismatched,
    missingExpectedDiagnostics: incomplete,
  };
}

function requireLiveSuiteFacts(receipt) {
  const textPaths = ['release/signing/fixture.pem', 'release/signing/fixture.key'];
  const binaryPaths = ['release/signing/fixture.p12', 'release/signing/fixture.jks', 'release/signing/fixture.keystore'];
  const ids = receipt.discoveredFixtureIds;
  const coverage = receipt.pathCoverage;
  if (receipt.phase !== 'GREEN'
    || receipt.fixtureCount !== 36
    || receipt.distinctFixturePathCount !== 36
    || !Array.isArray(ids) || ids.length !== 36 || new Set(ids).size !== 36
    || !coverage || !Array.isArray(coverage.expected) || !Array.isArray(coverage.covered)
    || coverage.expected.length !== 36 || coverage.covered.length !== 36 || !sameStrings(coverage.expected, coverage.covered)
    || !sameStrings(receipt.inventoryCoverage?.text, textPaths)
    || !sameStrings(receipt.inventoryCoverage?.binary, binaryPaths)
    || !Array.isArray(receipt.results) || receipt.results.length !== 36) {
    fail('EVIDENCE_ASSERTION_FAILED', '/liveSuite', 'live suite did not retain canonical 36-fixture ID, path, and classifier coverage');
  }
  return {
    fixtureCount: receipt.fixtureCount,
    distinctFixtureIdCount: new Set(ids).size,
    distinctFixturePathCount: receipt.distinctFixturePathCount,
    completePathCoverage: true,
    textKeyExtensions: ['.pem', '.key'],
    binarySigningContainerExtensions: ['.p12', '.jks', '.keystore'],
  };
}

function canonicalRepositoryContract(model) {
  const sha256 = createHash('sha256').update(JSON.stringify(canonicalize(model.repositoryContract))).digest('hex');
  if (sha256 !== canonicalRepositoryContractSha256) fail('EVIDENCE_ASSERTION_FAILED', '/repositoryContract', 'canonical repository contract SHA-256 did not match the authoritative value');
  return { path: 'release/repository-contract.json', canonicalization: 'recursive-key-sorted JSON', algorithm: 'SHA-256', sha256 };
}

async function writeJson(directory, name, value) {
  await writeFile(resolve(directory, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function workflowSummary(model) {
  return Object.fromEntries(Object.entries(model.workflows).sort(([left], [right]) => left.localeCompare(right)).map(([name, workflow]) => [name, {
    triggers: Object.keys(workflow.on ?? {}).sort(),
    permissions: workflow.permissions,
    jobs: Object.keys(workflow.jobs ?? {}).sort(),
    attestation: name === 'release.yml' ? 'DECLARED_LOCAL_ONLY' : 'NOT_APPLICABLE',
  }]));
}

function externalBlockers(model) {
  return model.externalPrerequisites.prerequisites.map((entry) => ({
    id: entry.id,
    status: 'BLOCKED',
    repositoryStatus: entry.status,
    blockingCommand: entry.blockingCommand,
    proofRequired: entry.proofRequired,
    reason: 'Local evidence capture does not query external or hosted state.',
  }));
}

function dependencyGraph(model) {
  const tsReferences = model.rootTsconfig.references.map((reference) => reference.path);
  const workspaces = model.packageManifest.workspaces;
  const assemblyEdges = Object.entries(model.assemblies)
    .flatMap(([from, assembly]) => assembly.references.map((to) => `${from} -> ${to}`));
  const list = (items) => `<ul>${items.map((item) => `<li><code>${escapeHtml(item)}</code></li>`).join('')}</ul>`;
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>T5 dependency graph</title></head>
<body>
<h1>T5 dependency graph</h1>
<h2>TypeScript project references</h2>
${list(tsReferences)}
<h2>Bun workspaces</h2>
${list(workspaces)}
<h2>Canonical assembly edges</h2>
${list(assemblyEdges)}
</body>
</html>
`;
}

function secretSarif(model) {
  const artifacts = [];
  const results = [];
  for (const [path, file] of Object.entries(model.repositoryFiles).sort(([left], [right]) => left.localeCompare(right))) {
    artifacts.push({ location: { uri: path, uriBaseId: 'REPOSITORY_ROOT' } });
    const finding = scanSecrets(file.content);
    if (finding) results.push({ ruleId: finding.ruleId, level: 'error', message: { text: `secret-like material detected (sha256:${finding.fingerprint})` }, locations: [{ physicalLocation: { artifactLocation: { uri: path, uriBaseId: 'REPOSITORY_ROOT' } } }] });
  }
  if (results.length !== 0) fail('EVIDENCE_SECRET_SCAN_FAILED', '/secretScan/results', 'canonical repository scan reported secret findings');
  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [{
      tool: {
        driver: {
          name: 'raising-a-warrior-repository-secret-scan',
          rules: SECRET_RULES.map((rule) => ({ id: rule.id, name: rule.name, shortDescription: { text: rule.name }, fullDescription: { text: rule.description }, defaultConfiguration: { level: 'error' } })),
        },
      },
      invocations: [{ executionSuccessful: true, commandLine: 'node tools/qa/repository/capture-evidence.mjs', workingDirectory: { uri: '.', uriBaseId: 'REPOSITORY_ROOT' } }],
      originalUriBaseIds: { REPOSITORY_ROOT: { uri: 'file:///repository/' } },
      artifacts,
      results,
    }],
  };
}

function requireSecretSarifFacts(sarif) {
  const run = sarif.runs?.[0];
  const rules = run?.tool?.driver?.rules;
  const results = run?.results;
  if (!Array.isArray(rules) || rules.length !== 14 || !Array.isArray(results) || results.length !== 0) {
    fail('EVIDENCE_ASSERTION_FAILED', '/secretScan', 'SARIF must contain exactly 14 rules and zero results');
  }
  return { ruleCount: rules.length, resultCount: results.length };
}

function plannedChange(path) {
  return Object.entries(plannedChanges).find(([, paths]) => paths.includes(path))?.[0] ?? null;
}

function scopePath(path) {
  return path === 'package.json' || path.startsWith('tools/qa/repository/');
}

async function currentScopeFiles() {
  const ignored = new Set(['.git', 'node_modules', 'dist', 'coverage', '.cache', '.tmp', '.pytest_cache', '.ruff_cache']);
  async function walk(directory = '') {
    const entries = await readdir(resolve(root, directory || '.'), { withFileTypes: true });
    const files = [];
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const path = directory ? `${directory}/${entry.name}` : entry.name;
      if (ignored.has(entry.name) || path.startsWith('.omo/evidence/')) continue;
      if (entry.isDirectory()) files.push(...await walk(path));
      else if (entry.isFile() && scopePath(path)) files.push({ path, sha256: createHash('sha256').update(await readFile(resolve(root, path))).digest('hex') });
    }
    return files;
  }
  return walk();
}

async function scopeHashVerification(evidenceDirectory) {
  const before = JSON.parse(await readFile(resolve(root, preRemediationInventory), 'utf8'));
  const original = new Map(before.files.filter((entry) => scopePath(entry.path)).map((entry) => [entry.path, entry.sha256]));
  const current = new Map((await currentScopeFiles()).map((entry) => [entry.path, entry.sha256]));
  const added = [...current].filter(([path]) => !original.has(path)).map(([path, sha256]) => ({ path, sha256, allowedChange: plannedChange(path) }));
  const changed = [...current].filter(([path, sha256]) => original.has(path) && original.get(path) !== sha256).map(([path, sha256]) => ({ path, before: original.get(path), after: sha256, allowedChange: plannedChange(path) }));
  const unchanged = [...current].filter(([path, sha256]) => original.get(path) === sha256).map(([path]) => path);
  const deleted = [...original].filter(([path]) => !current.has(path)).map(([path]) => path);
  const moved = deleted.flatMap((path) => {
    const priorHash = original.get(path);
    return added.filter((entry) => entry.sha256 === priorHash).map((entry) => ({ from: path, to: entry.path, sha256: priorHash }));
  });
  const unauthorized = [...added, ...changed].filter((entry) => !entry.allowedChange);
  const priorLockfile = before.files.find((entry) => entry.path === 'bun.lock');
  const currentLockfileSha256 = createHash('sha256').update(await readFile(resolve(root, 'bun.lock'))).digest('hex');
  if (!priorLockfile || currentLockfileSha256 !== priorLockfile.sha256) fail('EVIDENCE_SCOPE_HASH_FAILED', '/scopeHashVerification/bun.lock', 'excluded bun.lock must remain unchanged and unallowed');
  if (unauthorized.length !== 0 || deleted.length !== 0 || moved.length !== 0) fail('EVIDENCE_SCOPE_HASH_FAILED', '/scopeHashVerification', 'scope comparison found an unplanned change, deletion, or move');
  return {
    status: 'PASS',
    baseline: { path: preRemediationInventory, algorithm: before.algorithm, fileCount: before.fileCount },
    comparisonScope: ['package.json', 'tools/qa/repository/**'],
    excludedPreexistingWorkspaceState: ['.git/**', '.omo/evidence/**', 'node_modules/**', 'dist/**', 'coverage/**', '.cache/**', '.tmp/**', '.pytest_cache/**', '.ruff_cache/**'],
    allowedPlannedChanges: { ...plannedChanges, evidence: [relative(evidenceRoot, evidenceDirectory)] },
    excludedUnallowedUnchanged: [{ path: 'bun.lock', sha256: currentLockfileSha256 }],
    added,
    changed,
    unchanged,
    deleted,
    moved,
  };
}

async function writeLiveFailure(evidenceDirectory, liveVerifier, result) {
  await writeJson(evidenceDirectory, 'command-log.json', { liveVerifier: result });
  await writeJson(evidenceDirectory, 'verification-receipt.json', {
    status: 'FAIL',
    phase: 'LIVE_VERIFIER',
    liveVerifier: { path: liveVerifier.relative, exitCode: result.exitCode, signal: result.signal, stdout: result.stdout, stderr: result.stderr },
    finalRootArtifactsWritten: [],
  });
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const evidenceDirectory = await safeEvidenceDirectory(options.evidenceDirectory);
  const liveVerifier = await safeLiveVerifier(options.liveVerifier);
  const live = run('live-verifier', process.execPath, [liveVerifier.relative]);
  if (live.exitCode !== 0) {
    await writeLiveFailure(evidenceDirectory, liveVerifier, live);
    fail('EVIDENCE_LIVE_VERIFIER_FAILED', '/liveVerifier/exitCode', `live verifier exited ${String(live.exitCode)}`);
  }
  if (live.stdout !== 'PASS\n' || live.stderr !== '') {
    await writeLiveFailure(evidenceDirectory, liveVerifier, live);
    fail('EVIDENCE_LIVE_VERIFIER_PROTOCOL_INVALID', '/liveVerifier', 'live verifier must emit only PASS followed by a newline and no stderr');
  }
  const p1Directory = await safeEvidenceDirectory(relative(root, resolve(evidenceDirectory, 'lanes/p1')));
  const p7Directory = await safeEvidenceDirectory(relative(root, resolve(evidenceDirectory, 'lanes/p7')));
  const suite = run('production-fixtures', process.execPath, ['tools/qa/repository/run-validation-suite.mjs', `--evidence-dir=${p1Directory}`]);
  const candidateSuiteReceipt = passReceipt(suite, 'production fixture suite');
  const candidateSuiteFacts = requireCandidateSuiteFacts(candidateSuiteReceipt);
  const red = run('no-op-red-reproducibility', process.execPath, ['tools/qa/repository/run-validation-suite.mjs', '--validator=tools/qa/repository/no-op-validator.mjs']);
  requireResult(red, { code: 'REPOSITORY_SUITE_INCOMPLETE', pointer: '/negativeFixtures' });
  const liveRegressions = run('live-policy-regressions', process.execPath, ['tools/qa/repository/run-live-regressions.mjs']);
  const liveSuiteReceipt = passReceipt(liveRegressions, 'live policy regressions');
  const liveSuiteFacts = requireLiveSuiteFacts(liveSuiteReceipt);
  const malformed = run('malformed-candidate', process.execPath, ['tools/qa/repository/validate-candidate.mjs'], '{');
  requireResult(malformed, { code: 'CANDIDATE_INVALID_JSON', pointer: '' });
  const traversal = run('fixture-traversal', process.execPath, ['tools/qa/repository/verify-repository.mjs', '--fixture=../outside.json']);
  requireResult(traversal, { code: 'PATH_OUTSIDE_REPOSITORY', pointer: '/fixture' });
  const symlink = run('fixture-symlink', process.execPath, ['tools/qa/repository/verify-repository.mjs', '--fixture=.codegraph']);
  requireResult(symlink, { code: 'SYMLINK_FORBIDDEN', pointer: '/fixture' });
  const timeout = run('hung-validator', process.execPath, ['tools/qa/repository/run-validation-suite.mjs', '--validator=tools/qa/repository/fixtures/hung-validator.mjs']);
  requireResult(timeout, { code: 'VALIDATOR_TIMEOUT', pointer: '/validator' });
  const malformedLiveManifests = malformedLiveManifestProbes.map((probe) => {
    const result = run(probe.label, process.execPath, ['tools/qa/repository/run-live-regressions.mjs', `--manifest=${probe.manifest}`]);
    requireResult(result, probe.expected);
    return { manifest: probe.manifest, expected: probe.expected, result };
  });
  const malformedCandidateBindings = malformedCandidateBindingProbes.map((probe) => {
    const result = run(probe.label, process.execPath, ['tools/qa/repository/run-validation-suite.mjs', `--manifest=${probe.manifest}`]);
    requireResult(result, probe.expected);
    return { manifest: probe.manifest, expected: probe.expected, result };
  });
  const deterministic = [
    run('deterministic-1', process.execPath, ['tools/qa/repository/run-validation-suite.mjs']),
    run('deterministic-2', process.execPath, ['tools/qa/repository/run-validation-suite.mjs']),
    run('deterministic-3', process.execPath, ['tools/qa/repository/run-validation-suite.mjs']),
  ];
  if (!deterministic.every((result) => result.exitCode === 0 && result.stdout === deterministic[0].stdout && result.stderr === deterministic[0].stderr)) fail('EVIDENCE_ASSERTION_FAILED', '', 'production fixture suite is not deterministic');
  const authoritative = run('authoritative-repository-verification', 'bun', ['run', 'verify:repo'], undefined, { ...process.env, BUN_OPTIONS: '--silent' });
  requireFinalPass(authoritative, 'bun run verify:repo');
  const model = await buildRepositoryModel(root);
  const workflows = workflowSummary(model);
  const workflowFileCount = Object.keys(workflows).length;
  if (workflowFileCount !== 5) fail('EVIDENCE_ASSERTION_FAILED', '/workflows', 'repository must contain exactly five workflow files');
  const repositoryContract = canonicalRepositoryContract(model);
  const sarif = secretSarif(model);
  const secretScanFacts = requireSecretSarifFacts(sarif);
  const canonicalEvidence = { candidateSuite: candidateSuiteFacts, liveSuite: liveSuiteFacts, repositoryContract, workflowFileCount, secretScan: secretScanFacts };
  const scopeHashes = await scopeHashVerification(evidenceDirectory);
  const p1Log = { suite, red, liveVerifier: live, liveRegressions, malformed, traversal, symlink, timeout, malformedLiveManifests, malformedCandidateBindings, deterministic, authoritative };
  await writeJson(p1Directory, 'command-log.json', p1Log);
  await writeJson(p1Directory, 'verification-receipt.json', {
    status: 'PASS',
    liveVerifier: { command: `node ${liveVerifier.relative}`, exitCode: live.exitCode, stdout: live.stdout, stderr: live.stderr },
    authoritativeVerification: { command: 'bun run verify:repo', exitCode: authoritative.exitCode, finalProtocol: 'PASS\\n', stderr: authoritative.stderr },
    requiredChecks: ['exitCode === 0', 'final stdout protocol is PASS\\n', 'stderr is empty'],
    canonicalEvidence,
  });
  await writeJson(p1Directory, 'ultraqa-receipt.json', {
    status: 'PASS',
    negativeProbes: {
      malformed: issue(malformed),
      traversal: issue(traversal),
      symlink: issue(symlink),
      hungValidator: issue(timeout),
      noOpValidator: issue(red),
      malformedLiveManifests: malformedLiveManifests.map(({ manifest, expected, result }) => ({ manifest, expected, observed: issue(result) })),
      malformedCandidateBindings: malformedCandidateBindings.map(({ manifest, expected, result }) => ({ manifest, expected, observed: issue(result) })),
    },
    canonicalEvidence,
    deterministicFixtureSuite: true,
    temporaryArtifacts: [],
    deletedOrMovedFiles: [],
  });
  await writeJson(p7Directory, 'verification-receipt.json', {
    status: 'PASS',
    structuralWorkflowPolicy: { command: `node ${liveVerifier.relative}`, exitCode: live.exitCode, stdout: live.stdout, stderr: live.stderr, workflowFileCount, workflows },
    liveWorkflowRegressions: { command: 'node tools/qa/repository/run-live-regressions.mjs', exitCode: liveRegressions.exitCode, finalProtocol: 'PASS\\n', stderr: liveRegressions.stderr },
    hostedWorkflow: { status: 'BLOCKED', blockedUntil: 'authorized-committed-workflow-execution' },
    oidc: { status: 'BLOCKED', blockedUntil: 'authorized-committed-workflow-execution' },
    attestation: { status: 'BLOCKED', blockedUntil: 'authorized-committed-workflow-execution' },
  });
  await writeJson(p7Directory, 'ultraqa-receipt.json', {
    status: 'PASS_WITH_HOSTED_BLOCKERS',
    localStructuralAndLiveWorkflowValidation: 'PASS',
    hostedWorkflow: { status: 'BLOCKED', executed: false },
    oidc: { status: 'BLOCKED', tokenRequested: false },
    attestation: { status: 'BLOCKED', verified: false },
    temporaryArtifacts: [],
    deletedOrMovedFiles: [],
  });
  await writeJson(evidenceDirectory, 'repo-bootstrap.json', {
    task: 'T5 repository bootstrap',
    supersedes: '.omo/evidence/implementation/20260728T000000Z/repository/a1/task-5',
    requiredT5Roots: model.repositoryContract.requiredT5Roots,
    requiredT5Files: model.repositoryContract.requiredT5Files,
    workspaces: model.packageManifest.workspaces,
    environments: Object.values(model.environmentDocuments).map((environment) => ({ id: environment.environmentId, targetApi: environment.targetApi, releaseTrack: environment.releaseTrack })),
    firestore: { rules: 'deny-all', indexes: 'empty' },
    workflows,
    canonicalEvidence,
    commandExits: { liveVerifier: live.exitCode, fixtureSuite: suite.exitCode, liveRegressions: liveRegressions.exitCode, verifyRepo: authoritative.exitCode },
    touchedPathInventory: {
      generatedEvidence: [...rootArtifacts, 'lanes/p1/green-receipt.json', 'lanes/p1/command-log.json', 'lanes/p1/verification-receipt.json', 'lanes/p1/ultraqa-receipt.json', 'lanes/p7/verification-receipt.json', 'lanes/p7/ultraqa-receipt.json'],
      captureSource: 'tools/qa/repository/capture-evidence.mjs',
      preExistingWorkspaceInputs: ['package.json', 'bun.lock', 'tools/qa/repository/**'],
    },
    localVerification: 'PASS',
    externalStates: externalBlockers(model),
    hostedAttestation: { status: 'BLOCKED', blockedUntil: 'authorized-committed-workflow-execution', proof: null },
    productionOrDeploymentClaim: 'NONE',
  });
  await writeFile(resolve(evidenceDirectory, 'dependency-graph.html'), dependencyGraph(model), 'utf8');
  await writeJson(evidenceDirectory, 'secret-scan.sarif', sarif);
  await writeJson(evidenceDirectory, 'scope-hash-verification.json', scopeHashes);
  await writeJson(evidenceDirectory, 'cleanup-receipt.json', {
    status: 'PASS',
    backgroundProcessesCreated: [],
    portsOpened: [],
    temporaryPathsCreated: [],
    deletedOrMovedFiles: [],
    preservedEvidence: true,
    childProcessPolicy: 'Only bounded synchronous local Node and Bun verification commands were used.',
  });
  process.stdout.write('PASS\n');
}

main().catch((error) => {
  const issue = error instanceof CaptureFailure
    ? { code: error.code, pointer: error.pointer, message: error.message }
    : { code: 'EVIDENCE_CAPTURE_FAILURE', pointer: '', message: error instanceof Error ? error.message : String(error) };
  process.stderr.write(`${JSON.stringify(issue)}\n`);
  process.exitCode = 1;
});
