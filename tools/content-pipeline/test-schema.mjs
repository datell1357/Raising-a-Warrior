#!/usr/bin/env node
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { CONTRACT_SCHEMA_FILES, loadContractSchemas, validateNamedSchema, selfTestSchemaEngine } from './src/schema-engine.mjs';
import { buildModelFiles } from './src/model-generator.mjs';
import { buildCommandModelFiles } from './src/command-model-generator.mjs';
import { runCommandModelAdversarialProbes, runCommandModelMutationProbes } from './src/command-model-mutation-probes.mjs';
import { runCommandSchemaRejectionProbes } from './src/command-schema-rejection-probes.mjs';
import { runA12PositiveEnumReuse, runA12RejectionProbes } from './src/command-schema-a12-probes.mjs';
import { runA13GeneratedTypeCollisionProbes } from './src/command-schema-a13-probes.mjs';
import { A14_FRAMEWORK_TYPES, runA14FrameworkTypeProbes } from './src/command-schema-a14-probes.mjs';
import { assertGeneratedModelMatches, buildPublicOddsProjection, compareGeneratedModels, generateArtifacts, junitXml, loadSnapshot, validatePublicOddsProjection, validateSnapshot, GENERATOR_VERSION } from './src/pipeline.mjs';
import { CSHARP_EXPECTED_ROUTES, CSHARP_INVALID_CASES, parserRoutesMatch, runCsharpVerification } from './src/csharp-verification.mjs';
import { auditCapAbsence, auditGeneratedCsharp } from './src/artifact-audit.mjs';
import { auditCommandContractOwnership } from './src/command-contract-audit.mjs';

const ROOT = resolve(process.cwd());
const CONTRACT_DIR = resolve(ROOT, 'content/contracts');
const FIXTURE_DIR = resolve(ROOT, 'tools/content-pipeline/fixtures');
const EVIDENCE_DIR = process.argv.find((arg) => arg.startsWith('--evidence-dir='))?.split('=', 2)[1] ?? null;
const modeArg = process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? null;
const RUN_ID = `${GENERATOR_VERSION}-a14-final`;

const VALID_SCHEMA_FIXTURES = new Map([
  ['command-envelope.json', 'command.schema.json'],
  ['command-result.json', 'command.schema.json'],
  ['command-error.json', 'command.schema.json'],
  ['manifest.json', 'manifest.schema.json'],
  ['release-candidate.json', 'release-candidate.schema.json'],
  ['locale.json', 'locale.schema.json'],
]);

const NEGATIVE_SCHEMA_FIXTURES = new Map([
  ['command-type-discriminator.json', 'command.schema.json'],
  ['command-unknown-domain-error.json', 'command.schema.json'],
]);

const NEGATIVE_FIXTURES = [
  'negative/duplicate-ids.json',
  'negative/cyclic-quests.json',
  'negative/invalid-330300.json',
  'negative/negative-cost.json',
  'negative/int64-overflow.json',
  'negative/offline-cap-missing.json',
  'negative/offline-cap-invalid.json',
  'negative/offline-cap-over-max.json',
  'negative/zero-weight-pool.json',
  'negative/ownership-drift.json',
  'negative/client-leak.json',
  'negative/content-version-pattern.json',
  'negative/missing-manifest-field.json',
  'negative/locale-extra-field.json',
  'negative/missing-release-candidate-field.json',
  'negative/malformed-catalog-item.json',
  'negative/game-missing-required-field.json',
  'negative/public-odds-normalization.json',
  'negative/command-type-discriminator.json',
  'negative/command-unknown-domain-error.json',
];

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function commandString(command, args) {
  return [command, ...args.map((arg) => JSON.stringify(arg).includes(' ') ? JSON.stringify(arg) : arg)].join(' ');
}

function runCommand(label, command, args, options = {}) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, ...options });
  return {
    label,
    command: commandString(command, args),
    exit_code: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    signal: result.signal ?? null,
    durationMs: Date.now() - startedAt,
  };
}

function fixturePath(relative) {
  return resolve(FIXTURE_DIR, relative);
}

function childFixtureSchema(fileName) {
  return VALID_SCHEMA_FIXTURES.get(fileName) ?? null;
}

async function validateChildMode(targetPath, schemas) {
  const fileName = basename(targetPath);
  if (VALID_SCHEMA_FIXTURES.has(fileName) || NEGATIVE_SCHEMA_FIXTURES.has(fileName)) {
    const schemaName = VALID_SCHEMA_FIXTURES.get(fileName) ?? NEGATIVE_SCHEMA_FIXTURES.get(fileName);
    const instance = await loadSnapshot(targetPath);
    validateNamedSchema(instance, schemaName, schemas);
    console.log('PASS');
    return;
  }

  const snapshot = await loadSnapshot(targetPath);
  const baseName = basename(targetPath);
  if (baseName === 'public-odds-normalization.json') {
    validatePublicOddsProjection(snapshot);
    return;
  }

  const clientMode = baseName === 'client-leak.json';
  validateSnapshot(snapshot, { client: clientMode, schemas });
  console.log('PASS');
}

async function writeJson(fileName, value) {
  if (!EVIDENCE_DIR) return;
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(resolve(EVIDENCE_DIR, fileName), JSON.stringify(value, null, 2) + '\n', 'utf8');
}

async function writeText(fileName, value) {
  if (!EVIDENCE_DIR) return;
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(resolve(EVIDENCE_DIR, fileName), value, 'utf8');
}

async function runSuite() {
  const schemas = await loadContractSchemas(CONTRACT_DIR);
  const keywordCoverage = selfTestSchemaEngine();
  const commandLog = [];
  const negativeResults = [];
  const adversarialResults = [];
  const junitCases = [];

  const scopeResult = runCommand('validate-scope', 'bun', ['run', 'validate:scope']);
  commandLog.push(scopeResult);
  if (scopeResult.exit_code !== 0) {
    throw new Error(`validate:scope failed: ${scopeResult.stderr || scopeResult.stdout}`);
  }

  const launch = await loadSnapshot(fixturePath('canonical-launch.json'));
  validateSnapshot(launch, { schemas });
  const d90 = await loadSnapshot(fixturePath('canonical-d90.json'));
  validateSnapshot(d90, { schemas });

  const launchArtifacts = await generateArtifacts(launch, ROOT, schemas);
  const d90Artifacts = await generateArtifacts(d90, ROOT, schemas);
  const csharpCompatibility = await auditGeneratedCsharp(ROOT);
  const capAbsence = await auditCapAbsence(ROOT);
  const commandContractProof = await auditCommandContractOwnership({ schemas, fixtureDir: FIXTURE_DIR, root: ROOT });
  const commandContractResult = runCommand('command-contract-single-source', 'node', ['tools/content-pipeline/check-command-contract.mjs']);
  commandLog.push(commandContractResult);
  if (commandContractResult.exit_code !== 0) throw new Error(`command contract audit failed: ${commandContractResult.stderr || commandContractResult.stdout}`);

  validateSnapshot(launchArtifacts.projection.client, { client: true, schemas });
  validateSnapshot(launchArtifacts.projection.server, { schemas });
  validateSnapshot(d90Artifacts.projection.client, { client: true, schemas });
  validateSnapshot(d90Artifacts.projection.server, { schemas });

  const csharpResult = await runCsharpVerification({ root: ROOT, fixtureDir: FIXTURE_DIR, runCommand });
  commandLog.push(csharpResult.libraryCompile);
  if (csharpResult.hostRun) commandLog.push(csharpResult.hostRun);
  if (csharpResult.libraryCompile.exit_code !== 0) {
    throw new Error(`C# netstandard2.1 compile failed: ${csharpResult.libraryCompile.stderr || csharpResult.libraryCompile.stdout}`);
  }
  if (!csharpResult.hostRun || csharpResult.hostRun.exit_code !== 0 || !csharpResult.hostRun.stdout.includes('CSharpRoundtrip PASS')) {
    throw new Error(`C# runnable host failed: ${csharpResult.hostRun?.stderr || csharpResult.hostRun?.stdout || 'host did not run'}`);
  }
  if (!parserRoutesMatch(CSHARP_EXPECTED_ROUTES, csharpResult.parserRoutes)) {
    throw new Error('C# invalid parser routes diverged from their explicit targets');
  }
  const expectedWitnesses = [['GameSnapshot', 'CanonicalJson'], ['CommandEnvelope', 'CanonicalCommandJson'], ['CommandResult', 'CanonicalCommandJson'], ['CommandError', 'CanonicalCommandJson']];
  if (csharpResult.witnesses.length !== 4 || !expectedWitnesses.every(([target, parser], index) => csharpResult.witnesses[index].target === target && csharpResult.witnesses[index].parser === parser && csharpResult.witnesses[index].runtime === target) || !csharpResult.wrongDelegateControl) throw new Error('C# delegate witness/control diverged');
  const routeRegression = csharpResult.parserRoutes.map((route, index) => index === 0 ? { ...route, parser: 'CanonicalCommandJson' } : route);
  if (parserRoutesMatch(CSHARP_EXPECTED_ROUTES, routeRegression)) throw new Error('C# parser-route wiring regression was accepted');
  if (!csharpResult.invalidTargetDispatch) throw new Error('C# invalid target dispatch was accepted by the rejection path');
  junitCases.push({ name: 'csharp-netstandard2.1-library-compile', time: 0 });
  junitCases.push({ name: 'csharp-runnable-host-roundtrip-invalid-matrix', time: 0 });
  junitCases.push({ name: 'csharp-invalid-parser-routes', time: 0 });
  junitCases.push({ name: 'csharp-parser-route-wiring-regression-detected', time: 0 });
  junitCases.push({ name: 'csharp-valid-delegate-witnesses-and-wrong-delegate-control', time: 0 });
  junitCases.push({ name: 'csharp-invalid-target-dispatch-fails-before-rejection-catch', time: 0 });
  junitCases.push({ name: 'csharp-unity6-source-compatibility', time: 0 });
  junitCases.push({ name: 'product-cap-absence', time: 0 });
  junitCases.push({ name: 'command-schema-authority-and-generated-enum-sync', time: 0 });
  for (const { name } of CSHARP_INVALID_CASES) junitCases.push({ name: `csharp-reject-${name}`, time: 0 });

  const expectedModels = buildModelFiles(launch, launchArtifacts.sourceHash, GENERATOR_VERSION);
  const expectedCommandModels = buildCommandModelFiles(schemas['command.schema.json'], launchArtifacts.commandSourceHash, GENERATOR_VERSION);
  const commandMutationProbes = runCommandModelMutationProbes(schemas['command.schema.json'], launchArtifacts.commandSourceHash, GENERATOR_VERSION);
  const commandAdversarialProbes = runCommandModelAdversarialProbes(schemas['command.schema.json'], launchArtifacts.commandSourceHash, GENERATOR_VERSION);
  const commandRejectionProbes = runCommandSchemaRejectionProbes(schemas['command.schema.json'], launchArtifacts.commandSourceHash, GENERATOR_VERSION);
  const a12RejectionProbes = runA12RejectionProbes(schemas['command.schema.json'], launchArtifacts.commandSourceHash, GENERATOR_VERSION);
  const a12PositiveEnumReuse = runA12PositiveEnumReuse(schemas['command.schema.json'], launchArtifacts.commandSourceHash, GENERATOR_VERSION);
  const a13GeneratedTypeCollisionProbes = runA13GeneratedTypeCollisionProbes(schemas['command.schema.json'], launchArtifacts.commandSourceHash, GENERATOR_VERSION);
  const a14FrameworkTypeProbes = runA14FrameworkTypeProbes(schemas['command.schema.json'], launchArtifacts.commandSourceHash, GENERATOR_VERSION);
  for (const probe of commandMutationProbes) {
    junitCases.push({ name: `command-schema-mutation-${probe.name}-typescript`, time: 0 });
    junitCases.push({ name: `command-schema-mutation-${probe.name}-csharp`, time: 0 });
    junitCases.push({ name: `command-schema-mutation-${probe.name}-typescript-replaced-field-absent`, time: 0 });
    junitCases.push({ name: `command-schema-mutation-${probe.name}-csharp-replaced-field-absent`, time: 0 });
  }
  for (const probe of commandAdversarialProbes) junitCases.push({ name: `command-schema-adversarial-${probe.name}`, time: 0 });
  for (const probe of commandRejectionProbes) junitCases.push({ name: `command-schema-reject-${probe.name}`, time: 0 });
  for (const probe of a12RejectionProbes) junitCases.push({ name: `command-schema-a12-reject-${probe.name}`, time: 0 });
  junitCases.push({ name: 'command-schema-a12-positive-enum-reuse', time: 0 });
  for (const probe of a13GeneratedTypeCollisionProbes) junitCases.push({ name: `command-schema-a13-generated-type-${probe.name}`, time: 0 });
  for (const probe of a14FrameworkTypeProbes) junitCases.push({ name: `command-schema-a14-framework-type-${probe.name}`, time: 0 });
  const isolatedDriftProbes = [];
  for (const [name, expected, mutated] of [
    ['typescript-only-drift', expectedModels.ts, `${expectedModels.ts}\n// in-memory probe`],
    ['csharp-only-drift', expectedModels.cs, `${expectedModels.cs}\n// in-memory probe`],
    ['command-typescript-only-drift', expectedCommandModels.ts, `${expectedCommandModels.ts}\n// in-memory probe`],
    ['command-csharp-only-drift', expectedCommandModels.cs, `${expectedCommandModels.cs}\n// in-memory probe`],
  ]) {
    try {
      assertGeneratedModelMatches(name, expected, mutated);
      throw new Error(`${name} did not detect drift`);
    } catch (error) {
      if (error.code !== 'GENERATED_MODEL_DRIFT') throw error;
      isolatedDriftProbes.push({ name, code: error.code, pointer: error.pointer });
      junitCases.push({ name, time: 0 });
    }
  }

  const publicOdds = buildPublicOddsProjection(launch);
  validatePublicOddsProjection(publicOdds);
  junitCases.push({ name: 'public-odds-exact-normalization', time: 0 });

  const schemaFixtures = [
    ['command-envelope', 'schema-valid/command-envelope.json'],
    ['command-result', 'schema-valid/command-result.json'],
    ['command-error', 'schema-valid/command-error.json'],
    ['manifest', 'schema-valid/manifest.json'],
    ['release-candidate', 'schema-valid/release-candidate.json'],
    ['locale', 'schema-valid/locale.json'],
  ];
  for (const [name, rel] of schemaFixtures) {
    const schemaName = childFixtureSchema(basename(rel));
    const instance = await loadSnapshot(resolve(FIXTURE_DIR, rel));
    validateNamedSchema(instance, schemaName, schemas);
    junitCases.push({ name, time: 0 });
  }

  junitCases.push({ name: 'canonical-launch', time: 0 });
  junitCases.push({ name: 'canonical-d90', time: 0 });

  const childTargets = NEGATIVE_FIXTURES.map((relative) => resolve(FIXTURE_DIR, relative));
  for (const target of childTargets) {
    const label = basename(target);
    const probe = runCommand(label, 'bun', ['run', 'test:schema', target]);
    commandLog.push(probe);
    negativeResults.push(probe);
    junitCases.push({ name: label, time: 0 });
    if (probe.exit_code === 0) {
      throw new Error(`expected negative probe to fail: ${label}`);
    }
  }

  const misleadingProbe = runCommand('misleading-success', 'node', ['-e', "process.stdout.write('PASS\\n'); process.exit(1)"]);
  commandLog.push(misleadingProbe);
  adversarialResults.push(misleadingProbe);
  if (misleadingProbe.exit_code !== 1 || misleadingProbe.stdout !== 'PASS\n') {
    throw new Error('misleading-success probe did not print PASS and exit 1');
  }

  const longTimeoutProbe = runCommand('long-timeout', 'node', ['-e', 'setTimeout(() => {}, 5000)'], { timeout: 1000 });
  commandLog.push(longTimeoutProbe);
  adversarialResults.push(longTimeoutProbe);

  const replayOne = {
    launch: launchArtifacts.sourceHash,
    d90: d90Artifacts.sourceHash,
    models: {
      launch: {
        typescript: launchArtifacts.modelHashes.typescript,
        csharp: launchArtifacts.modelHashes.csharp,
        sharedCsharp: launchArtifacts.modelHashes.sharedCsharp,
        commandTypescript: launchArtifacts.modelHashes.commandTypescript,
        commandCsharp: launchArtifacts.modelHashes.commandCsharp,
      },
      d90: {
        typescript: d90Artifacts.modelHashes.typescript,
        csharp: d90Artifacts.modelHashes.csharp,
        sharedCsharp: d90Artifacts.modelHashes.sharedCsharp,
        commandTypescript: d90Artifacts.modelHashes.commandTypescript,
        commandCsharp: d90Artifacts.modelHashes.commandCsharp,
      },
    },
    publicOdds: {
      launch: launchArtifacts.projectionHashes.publicOdds,
      d90: d90Artifacts.projectionHashes.publicOdds,
    },
  };
  const replayLaunchArtifacts = await generateArtifacts(launch, ROOT, schemas);
  const replayD90Artifacts = await generateArtifacts(d90, ROOT, schemas);
  const replayTwo = {
    launch: replayLaunchArtifacts.sourceHash,
    d90: replayD90Artifacts.sourceHash,
    models: {
      launch: {
        typescript: replayLaunchArtifacts.modelHashes.typescript,
        csharp: replayLaunchArtifacts.modelHashes.csharp,
        sharedCsharp: replayLaunchArtifacts.modelHashes.sharedCsharp,
        commandTypescript: replayLaunchArtifacts.modelHashes.commandTypescript,
        commandCsharp: replayLaunchArtifacts.modelHashes.commandCsharp,
      },
      d90: {
        typescript: replayD90Artifacts.modelHashes.typescript,
        csharp: replayD90Artifacts.modelHashes.csharp,
        sharedCsharp: replayD90Artifacts.modelHashes.sharedCsharp,
        commandTypescript: replayD90Artifacts.modelHashes.commandTypescript,
        commandCsharp: replayD90Artifacts.modelHashes.commandCsharp,
      },
    },
    publicOdds: {
      launch: replayLaunchArtifacts.projectionHashes.publicOdds,
      d90: replayD90Artifacts.projectionHashes.publicOdds,
    },
  };
  const deterministicReplay = sha256(JSON.stringify(replayOne)) === sha256(JSON.stringify(replayTwo));
  if (!deterministicReplay) throw new Error('independent generation replay was not deterministic');
  adversarialResults.push({ label: 'deterministic-replay', first: replayOne, second: replayTwo, stable: deterministicReplay });
  await compareGeneratedModels(launch, ROOT, schemas);
  await compareGeneratedModels(d90, ROOT, schemas);
  junitCases.push({ name: 'generated-models-match-after-independent-replay', time: 0 });

  const generatedHashes = {
    runId: RUN_ID,
    generatorVersion: GENERATOR_VERSION,
    command: {
      sourceHash: d90Artifacts.commandSourceHash,
      models: {
        typescript: d90Artifacts.modelHashes.commandTypescript,
        csharp: d90Artifacts.modelHashes.commandCsharp,
      },
    },
    launch: {
      sourceHash: launchArtifacts.sourceHash,
      projections: launchArtifacts.projectionHashes,
      models: launchArtifacts.modelHashes,
    },
    d90: {
      sourceHash: d90Artifacts.sourceHash,
      projections: d90Artifacts.projectionHashes,
      models: d90Artifacts.modelHashes,
    },
  };
  const publicOddsHashes = {
    runId: RUN_ID,
    launch: launchArtifacts.projectionHashes.publicOdds,
    d90: d90Artifacts.projectionHashes.publicOdds,
  };

  const artifactPaths = [
    'content/generated/typescript/launch-models.ts',
    'content/generated/typescript/d90-models.ts',
    'content/generated/typescript/content-models.ts',
    'content/generated/csharp/launch-models.cs',
    'content/generated/csharp/d90-models.cs',
    'content/generated/csharp/ContentModels.cs',
    'content/generated/typescript/command-models.ts',
    'content/generated/csharp/CommandModels.cs',
  ];
  const artifactHashes = {};
  const generatedModelPreview = {};
  for (const rel of artifactPaths) {
    const text = await readFile(resolve(ROOT, rel), 'utf8');
    artifactHashes[rel] = sha256(text);
    generatedModelPreview[rel] = text.split('\n').slice(0, 12).join('\n');
  }
  const a6EvidenceDir = resolve(ROOT, '.omo/evidence/implementation/20260727T000000Z/contracts/a6/task-3');
  const a6GeneratedHashes = JSON.parse(await readFile(resolve(a6EvidenceDir, 'generated-hashes.json'), 'utf8'));
  for (const snapshotId of ['launch', 'd90']) {
    if (generatedHashes[snapshotId].projections.publicOdds !== a6GeneratedHashes[snapshotId].projections.publicOdds) {
      throw new Error(`a6 ${snapshotId} public odds drifted`);
    }
  }
  const preservationProof = {
    baselineAttempt: 'a6',
    preservedPublicOddsHashes: { launch: generatedHashes.launch.projections.publicOdds, d90: generatedHashes.d90.projections.publicOdds },
    preservedGates: ['C#9/netstandard2.1 populated parsing', 'schema negatives', 'isolated drift', 'deterministic replay', 'cap absence', 'scope validation'],
    intentionalDifferences: ['game snapshots no longer embed command contracts', 'command models are generated as separate artifacts from command.schema.json', 'DomainError adds IdempotencyConflict'],
  };
  junitCases.push({ name: 'a6-public-odds-and-behavior-gate-preservation', time: 0 });

  const evidenceFiles = [
    'generated-hashes.json',
    'artifact-hashes.json',
    'command-log.json',
    'schema-junit.xml',
    'negative-fixtures.json',
    'negative-fixtures-results.json',
    'adversarial-results.json',
    'cleanup-receipt.json',
    'keyword-coverage-proof.json',
    'public-odds-hashes.json',
    'generated-model-preview.json',
    'schemas-unused.json',
    'historical-red-green.json',
    'isolated-drift-probes.json',
    'csharp-roundtrip.json',
    'csharp-compatibility.json',
    'cap-absence.json',
    'preservation-proof.json',
    'red-command-contract-duplication.json',
    'red-state-version-ownership.json',
    'green-command-contract-ownership.json',
    'command-schema-mutation-probes.json',
    'command-schema-adversarial-probes.json',
    'csharp-parser-routes.json',
    'misleading-success.json',
  ];

  await writeJson('generated-hashes.json', generatedHashes);
  await writeJson('artifact-hashes.json', artifactHashes);
  await writeJson('command-log.json', { runId: RUN_ID, commands: commandLog });
  await writeText('schema-junit.xml', junitXml(junitCases));
  await writeJson('negative-fixtures.json', NEGATIVE_FIXTURES);
  await writeJson('negative-fixtures-results.json', negativeResults);
  await writeJson('adversarial-results.json', adversarialResults);
  await writeJson('cleanup-receipt.json', {
    runId: RUN_ID,
    generatedFilesWritten: artifactPaths,
    driftProbesAreInMemory: true,
    generatedFilesRemainUnmodifiedByDriftProbes: true,
  });
  await writeJson('keyword-coverage-proof.json', { runId: RUN_ID, keywords: keywordCoverage });
  await writeJson('public-odds-hashes.json', publicOddsHashes);
  await writeJson('generated-model-preview.json', generatedModelPreview);
  await writeJson('schemas-unused.json', {
    runId: RUN_ID,
    loadedAndValidated: CONTRACT_SCHEMA_FILES,
  });
  await writeJson('historical-red-green.json', {
    runId: RUN_ID,
    historicalRedToGreen: [
      { historicalRed: 'incomplete generated model declarations', currentGreen: 'full canonical game and command declaration inventory generated in both languages' },
      { historicalRed: 'combined on-disk model drift probe', currentGreen: 'independent in-memory TypeScript-only and C#-only drift probes' },
      { historicalRed: 'rounded public odds did not sum exactly', currentGreen: 'largest-remainder ppm allocation sums exactly to 1000000' },
      { historicalRed: 'record-based C# compiled only in a modern host and returned a default model', currentGreen: 'sealed C#9 classes compile as netstandard2.1 and a separate host asserts populated launch/D90 values' },
      { historicalRed: 'copied determinism result', currentGreen: 'independent second generation reproduces TypeScript, C#, source and public-odds hashes' },
      { historicalRed: 'command contracts duplicated in game schema, game fixtures, and generated game models with kind/type divergence', currentGreen: 'command.schema.json exclusively owns command contracts and emits synchronized standalone TS/C# command models' },
      { historicalRed: 'handwritten contracts and hardcoded command generator fields', currentGreen: 'a8 ownership audit and schema mutation probes cover generated TypeScript, C# constructors, and mapper reads' },
    ],
  });
  await writeJson('isolated-drift-probes.json', { runId: RUN_ID, probes: isolatedDriftProbes });
  await writeJson('command-schema-mutation-probes.json', { runId: RUN_ID, probes: commandMutationProbes });
  await writeJson('command-schema-adversarial-probes.json', { runId: RUN_ID, probes: commandAdversarialProbes });
  await writeJson('command-schema-rejection-probes.json', { runId: RUN_ID, probes: commandRejectionProbes });
  await writeJson('command-schema-a12-rejection-matrix.json', { runId: RUN_ID, probes: a12RejectionProbes });
  await writeJson('command-schema-a12-positive-enum-reuse.json', { runId: RUN_ID, proof: a12PositiveEnumReuse });
  await writeJson('command-schema-a13-generated-type-collisions.json', { runId: RUN_ID, probes: a13GeneratedTypeCollisionProbes, reservedTypes: ['ContentVersion', 'CanonicalDecimalString', 'FixedInt64String', 'GeneratedCommandContract', 'CanonicalCommandJson', 'CommandModelMapper', 'JsonValue', 'JsonObjectValue', 'JsonArrayValue', 'JsonStringValue', 'JsonNumberValue', 'JsonBooleanValue', 'JsonNullValue', 'JsonParser', 'JsonObjectReader'] });
  await writeJson('command-schema-a14-framework-type-collisions.json', { runId: RUN_ID, frameworkTypes: A14_FRAMEWORK_TYPES, probes: a14FrameworkTypeProbes });
  await writeJson('csharp-parser-routes.json', { runId: RUN_ID, routes: csharpResult.parserRoutes, expected: CSHARP_EXPECTED_ROUTES, witnesses: csharpResult.witnesses, wrongDelegateControl: csharpResult.wrongDelegateControl, invalidTargetDispatch: csharpResult.invalidTargetDispatch, wiringRegressionDetected: true });
  await writeJson('csharp-roundtrip.json', {
    runId: RUN_ID,
    targetFramework: 'netstandard2.1',
    languageVersion: '9.0',
    libraryCompile: csharpResult.libraryCompile,
    hostRun: csharpResult.hostRun,
    invalidMatrix: CSHARP_INVALID_CASES,
    expectedRoutes: CSHARP_EXPECTED_ROUTES,
    parserRoutes: csharpResult.parserRoutes,
    invalidTargetDispatch: csharpResult.invalidTargetDispatch,
    checks: ['compile-all-generated-csharp-files', 'non-null-launch-model-values', 'non-null-d90-model-values', 'populated-command-envelope-result-error-values', 'field-specific-invalid-input-matrix', 'explicit-invalid-parser-routes', 'unknown-invalid-target-fails-before-rejection-catch'],
  });
  await writeJson('csharp-compatibility.json', { runId: RUN_ID, ...csharpCompatibility });
  await writeJson('cap-absence.json', { runId: RUN_ID, ...capAbsence });
  await writeJson('preservation-proof.json', { runId: RUN_ID, ...preservationProof });
  await writeJson('green-command-contract-ownership.json', { runId: RUN_ID, phase: 'GREEN', ...commandContractProof });
  await writeJson('misleading-success.json', { runId: RUN_ID, result: misleadingProbe, expected: { stdout: 'PASS\n', exit_code: 1 } });

  const report = generatedHashes;
  console.log(JSON.stringify(report, null, 2));
  console.log('PASS');
}

async function main() {
  const schemas = await loadContractSchemas(CONTRACT_DIR);
  selfTestSchemaEngine();
  if (modeArg) {
    const target = resolve(ROOT, modeArg);
    await validateChildMode(target, schemas);
    return;
  }
  await runSuite();
}

main().catch((error) => {
  console.error(JSON.stringify({ code: error.code ?? 'PIPELINE_FAILURE', pointer: error.pointer ?? '', message: error.message }));
  process.exit(1);
});
