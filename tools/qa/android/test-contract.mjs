#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { ContractError, array, exactKeys, fail, object, string } from '../repository/contract-utils.mjs';
import { parseUnityArtifactFiles, shouldIgnoreRepositoryPath } from '../repository/repository-model.mjs';
import { T6_UNITY_CONTRACT, validateUnityCandidate, validateUnityPolicyDeclaration, validateUnityProject } from '../repository/repository-policy.mjs';
import { assertSafePath } from '../repository/path-safety.mjs';
import { runAndroidQualification } from './android-qualification.mjs';
import { runUnityTests } from './unity-tests.mjs';

const root = resolve(process.cwd());
const defaultManifest = 'tools/qa/android/fixtures/contract-suite.json';
const evidenceRoot = resolve(root, '.omo/evidence');
const projectRoot = 'client/WarriorRaising';
const candidateFixtureDirectory = 'tools/qa/android/fixtures/candidate';
const liveFixtureDirectory = 'tools/qa/android/fixtures/live';
const runtimeAssemblies = Object.freeze(['Core', 'Domain', 'Application', 'Combat', 'Content', 'Platform', 'Presentation']);
const targetAsmdefs = Object.freeze([
  Object.freeze({ name: 'Core', kind: 'runtime', references: Object.freeze([]), includePlatforms: Object.freeze([]) }),
  Object.freeze({ name: 'Domain', kind: 'runtime', references: Object.freeze(['Core']), includePlatforms: Object.freeze([]) }),
  Object.freeze({ name: 'Application', kind: 'runtime', references: Object.freeze(['Core', 'Domain']), includePlatforms: Object.freeze([]) }),
  Object.freeze({ name: 'Combat', kind: 'runtime', references: Object.freeze(['Core', 'Domain']), includePlatforms: Object.freeze([]) }),
  Object.freeze({ name: 'Content', kind: 'runtime', references: Object.freeze(['Core', 'Domain']), includePlatforms: Object.freeze([]) }),
  Object.freeze({ name: 'Platform', kind: 'runtime', references: Object.freeze(['Core', 'Domain', 'Application']), includePlatforms: Object.freeze([]) }),
  Object.freeze({ name: 'Presentation', kind: 'runtime', references: Object.freeze(['Core', 'Domain', 'Application', 'Combat', 'Content']), includePlatforms: Object.freeze([]) }),
  Object.freeze({ name: 'Tests.EditMode', kind: 'test-editmode', references: Object.freeze([...runtimeAssemblies]), includePlatforms: Object.freeze(['Editor']) }),
  Object.freeze({ name: 'Tests.PlayMode', kind: 'test-playmode', references: Object.freeze([...runtimeAssemblies]), includePlatforms: Object.freeze([]) }),
]);
const expectedCandidateFixtures = Object.freeze([
  Object.freeze({ id: 'missing-runtime', path: 'tools/qa/android/fixtures/candidate/missing-runtime.json', expect: Object.freeze({ code: 'UNITY_ASMDEF_RUNTIME_MISSING', pointer: '/asmdefs/Combat' }) }),
  Object.freeze({ id: 'missing-editmode', path: 'tools/qa/android/fixtures/candidate/missing-editmode.json', expect: Object.freeze({ code: 'UNITY_ASMDEF_TEST_MISSING', pointer: '/asmdefs/Tests.EditMode' }) }),
  Object.freeze({ id: 'missing-playmode', path: 'tools/qa/android/fixtures/candidate/missing-playmode.json', expect: Object.freeze({ code: 'UNITY_ASMDEF_TEST_MISSING', pointer: '/asmdefs/Tests.PlayMode' }) }),
  Object.freeze({ id: 'extra-asmdef', path: 'tools/qa/android/fixtures/candidate/extra-asmdef.json', expect: Object.freeze({ code: 'UNITY_ASMDEF_EXTRA', pointer: '/asmdefs/Extra' }) }),
  Object.freeze({ id: 'reverse-reference', path: 'tools/qa/android/fixtures/candidate/reverse-reference.json', expect: Object.freeze({ code: 'UNITY_ASMDEF_REVERSE_REFERENCE', pointer: '/asmdefs/Domain/references/1' }) }),
  Object.freeze({ id: 'cycle-reference', path: 'tools/qa/android/fixtures/candidate/cycle-reference.json', expect: Object.freeze({ code: 'UNITY_ASMDEF_CYCLE', pointer: '/asmdefs' }) }),
  Object.freeze({ id: 'runtime-to-test-reference', path: 'tools/qa/android/fixtures/candidate/runtime-to-test-reference.json', expect: Object.freeze({ code: 'UNITY_ASMDEF_RUNTIME_TO_TEST', pointer: '/asmdefs/Core/references/0' }) }),
  Object.freeze({ id: 'test-platform-drift', path: 'tools/qa/android/fixtures/candidate/test-platform-drift.json', expect: Object.freeze({ code: 'UNITY_TEST_PLATFORM_INVALID', pointer: '/asmdefs/Tests.EditMode/includePlatforms/0' }) }),
]);
const expectedLiveFixtures = Object.freeze([
  Object.freeze({ id: 'unity-version-drift', path: 'tools/qa/android/fixtures/live/unity-version-drift.json', expect: Object.freeze({ code: 'UNITY_VERSION_INVALID', pointer: '/ProjectSettings/ProjectVersion.txt' }) }),
  Object.freeze({ id: 'unity-package-drift', path: 'tools/qa/android/fixtures/live/unity-package-drift.json', expect: Object.freeze({ code: 'UNITY_PACKAGE_REQUIRED', pointer: '/Packages/manifest.json/dependencies/com.unity.addressables' }) }),
  Object.freeze({ id: 'android-target-35-drift', path: 'tools/qa/android/fixtures/live/android-api35-drift.json', expect: Object.freeze({ code: 'ANDROID_TARGET_API_INVALID', pointer: '/ProjectSettings/ProjectSettings.asset/AndroidTargetSdkVersion' }) }),
  Object.freeze({ id: 'android-mixed-abi', path: 'tools/qa/android/fixtures/live/android-mixed-abi.json', expect: Object.freeze({ code: 'ANDROID_ABI_INVALID', pointer: '/ProjectSettings/ProjectSettings.asset/AndroidTargetArchitectures' }) }),
  Object.freeze({ id: 'android-aab-drift', path: 'tools/qa/android/fixtures/live/android-aab-drift.json', expect: Object.freeze({ code: 'ANDROID_AAB_REQUIRED', pointer: '/android/build/output' }) }),
  Object.freeze({ id: 'android-symbol-drift', path: 'tools/qa/android/fixtures/live/android-symbol-drift.json', expect: Object.freeze({ code: 'ANDROID_SYMBOLS_REQUIRED', pointer: '/android/build/symbols' }) }),
  Object.freeze({ id: 'android-pad-drift', path: 'tools/qa/android/fixtures/live/android-pad-drift.json', expect: Object.freeze({ code: 'ANDROID_PAD_REQUIRED', pointer: '/android/pad' }) }),
  Object.freeze({ id: 'forbidden-pfd', path: 'tools/qa/android/fixtures/live/forbidden-pfd.json', expect: Object.freeze({ code: 'PLAY_FEATURE_DELIVERY_FORBIDDEN', pointer: '/Packages/manifest.json/dependencies/com.unity.modules.pfd' }) }),
  Object.freeze({ id: 'forbidden-ios', path: 'tools/qa/android/fixtures/live/forbidden-ios.json', expect: Object.freeze({ code: 'IOS_TARGET_FORBIDDEN', pointer: '/ProjectSettings/ProjectSettings.asset/iOS' }) }),
  Object.freeze({ id: 'playmode-runtime-platform-drift', path: 'tools/qa/android/fixtures/live/playmode-runtime-platform-drift.json', expect: Object.freeze({ code: 'UNITY_PLAYMODE_RUNTIME_PLATFORM_INVALID', pointer: '/Assets/Warrior/Tests/PlayMode/BootstrapShellPlayModeTests.cs' }) }),
]);
const projectSettingsParserProbes = Object.freeze([
  Object.freeze({
    label: 'unity-6000-5-indented-map',
    source: ['PlayerSettings:', '  AndroidTargetSdkVersion: 36', '  AndroidTargetArchitectures: 2', '  scriptingBackend:', '    Android: 1'].join('\n'),
    expected: Object.freeze({ targetApi: '36', architectures: '2', scriptingBackend: '1', ios: null }),
  }),
  Object.freeze({
    label: 'legacy-column-zero-scalar',
    source: ['AndroidTargetSdkVersion: 36', 'AndroidTargetArchitectures: ARM64', 'AndroidScriptingBackend: IL2CPP', 'iOS: disabled'].join('\n'),
    expected: Object.freeze({ targetApi: '36', architectures: 'ARM64', scriptingBackend: 'IL2CPP', ios: 'disabled' }),
  }),
  Object.freeze({
    label: 'alternate-scalar-key',
    source: 'ScriptingBackend: IL2CPP',
    expected: Object.freeze({ targetApi: null, architectures: null, scriptingBackend: 'IL2CPP', ios: null }),
  }),
  Object.freeze({
    label: 'first-duplicate-scalar-key-wins',
    source: ['AndroidTargetSdkVersion: 36', 'AndroidTargetSdkVersion: 35'].join('\n'),
    expected: Object.freeze({ targetApi: '36', architectures: null, scriptingBackend: null, ios: null }),
  }),
  Object.freeze({
    label: 'malformed-target-map-has-no-value',
    source: ['scriptingBackend:', '  Android:'].join('\n'),
    expected: Object.freeze({ targetApi: null, architectures: null, scriptingBackend: null, ios: null }),
  }),
]);

function equal(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}

function fixtureInventoryHash() {
  return createHash('sha256').update(JSON.stringify(canonicalize({ candidateFixtures: expectedCandidateFixtures, liveFixtures: expectedLiveFixtures }))).digest('hex');
}

function payloadHash(value) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function parseArguments(args) {
  const options = { manifest: defaultManifest, evidenceDir: null, mode: null, variant: null, verifyAndroid: false };
  const seen = new Set();
  const keys = new Map([['--manifest', 'manifest'], ['--evidence-dir', 'evidenceDir'], ['--mode', 'mode'], ['--variant', 'variant']]);
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--verify-android') {
      if (seen.has('verifyAndroid')) fail('DUPLICATE_ARGUMENT', '', 'duplicate argument --verify-android');
      seen.add('verifyAndroid');
      options.verifyAndroid = true;
      continue;
    }
    const [flag, inlineValue] = argument.split('=', 2);
    const option = keys.get(flag);
    if (!option) fail('UNSUPPORTED_ARGUMENT', '', `unsupported argument ${argument}`);
    if (seen.has(option)) fail('DUPLICATE_ARGUMENT', '', `duplicate argument ${flag}`);
    seen.add(option);
    const value = inlineValue === undefined ? args[++index] : inlineValue;
    if (value === undefined || value.startsWith('--')) fail('MISSING_ARGUMENT_VALUE', '', `missing value for ${flag}`);
    options[option] = value;
  }
  if (options.mode !== null && !['editmode', 'playmode'].includes(options.mode)) fail('UNITY_TEST_MODE_INVALID', '/mode', 'Unity test mode must be editmode or playmode');
  if (options.variant !== null && !['dev', 'stage', 'prod'].includes(options.variant)) fail('ANDROID_VARIANT_INVALID', '/variant', 'Android variant must be dev, stage, or prod');
  if (options.mode !== null && options.verifyAndroid) fail('INCOMPATIBLE_ARGUMENTS', '', 'Unity test mode cannot be combined with Android verification');
  return options;
}

function repositoryJsonPath(value, pointer, code) {
  const path = string(value, pointer);
  if (isAbsolute(path) || path.includes('\\') || !path.endsWith('.json') || path.split('/').some((part) => part === '' || part === '.' || part === '..')) {
    fail(code, pointer, 'path must be a repository-relative JSON file without traversal');
  }
  const absolute = resolve(root, path);
  const local = relative(root, absolute);
  if (!local || local.startsWith('..') || resolve(root, local) !== absolute) fail(code, pointer, 'path must remain within the repository');
  return { path, absolute };
}

function projectRelativePath(value, pointer) {
  const path = string(value, pointer);
  if (isAbsolute(path) || path.includes('\\') || path.split('/').some((part) => part === '' || part === '.' || part === '..')) {
    fail('LIVE_FIXTURE_PATH_INVALID', pointer, 'live fixture path must remain project-relative without traversal');
  }
  return path;
}

async function readJson(entry, pointer) {
  await assertSafePath(root, entry.absolute, pointer, true);
  let source;
  try {
    source = await readFile(entry.absolute, 'utf8');
  } catch (error) {
    fail('INPUT_UNREADABLE', pointer, error instanceof Error ? error.message : 'input could not be read');
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    fail('INPUT_INVALID_JSON', pointer, error instanceof Error ? error.message : 'input JSON could not be parsed');
  }
}

function diagnostic(value, pointer) {
  const issue = exactKeys(object(value, pointer), ['code', 'pointer'], pointer);
  return { code: string(issue.code, `${pointer}/code`), pointer: string(issue.pointer, `${pointer}/pointer`) };
}

function assertFixtureInventory(value, expected, pointer) {
  const fixtures = array(value, pointer);
  const ids = new Set();
  const paths = new Set();
  const parsed = fixtures.map((entry, index) => {
    const at = `${pointer}/${index}`;
    const fixture = exactKeys(object(entry, at), ['id', 'path', 'expect'], at);
    const id = string(fixture.id, `${at}/id`);
    if (ids.has(id)) fail('DUPLICATE_FIXTURE_ID', `${at}/id`, `duplicate fixture id ${id}`);
    ids.add(id);
    const fixturePath = repositoryJsonPath(fixture.path, `${at}/path`, 'FIXTURE_PATH_INVALID');
    if (paths.has(fixturePath.path)) fail('DUPLICATE_FIXTURE_PATH', `${at}/path`, `duplicate fixture path ${fixturePath.path}`);
    paths.add(fixturePath.path);
    return { id, path: fixturePath.path, absolute: fixturePath.absolute, expect: diagnostic(fixture.expect, `${at}/expect`) };
  });
  if (parsed.length !== expected.length) fail('ANDROID_FIXTURE_INVENTORY_INVALID', pointer, 'Android fixture inventory must be complete and exact');
  for (let index = 0; index < expected.length; index += 1) {
    const actual = parsed[index];
    const target = expected[index];
    if (!actual || actual.id !== target.id || actual.path !== target.path || !equal(actual.expect, target.expect)) {
      fail('ANDROID_FIXTURE_INVENTORY_INVALID', `${pointer}/${index}`, 'Android fixture inventory differs from the canonical registration');
    }
  }
  return parsed;
}

async function fixtureDirectoryPaths(directory, pointer, injectedEntries = null) {
  if (injectedEntries !== null) return [...injectedEntries].sort();
  const absolute = resolve(root, directory);
  await assertSafePath(root, absolute, pointer);
  const entries = await readdir(absolute, { withFileTypes: true });
  const paths = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isSymbolicLink()) fail('SYMLINK_FORBIDDEN', `${pointer}/${entry.name}`, 'fixture directory must not contain symlinks');
    if (!entry.isFile() || !entry.name.endsWith('.json')) fail('FIXTURE_DIRECTORY_ENTRY_INVALID', `${pointer}/${entry.name}`, 'fixture directory must contain only JSON files');
    paths.push(`${directory}/${entry.name}`);
  }
  return paths;
}

function assertFixtureDirectoryCoverage(discovered, expected, pointer) {
  const actual = [...discovered].sort();
  const required = [...expected].sort();
  const orphan = actual.find((path) => !required.includes(path));
  if (orphan) fail('ORPHAN_FIXTURE_FILE', `${pointer}/${orphan.slice(orphan.lastIndexOf('/') + 1)}`, 'fixture directory contains an unregistered JSON fixture');
  const missing = required.find((path) => !actual.includes(path));
  if (missing) fail('MISSING_FIXTURE_FILE', pointer, `fixture directory is missing ${missing}`);
  if (new Set(actual).size !== actual.length) fail('DUPLICATE_FIXTURE_PATH', pointer, 'fixture directory contains a duplicate path');
  return actual;
}

async function assertFixtureDirectoryInventories(canonicalPath, candidates, live) {
  const candidatePaths = await fixtureDirectoryPaths(candidateFixtureDirectory, '/candidateDirectory');
  const livePaths = await fixtureDirectoryPaths(liveFixtureDirectory, '/liveDirectory');
  assertFixtureDirectoryCoverage(candidatePaths, [canonicalPath, ...candidates.map(({ path }) => path)], '/candidateDirectory');
  assertFixtureDirectoryCoverage(livePaths, live.map(({ path }) => path), '/liveDirectory');
  return { candidatePaths, livePaths };
}

function applyPatch(candidate, value, pointer) {
  const patch = exactKeys(object(value, pointer), ['op', 'pointer', 'value'], pointer);
  if (!['add', 'remove', 'replace'].includes(patch.op)) fail('INVALID_PATCH_OPERATION', `${pointer}/op`, 'fixture patch operation must be add, remove, or replace');
  const encoded = string(patch.pointer, `${pointer}/pointer`);
  if (!encoded.startsWith('/')) fail('INVALID_PATCH_POINTER', `${pointer}/pointer`, 'fixture patch pointer must begin with /');
  const parts = encoded.slice(1).split('/').map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
  let parent = candidate;
  for (const part of parts.slice(0, -1)) {
    if (!parent || typeof parent !== 'object' || !(part in parent)) fail('INVALID_PATCH_POINTER', `${pointer}/pointer`, 'fixture patch parent does not exist');
    parent = parent[part];
  }
  const key = parts.at(-1);
  if (Array.isArray(parent)) {
    if (patch.op === 'add' && key === '-') {
      parent.push(patch.value);
      return;
    }
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index > parent.length || (patch.op !== 'add' && index === parent.length)) fail('INVALID_PATCH_POINTER', `${pointer}/pointer`, 'fixture patch array index does not exist');
    if (patch.op === 'remove') parent.splice(index, 1);
    else if (patch.op === 'add') parent.splice(index, 0, patch.value);
    else parent[index] = patch.value;
    return;
  }
  if (!parent || typeof parent !== 'object' || (patch.op !== 'add' && !(key in parent))) fail('INVALID_PATCH_POINTER', `${pointer}/pointer`, 'fixture patch key does not exist');
  if (patch.op === 'remove') delete parent[key];
  else parent[key] = patch.value;
}

function assertCanonicalCandidate(value) {
  const candidate = exactKeys(object(value, '/canonical'), ['kind', 'unity', 'asmdefs'], '/canonical');
  if (candidate.kind !== 'unity-android-contract-canonical') fail('CANONICAL_FIXTURE_KIND_INVALID', '/canonical/kind', 'canonical fixture kind must be unity-android-contract-canonical');
  const unity = exactKeys(object(candidate.unity, '/canonical/unity'), ['editorMajor', 'requiredPackages', 'targetApi', 'androidAbi', 'artifactFormat', 'symbols', 'pad', 'playFeatureDelivery', 'iosReleaseTarget'], '/canonical/unity');
  if (unity.editorMajor !== 6000 || !equal(array(unity.requiredPackages, '/canonical/unity/requiredPackages'), ['com.unity.addressables']) || unity.targetApi !== 36 || unity.androidAbi !== 'ARM64' || unity.artifactFormat !== 'AAB' || unity.symbols !== 'public' || unity.pad !== 'asset-pack' || unity.playFeatureDelivery !== false || unity.iosReleaseTarget !== false) {
    fail('CANONICAL_ANDROID_CONTRACT_INVALID', '/canonical/unity', 'canonical Unity Android contract must be exact');
  }
  const asmdefs = array(candidate.asmdefs, '/canonical/asmdefs');
  if (asmdefs.length !== targetAsmdefs.length) fail('ANDROID_TARGET_GRAPH_INVALID', '/canonical/asmdefs', 'target graph must contain exactly nine assemblies');
  asmdefs.forEach((value, index) => {
    const at = `/canonical/asmdefs/${index}`;
    const assembly = exactKeys(object(value, at), ['name', 'kind', 'references', 'includePlatforms'], at);
    const expected = targetAsmdefs[index];
    if (assembly.name !== expected.name || assembly.kind !== expected.kind || !equal(assembly.references, expected.references) || !equal(assembly.includePlatforms, expected.includePlatforms)) {
      fail('ANDROID_TARGET_GRAPH_INVALID', at, 'target graph must be exact and ordered');
    }
  });
  return candidate;
}

function assertCandidateFixture(value, expected, canonical) {
  const fixture = exactKeys(object(value, `/fixtures/${expected.id}`), ['kind', 'id', 'expect', 'patches'], `/fixtures/${expected.id}`);
  if (fixture.kind !== 'unity-android-candidate-fixture') fail('INVALID_FIXTURE_KIND', `/fixtures/${expected.id}/kind`, 'candidate fixture kind is unsupported');
  if (string(fixture.id, `/fixtures/${expected.id}/id`) !== expected.id || !equal(diagnostic(fixture.expect, `/fixtures/${expected.id}/expect`), expected.expect)) {
    fail('ANDROID_FIXTURE_DECLARATION_INVALID', `/fixtures/${expected.id}`, 'candidate fixture declaration must match its inventory registration');
  }
  const patches = array(fixture.patches, `/fixtures/${expected.id}/patches`);
  if (patches.length === 0) fail('CANDIDATE_FIXTURE_PATCHES_EMPTY', `/fixtures/${expected.id}/patches`, 'candidate fixture must alter the canonical candidate');
  const overlaid = structuredClone(canonical);
  patches.forEach((patch, index) => applyPatch(overlaid, patch, `/fixtures/${expected.id}/patches/${index}`));
  if (equal(overlaid, canonical)) fail('CANDIDATE_FIXTURE_NO_EFFECT', `/fixtures/${expected.id}/patches`, 'candidate fixture must alter the canonical candidate');
  return overlaid;
}

function assertLiveFixture(value, expected) {
  const fixture = exactKeys(object(value, `/fixtures/${expected.id}`), ['kind', 'id', 'expect', 'changes'], `/fixtures/${expected.id}`);
  if (fixture.kind !== 'unity-android-live-fixture') fail('INVALID_FIXTURE_KIND', `/fixtures/${expected.id}/kind`, 'live fixture kind is unsupported');
  if (string(fixture.id, `/fixtures/${expected.id}/id`) !== expected.id || !equal(diagnostic(fixture.expect, `/fixtures/${expected.id}/expect`), expected.expect)) {
    fail('ANDROID_FIXTURE_DECLARATION_INVALID', `/fixtures/${expected.id}`, 'live fixture declaration must match its inventory registration');
  }
  const changes = array(fixture.changes, `/fixtures/${expected.id}/changes`);
  if (changes.length === 0) fail('LIVE_FIXTURE_CHANGES_EMPTY', `/fixtures/${expected.id}/changes`, 'live fixture must declare a project mutation');
  const paths = new Set();
  changes.forEach((value, index) => {
    const at = `/fixtures/${expected.id}/changes/${index}`;
    const change = exactKeys(object(value, at), ['path', 'content'], at);
    const path = projectRelativePath(change.path, `${at}/path`);
    if (paths.has(path)) fail('DUPLICATE_LIVE_CHANGE_PATH', `${at}/path`, `duplicate live fixture change ${path}`);
    paths.add(path);
    string(change.content, `${at}/content`);
  });
  return changes;
}

function assertDistinctOverlayPayloads(overlays, pointer) {
  const seen = new Map();
  for (const overlay of overlays) {
    const hash = payloadHash(overlay.payload);
    if (seen.has(hash)) fail('DUPLICATE_FIXTURE_OVERLAY_PAYLOAD', overlay.pointer, `duplicates ${seen.get(hash)}`);
    seen.set(hash, overlay.id);
  }
  return seen.size;
}

async function assertPackageScripts() {
  const manifest = object(await readJson(repositoryJsonPath('package.json', '/package.json', 'PACKAGE_PATH_INVALID'), '/package.json'), '/package.json');
  const scripts = object(manifest.scripts, '/package.json/scripts');
  const expected = {
    'test:repo': 'node tools/qa/android/run-repository-red.mjs',
    'test:android-contract': 'node tools/qa/android/test-contract.mjs',
    'test:unity:editmode': 'node tools/qa/android/test-contract.mjs --mode=editmode',
    'test:unity:playmode': 'node tools/qa/android/test-contract.mjs --mode=playmode',
    'verify:android': 'node tools/qa/android/test-contract.mjs --verify-android',
    'verify:repo': 'node tools/qa/android/run-verify-repository-red.mjs',
  };
  for (const [name, command] of Object.entries(expected)) if (scripts[name] !== command) fail('ANDROID_PACKAGE_SCRIPTS_INVALID', `/package.json/scripts/${name.replaceAll('/', '~1')}`, `script ${name} must be the RED contract entrypoint`);
}

async function assertExistingRepositoryInventories() {
  const candidateManifest = object(await readJson(repositoryJsonPath('tools/qa/repository/negative-fixtures.json', '/repositoryCandidateManifest', 'MANIFEST_PATH_INVALID'), '/repositoryCandidateManifest'), '/repositoryCandidateManifest');
  const candidateFixtures = array(candidateManifest.fixtures, '/repositoryCandidateManifest/fixtures');
  const secretBindings = object(candidateManifest.secretRuleFixtures, '/repositoryCandidateManifest/secretRuleFixtures');
  if (candidateFixtures.length !== 24 || Object.keys(secretBindings).length !== 14) fail('REPOSITORY_FIXTURE_INVENTORY_DRIFT', '/repositoryCandidateManifest', 'candidate fixture and secret-rule inventories must remain 24 and 14');
  const candidateIds = candidateFixtures.map((fixture, index) => string(object(fixture, `/repositoryCandidateManifest/fixtures/${index}`).id, `/repositoryCandidateManifest/fixtures/${index}/id`));
  if (new Set(candidateIds).size !== candidateIds.length || new Set(Object.values(secretBindings)).size !== Object.keys(secretBindings).length) fail('REPOSITORY_FIXTURE_INVENTORY_DRIFT', '/repositoryCandidateManifest', 'candidate fixture and secret-rule registrations must remain unique');
  const liveManifest = object(await readJson(repositoryJsonPath('tools/qa/repository/live-regressions.json', '/repositoryLiveManifest', 'MANIFEST_PATH_INVALID'), '/repositoryLiveManifest'), '/repositoryLiveManifest');
  const liveFixtures = array(liveManifest.fixtures, '/repositoryLiveManifest/fixtures');
  if (liveFixtures.length !== 36) fail('REPOSITORY_FIXTURE_INVENTORY_DRIFT', '/repositoryLiveManifest/fixtures', 'live fixture inventory must remain 36');
  const liveIds = liveFixtures.map((fixture, index) => string(object(fixture, `/repositoryLiveManifest/fixtures/${index}`).id, `/repositoryLiveManifest/fixtures/${index}/id`));
  const livePaths = liveFixtures.map((fixture, index) => string(object(fixture, `/repositoryLiveManifest/fixtures/${index}`).path, `/repositoryLiveManifest/fixtures/${index}/path`));
  if (new Set(liveIds).size !== liveIds.length || new Set(livePaths).size !== livePaths.length) fail('REPOSITORY_FIXTURE_INVENTORY_DRIFT', '/repositoryLiveManifest/fixtures', 'live fixture registrations must remain unique');
  return { candidateFixtures: candidateFixtures.length, secretRuleBindings: Object.keys(secretBindings).length, liveFixtures: liveFixtures.length };
}

function assertFailureProtocol(result, pointer) {
  if (result.exitCode === 0 || /(?:^|\n)PASS(?:\n|$)/.test(result.stdout)) fail('ANDROID_VALIDATOR_PROTOCOL_ERROR', pointer, 'a failing Android validator must not report PASS');
}

export function shouldRunPackageCommandProbes(options) {
  return options.mode === null && !options.verifyAndroid;
}

export function assertPackageCommandResult(command, result, durationMs) {
  const diagnostic = {
    command, durationMs, status: result.status ?? null, signal: result.signal ?? null,
    error: result.error?.message ?? result.error ?? null,
    stdoutTail: (result.stdout ?? '').slice(-4096), stderrTail: (result.stderr ?? '').slice(-4096),
  };
  if (diagnostic.error !== null) fail('ANDROID_PACKAGE_COMMAND_FAILURE', `/${command}`, JSON.stringify(diagnostic));
  if (diagnostic.status !== 0 || diagnostic.stderrTail !== '' || !(result.stdout ?? '').endsWith('PASS\n')) {
    fail('ANDROID_PACKAGE_COMMAND_PROTOCOL_ERROR', `/${command}`, JSON.stringify(diagnostic));
  }
  return diagnostic;
}

function assertActualPackageCommand(options) {
  if (!shouldRunPackageCommandProbes(options)) return { label: 'actual-package-command', status: 'N/A', reason: 'Execution modes skip nested package-command probes; structural test:android-contract owns them.' };
  if (process.env.ANDROID_REPOSITORY_AGGREGATE === '1') return { label: 'actual-package-command', status: 'N/A', reason: 'Aggregate child skips recursive package-command probing.' };
  for (const command of ['test:repo', 'verify:repo']) {
    const startedAt = Date.now();
    const result = spawnSync('bun', ['run', '--silent', command], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, ANDROID_PACKAGE_COMMAND_PROBE: '1' },
      timeout: 300000,
      maxBuffer: 1024 * 1024,
    });
    assertPackageCommandResult(command, result, Date.now() - startedAt);
  }
  return { label: 'actual-package-command', status: 'PASS' };
}

function expectFailure(label, action, code, pointer) {
  try {
    action();
  } catch (error) {
    if (error instanceof ContractError && error.code === code && error.pointer === pointer) return { label, status: 'PASS', code, pointer };
    throw error;
  }
  fail('ANDROID_SELF_TEST_FAILURE', pointer, `${label} unexpectedly passed`);
}

export function runUltraQaProbes(options) {
  const duplicate = structuredClone(expectedCandidateFixtures);
  duplicate[1].id = duplicate[0].id;
  const duplicatePath = structuredClone(expectedCandidateFixtures);
  duplicatePath[1].path = duplicatePath[0].path;
  const stale = structuredClone(expectedCandidateFixtures).reverse();
  const orphan = [...expectedCandidateFixtures.map(({ path }) => path), 'tools/qa/android/fixtures/candidate/orphan.json'];
  const missing = expectedLiveFixtures.slice(1).map(({ path }) => path);
  return [
    expectFailure('malformed-argument', () => parseArguments(['--unknown']), 'UNSUPPORTED_ARGUMENT', ''),
    expectFailure('duplicate-argument', () => parseArguments(['--mode=editmode', '--mode=playmode']), 'DUPLICATE_ARGUMENT', ''),
    expectFailure('missing-argument-value', () => parseArguments(['--variant']), 'MISSING_ARGUMENT_VALUE', ''),
    expectFailure('missing-fixture', () => assertFixtureInventory(expectedCandidateFixtures.slice(1), expectedCandidateFixtures, '/candidateFixtures'), 'ANDROID_FIXTURE_INVENTORY_INVALID', '/candidateFixtures'),
    expectFailure('duplicate-fixture', () => assertFixtureInventory(duplicate, expectedCandidateFixtures, '/candidateFixtures'), 'DUPLICATE_FIXTURE_ID', '/candidateFixtures/1/id'),
    expectFailure('duplicate-fixture-path', () => assertFixtureInventory(duplicatePath, expectedCandidateFixtures, '/candidateFixtures'), 'DUPLICATE_FIXTURE_PATH', '/candidateFixtures/1/path'),
    expectFailure('stale-inventory-order', () => assertFixtureInventory(stale, expectedCandidateFixtures, '/candidateFixtures'), 'ANDROID_FIXTURE_INVENTORY_INVALID', '/candidateFixtures/0'),
    expectFailure('orphan-fixture-directory', () => assertFixtureDirectoryCoverage(orphan, expectedCandidateFixtures.map(({ path }) => path), '/candidateDirectory'), 'ORPHAN_FIXTURE_FILE', '/candidateDirectory/orphan.json'),
    expectFailure('missing-fixture-directory', () => assertFixtureDirectoryCoverage(missing, expectedLiveFixtures.map(({ path }) => path), '/liveDirectory'), 'MISSING_FIXTURE_FILE', '/liveDirectory'),
    expectFailure('duplicate-overlay-payload', () => assertDistinctOverlayPayloads([{ id: 'first', pointer: '/fixtures/first', payload: { patches: [] } }, { id: 'second', pointer: '/fixtures/second', payload: { patches: [] } }], '/fixtures'), 'DUPLICATE_FIXTURE_OVERLAY_PAYLOAD', '/fixtures/second'),
    expectFailure('traversal-path', () => repositoryJsonPath('../outside.json', '/fixture', 'FIXTURE_PATH_INVALID'), 'FIXTURE_PATH_INVALID', '/fixture'),
    expectFailure('misleading-pass-output', () => assertFailureProtocol({ exitCode: 1, stdout: 'PASS\n' }, '/validator'), 'ANDROID_VALIDATOR_PROTOCOL_ERROR', '/validator'),
    assertActualPackageCommand(options),
    { label: 'symlink-path', status: 'N/A', reason: 'Creating a symlink probe would mutate the worktree and is prohibited; production reads use assertSafePath.' },
    { label: 'dirty-worktree', status: 'N/A', reason: 'Git inspection is prohibited for this RED worker.' },
  ];
}

async function evidenceDirectory(value) {
  if (value === null) return null;
  const candidate = resolve(root, value);
  const local = relative(evidenceRoot, candidate);
  if (!local || local.startsWith('..') || resolve(evidenceRoot, local) !== candidate) fail('EVIDENCE_PATH_INVALID', '/evidenceDir', 'evidence directory must descend from .omo/evidence');
  let current = root;
  for (const part of relative(root, candidate).split('/').filter(Boolean)) {
    current = resolve(current, part);
    const stat = await lstat(current).catch((error) => error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT' ? null : Promise.reject(error));
    if (stat?.isSymbolicLink()) fail('EVIDENCE_PATH_INVALID', '/evidenceDir', 'evidence directory must not include symlinks');
  }
  await mkdir(candidate, { recursive: true });
  return candidate;
}

async function readUnityArtifactFiles() {
  const project = resolve(root, projectRoot);
  await assertSafePath(root, project, '/client/WarriorRaising');
  const files = {};
  async function collect(directory) {
    const absolute = resolve(project, directory);
    const stat = await assertSafePath(root, absolute, `/client/WarriorRaising/${directory}`);
    if (!stat?.isDirectory()) fail('T6_UNITY_ARTIFACTS_MISSING', `/client/WarriorRaising/${directory}`, 'L3 Unity artifact baseline is incomplete');
    const entries = await readdir(absolute, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const path = `${directory}/${entry.name}`;
      if (shouldIgnoreRepositoryPath(`client/WarriorRaising/${path}`)) continue;
      const target = resolve(project, path);
      if (entry.isSymbolicLink()) fail('SYMLINK_FORBIDDEN', `/client/WarriorRaising/${path}`, 'Unity artifact inventory must not include symlinks');
      if (entry.isDirectory()) await collect(path);
      else if (entry.isFile()) files[path] = await readFile(target, 'utf8');
    }
  }
  for (const directory of ['Assets', 'Packages', 'ProjectSettings', 'android']) await collect(directory);
  return files;
}

function mergeProjectSettings(source, change) {
  let merged = source;
  for (const line of change.split(/\r?\n/)) {
    const match = /^[ \t]*([^:\r\n]+):[ \t]*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const expression = new RegExp(`^([ \t]*)${key}:[^\\r\\n]*$`, 'm');
    merged = expression.test(merged) ? merged.replace(expression, (_, indent) => `${indent}${line}`) : `${merged.replace(/\n?$/, '\n')}${line}\n`;
  }
  return merged;
}

export function applyLiveOverlay(files, changes) {
  const overlaid = { ...files };
  for (const change of changes) {
    overlaid[change.path] = change.path === 'ProjectSettings/ProjectSettings.asset'
      ? mergeProjectSettings(overlaid[change.path] ?? '', change.content)
      : change.content;
  }
  return overlaid;
}

function executeExpectedFailure(id, expected, validator) {
  try {
    validator();
  } catch (error) {
    if (error instanceof ContractError && error.code === expected.code && error.pointer === expected.pointer) {
      return { id, expected, observed: { code: error.code, pointer: error.pointer }, status: 'EXECUTED_EXPECTED_FAILURE' };
    }
    throw error;
  }
  fail('ANDROID_SEEDED_FIXTURE_PASSED', `/fixtures/${id}`, `fixture ${id} unexpectedly passed its validator`);
}

function runProjectSettingsParserProbes() {
  return projectSettingsParserProbes.map((probe) => {
    const actual = parseUnityArtifactFiles({ 'ProjectSettings/ProjectSettings.asset': probe.source }).android;
    if (!equal(actual, probe.expected)) {
      fail('UNITY_PROJECT_SETTINGS_PARSE_INVALID', '/ProjectSettings/ProjectSettings.asset', `${probe.label} expected ${JSON.stringify(probe.expected)} but received ${JSON.stringify(actual)}`);
    }
    return { label: probe.label, status: 'PASS' };
  });
}

function validateCanonicalContract(policy, candidate, artifactFiles) {
  validateUnityPolicyDeclaration(policy);
  validateUnityCandidate(candidate);
  const unity = parseUnityArtifactFiles(artifactFiles);
  validateUnityProject(unity);
  return unity;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const receiptDirectory = await evidenceDirectory(options.evidenceDir);
  await assertPackageScripts();
  const suite = exactKeys(object(await readJson(repositoryJsonPath(options.manifest, '/manifest', 'MANIFEST_PATH_INVALID'), '/manifest'), '/manifest'), ['kind', 'canonical', 'fixtureInventorySha256', 'candidateFixtures', 'liveFixtures'], '/manifest');
  if (suite.kind !== 'unity-android-red-contract-suite') fail('INVALID_SUITE_KIND', '/manifest/kind', 'Android suite kind is unsupported');
  if (string(suite.fixtureInventorySha256, '/manifest/fixtureInventorySha256') !== fixtureInventoryHash()) fail('ANDROID_FIXTURE_INVENTORY_HASH_INVALID', '/manifest/fixtureInventorySha256', 'Android fixture inventory hash must be canonical');
  const candidates = assertFixtureInventory(suite.candidateFixtures, expectedCandidateFixtures, '/manifest/candidateFixtures');
  const live = assertFixtureInventory(suite.liveFixtures, expectedLiveFixtures, '/manifest/liveFixtures');
  const canonicalPath = repositoryJsonPath(suite.canonical, '/manifest/canonical', 'CANONICAL_PATH_INVALID');
  const directoryInventories = await assertFixtureDirectoryInventories(canonicalPath.path, candidates, live);
  const canonical = assertCanonicalCandidate(await readJson(canonicalPath, '/canonical'));
  const policy = await readJson(repositoryJsonPath('client/WarriorRaising/asmdef-policy.json', '/asmdefPolicy', 'ASMDEF_POLICY_PATH_INVALID'), '/asmdefPolicy');
  const artifactFiles = await readUnityArtifactFiles();
  const parserProbes = runProjectSettingsParserProbes();
  const unity = validateCanonicalContract(policy, canonical, artifactFiles);
  const candidateOverlays = [];
  for (let index = 0; index < candidates.length; index += 1) candidateOverlays.push({ id: candidates[index].id, pointer: `/fixtures/${candidates[index].id}`, expect: expectedCandidateFixtures[index].expect, payload: assertCandidateFixture(await readJson(candidates[index], `/fixtures/${candidates[index].id}`), expectedCandidateFixtures[index], canonical) });
  const liveOverlays = [];
  for (let index = 0; index < live.length; index += 1) liveOverlays.push({ id: live[index].id, pointer: `/fixtures/${live[index].id}`, expect: expectedLiveFixtures[index].expect, payload: assertLiveFixture(await readJson(live[index], `/fixtures/${live[index].id}`), expectedLiveFixtures[index]) });
  const overlayPayloads = { candidateDistinct: assertDistinctOverlayPayloads(candidateOverlays, '/candidateFixtures'), liveDistinct: assertDistinctOverlayPayloads(liveOverlays, '/liveFixtures') };
  const candidateResults = candidateOverlays.map(({ id, expect, payload }) => executeExpectedFailure(id, expect, () => validateUnityCandidate(payload)));
  const liveResults = liveOverlays.map(({ id, expect, payload }) => executeExpectedFailure(id, expect, () => validateUnityProject(parseUnityArtifactFiles(applyLiveOverlay(artifactFiles, payload)))));
  const repositoryInventories = await assertExistingRepositoryInventories();
  const probes = runUltraQaProbes(options);
  const receipt = {
    task: '6', lane: 'l1', phase: 'GREEN', command: { mode: options.mode, variant: options.variant, verifyAndroid: options.verifyAndroid },
    canonical: { status: 'PASS', unityVersion: unity.projectVersion, contractEditorVersion: T6_UNITY_CONTRACT.editorVersion }, targetGraph: { nodeCount: targetAsmdefs.length, runtimeNodes: runtimeAssemblies, testNodes: ['Tests.EditMode', 'Tests.PlayMode'] },
    fixtureInventory: { algorithm: 'SHA-256', canonicalization: 'recursive-key-sorted JSON with source array order preserved', sha256: fixtureInventoryHash(), candidateCount: candidates.length, liveCount: live.length, candidateIds: candidates.map(({ id }) => id), liveIds: live.map(({ id }) => id), directories: directoryInventories, overlayPayloads },
    seededOutcomes: { candidate: candidateResults, live: liveResults },
    projectSettingsParserProbes: parserProbes,
    preservedRepositoryInventories: repositoryInventories, ultraQa: probes,
    cleanup: { processes: [], ports: [], temporaryArtifacts: [], deletions: [] },
  };
  if (receiptDirectory) {
    await writeFile(resolve(receiptDirectory, 'green-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    await writeFile(resolve(receiptDirectory, 'cleanup-receipt.json'), `${JSON.stringify({ task: '6', lane: 'l1', phase: 'GREEN', cleanup: receipt.cleanup }, null, 2)}\n`, 'utf8');
  }
  const unityResult = options.mode === null ? null : await runUnityTests(root, receiptDirectory ?? resolve(root, '.omo/evidence/implementation/local-20260728/mvp-t6/a1/task-6/lanes/l6'), options.mode);
  if (options.verifyAndroid) await runAndroidQualification(root, options.variant);
  if (options.mode === 'playmode') process.stdout.write(`PLAYMODE_EVIDENCE=${unityResult.evidence}\n`);
  process.stdout.write('PASS\n');
}

if (process.env.ANDROID_CONTRACT_UNIT_TEST !== '1') main().catch((error) => {
  const issue = error instanceof ContractError
    ? { code: error.code, pointer: error.pointer, message: error.message }
    : { code: 'ANDROID_CONTRACT_RUNNER_FAILURE', pointer: '', message: error instanceof Error ? error.message : String(error) };
  process.stderr.write(`${JSON.stringify(issue)}\n`);
  process.exitCode = 1;
});
