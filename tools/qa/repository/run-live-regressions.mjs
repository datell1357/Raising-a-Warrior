#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { ContractError, array, exactKeys, fail, object, string } from './contract-utils.mjs';
import { buildRepositoryModel, isForbiddenBinarySecretPath, isTextInventoryPath } from './repository-model.mjs';
import { validateCandidate } from './candidate-validator.mjs';
import { validateRepositoryPolicy } from './repository-policy.mjs';
import { assertSafePath, repositoryPath } from './path-safety.mjs';

const root = resolve(process.cwd());
const defaultManifest = 'tools/qa/repository/live-regressions.json';
const firebaseManifest = 'tools/qa/repository/firebase-live-regressions.json';
const liveFixtureDirectory = 'tools/qa/repository/fixtures/live';
const canonicalFixtureCount = 36;
const requiredTextInventoryPaths = ['backend/main.tf', 'backend/deploy.sh', 'backend/deploy.bash', 'backend/deploy.zsh', 'backend/runtime.toml', 'client/WarriorRaising/build.gradle', 'backend/application.properties', 'backend/Dockerfile', 'backend/Dockerfile.release'];
const requiredTextClassifierPaths = ['release/signing/fixture.pem', 'release/signing/fixture.key'];
const requiredBinaryClassifierPaths = ['release/signing/fixture.p12', 'release/signing/fixture.jks', 'release/signing/fixture.keystore'];

function parseArguments(args) {
  if (args.length === 0) return { manifest: defaultManifest };
  const seen = new Set();
  let manifest = defaultManifest;
  for (const arg of args) {
    if (!arg.startsWith('--manifest=')) fail('UNSUPPORTED_ARGUMENT', '', `unsupported argument ${arg}`);
    if (seen.has('manifest')) fail('DUPLICATE_ARGUMENT', '', 'duplicate argument --manifest');
    seen.add('manifest');
    manifest = arg.slice('--manifest='.length);
  }
  return { manifest };
}

function safeRepositoryJsonPath(value, pointer, code) {
  const path = string(value, pointer);
  if (isAbsolute(path) || path.includes('\\') || path.split('/').some((part) => part === '.' || part === '..') || !path.endsWith('.json')) {
    fail(code, pointer, 'path must be a repository-relative JSON file without traversal');
  }
  return { path, absolute: repositoryPath(root, path, pointer) };
}

async function readJson(absolute, pointer) {
  await assertSafePath(root, absolute, pointer, true);
  let source;
  try {
    source = await readFile(absolute, 'utf8');
  } catch (error) {
    fail('INPUT_UNREADABLE', pointer, error instanceof Error ? error.message : 'input could not be read');
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    fail('INPUT_INVALID_JSON', pointer, error instanceof Error ? error.message : 'input JSON could not be parsed');
  }
}

function patchParts(value, pointer) {
  const encoded = string(value, pointer);
  if (!encoded.startsWith('/')) fail('INVALID_PATCH_POINTER', pointer, 'patch pointer must begin with /');
  return encoded.slice(1).split('/').map((item) => item.replaceAll('~1', '/').replaceAll('~0', '~'));
}

function apply(model, value, at) {
  const patch = exactKeys(object(value, at), ['op', 'pointer', 'value'], at);
  if (!['add', 'remove', 'replace'].includes(patch.op)) fail('INVALID_PATCH_OPERATION', `${at}/op`, 'only add, remove, and replace patches are supported');
  const parts = patchParts(patch.pointer, `${at}/pointer`);
  let parent = model;
  for (const part of parts.slice(0, -1)) {
    if (!parent || typeof parent !== 'object' || !(part in parent)) fail('INVALID_PATCH_POINTER', `${at}/pointer`, 'patch parent does not exist');
    parent = parent[part];
  }
  const key = parts.at(-1);
  if (Array.isArray(parent)) {
    if (patch.op === 'add' && key === '-') {
      parent.push(patch.value);
      return;
    }
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index > parent.length || (patch.op !== 'add' && index === parent.length)) fail('INVALID_PATCH_POINTER', `${at}/pointer`, 'array patch index does not exist');
    if (patch.op === 'remove') parent.splice(index, 1);
    else if (patch.op === 'add') parent.splice(index, 0, patch.value);
    else parent[index] = patch.value;
    return;
  }
  if (!parent || typeof parent !== 'object' || (patch.op !== 'add' && !(key in parent))) fail('INVALID_PATCH_POINTER', `${at}/pointer`, 'patch key does not exist');
  if (patch.op === 'remove') delete parent[key]; else parent[key] = patch.value;
}

function copyContainer(value, pointer) {
  if (Array.isArray(value)) return value.slice();
  if (value && Object.getPrototypeOf(value) === Object.prototype) return { ...value };
  fail('LIVE_MODEL_CONTAINER_UNSUPPORTED', pointer, 'live regression model must contain only plain objects and arrays along patch paths');
}

export function applyCopyOnWrite(baseline, patches, fixtureId = 'fixture') {
  const model = copyContainer(baseline, `/fixtures/${fixtureId}`);
  for (const [index, patch] of patches.entries()) {
    const at = `/fixtures/${fixtureId}/patches/${index}`;
    const parts = patchParts(patch.pointer, `${at}/pointer`);
    let source = model;
    let target = model;
    for (const part of parts.slice(0, -1)) {
      if (!source || typeof source !== 'object' || !(part in source)) fail('INVALID_PATCH_POINTER', `${at}/pointer`, 'patch parent does not exist');
      const copied = copyContainer(source[part], `${at}/pointer`);
      target[part] = copied;
      source = source[part];
      target = copied;
    }
    apply(model, patch, at);
  }
  return model;
}

function assertTextInventoryCoverage() {
  const missing = [...requiredTextInventoryPaths, ...requiredTextClassifierPaths].filter((path) => !isTextInventoryPath(path));
  if (missing.length > 0) fail('REPOSITORY_TEXT_INVENTORY_INCOMPLETE', '/model/textInventory', `text inventory excludes ${missing.join(', ')}`);
  const binary = requiredBinaryClassifierPaths.filter((path) => !isForbiddenBinarySecretPath(path));
  if (binary.length > 0) fail('REPOSITORY_BINARY_INVENTORY_INCOMPLETE', '/model/binaryInventory', `binary inventory includes ${binary.join(', ')}`);
  return { text: requiredTextClassifierPaths, binary: requiredBinaryClassifierPaths };
}

async function canonicalLiveFixturePaths() {
  const directory = repositoryPath(root, liveFixtureDirectory, '/manifest/fixtures');
  await assertSafePath(root, directory, '/manifest/fixtures');
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.name.endsWith('.json')) continue;
    const path = `${liveFixtureDirectory}/${entry.name}`;
    const absolute = repositoryPath(root, path, '/manifest/fixtures');
    await assertSafePath(root, absolute, '/manifest/fixtures', true);
    paths.push(path);
  }
  if (paths.length !== canonicalFixtureCount) fail('LIVE_FIXTURE_COVERAGE_INCOMPLETE', '/manifest/fixtures', `canonical live fixture directory must contain exactly ${canonicalFixtureCount} JSON fixtures`);
  return paths;
}

async function loadSuite(manifest) {
  const suite = object(await readJson(manifest.absolute, '/manifest'), '/manifest');
  exactKeys(suite, ['kind', 'fixtures'], '/manifest');
  if (suite.kind !== 'repository-live-policy-suite') fail('INVALID_SUITE_KIND', '/manifest/kind', 'unsupported suite kind');
  const fixtures = array(suite.fixtures, '/manifest/fixtures');
  if (fixtures.length === 0) fail('LIVE_SUITE_EMPTY', '/manifest/fixtures', 'live regression suite must not be empty');
  const ids = new Set();
  const paths = new Set();
  const parsed = [];
  for (const [index, entry] of fixtures.entries()) {
    const at = `/manifest/fixtures/${index}`;
    exactKeys(entry, ['id', 'path', 'expect'], at);
    const id = string(entry.id, `${at}/id`);
    if (ids.has(id)) fail('DUPLICATE_FIXTURE_ID', `${at}/id`, `duplicate fixture id ${id}`);
    ids.add(id);
    const fixturePath = safeRepositoryJsonPath(entry.path, `${at}/path`, 'FIXTURE_PATH_INVALID');
    if (paths.has(fixturePath.path)) fail('DUPLICATE_FIXTURE_PATH', `${at}/path`, `duplicate fixture path ${fixturePath.path}`);
    paths.add(fixturePath.path);
    const expect = entry.expect === null ? null : exactKeys(object(entry.expect, `${at}/expect`), ['code', 'pointer'], `${at}/expect`);
    parsed.push({
      id,
      path: fixturePath.path,
      absolute: fixturePath.absolute,
      expect: expect === null ? null : { code: string(expect.code, `${at}/expect/code`), pointer: string(expect.pointer, `${at}/expect/pointer`) },
    });
  }
  const requiredPaths = parsed.every(({ path }) => path.startsWith(`${liveFixtureDirectory}/`)) ? await canonicalLiveFixturePaths() : null;
  if (requiredPaths && (paths.size !== requiredPaths.length || requiredPaths.some((path) => !paths.has(path)))) {
    fail('LIVE_FIXTURE_COVERAGE_INCOMPLETE', '/manifest/fixtures', 'canonical live manifest must cover each live fixture exactly once');
  }
  return { fixtures: parsed, pathCoverage: requiredPaths ? { expected: requiredPaths, covered: [...paths].sort() } : null };
}

async function loadFixture(fixture) {
  const payload = object(await readJson(fixture.absolute, `/fixtures/${fixture.id}`), `/fixtures/${fixture.id}`);
  exactKeys(payload, ['patches'], `/fixtures/${fixture.id}`);
  const patches = array(payload.patches, `/fixtures/${fixture.id}/patches`);
  if (patches.length === 0) fail('LIVE_FIXTURE_PATCHES_EMPTY', `/fixtures/${fixture.id}/patches`, 'live fixture must contain at least one patch');
  return patches;
}

async function loadFirebaseSuite() {
  const manifest = safeRepositoryJsonPath(firebaseManifest, '/firebaseManifest', 'MANIFEST_PATH_INVALID');
  const suite = await loadSuite(manifest);
  if (suite.fixtures.length !== 7 || suite.fixtures.some(({ path }) => !path.startsWith('tools/qa/repository/fixtures/firebase-live/'))) {
    fail('FIREBASE_FIXTURE_COVERAGE_INCOMPLETE', '/firebaseManifest/fixtures', 'Firebase fixture coverage must be exact');
  }
  return suite.fixtures;
}

async function runFirebaseFixtures(baselineModel, fixtures) {
  const results = [];
  for (const fixture of fixtures) {
    const model = applyCopyOnWrite(baselineModel, await loadFixture(fixture), fixture.id);
    try {
      validateCandidate(Object.fromEntries(['files', 'assemblies', 'environments', 'typescript', 'lockfile', 'provenance'].map((key) => [key, model[key]])));
      await validateRepositoryPolicy(model);
      fail('LIVE_REGRESSION_PASSED', `/fixtures/${fixture.id}`, 'Firebase regression unexpectedly passed');
    } catch (error) {
      if (!(error instanceof ContractError) || error.code !== fixture.expect.code || error.pointer !== fixture.expect.pointer) throw error;
      results.push({ id: fixture.id, ...fixture.expect });
    }
  }
  return results;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const manifest = safeRepositoryJsonPath(options.manifest, '/manifest', 'MANIFEST_PATH_INVALID');
  const suite = await loadSuite(manifest);
  const firebaseFixtures = await loadFirebaseSuite();
  const inventoryCoverage = assertTextInventoryCoverage();
  const baselineModel = await buildRepositoryModel(root);
  const results = [];
  for (const fixture of suite.fixtures) {
    const patches = await loadFixture(fixture);
    const model = applyCopyOnWrite(baselineModel, patches, fixture.id);
    try {
      validateCandidate(Object.fromEntries(['files', 'assemblies', 'environments', 'typescript', 'lockfile', 'provenance'].map((key) => [key, model[key]])));
      await validateRepositoryPolicy(model);
      if (fixture.expect === null) { results.push({ id: fixture.id, status: 'PASS' }); continue; }
      fail('LIVE_REGRESSION_PASSED', `/fixtures/${fixture.id}`, 'live regression unexpectedly passed');
    } catch (error) {
      if (fixture.expect === null) throw error;
      if (!(error instanceof ContractError) || error.code !== fixture.expect.code || error.pointer !== fixture.expect.pointer) throw error;
      results.push({ id: fixture.id, ...fixture.expect });
    }
  }
  const firebaseResults = await runFirebaseFixtures(baselineModel, firebaseFixtures);
  process.stdout.write(`${JSON.stringify({ phase: 'GREEN', fixtureCount: suite.fixtures.length, discoveredFixtureIds: suite.fixtures.map(({ id }) => id), distinctFixturePathCount: new Set(suite.fixtures.map(({ path }) => path)).size, pathCoverage: suite.pathCoverage, inventoryCoverage, results, firebaseResults })}\nPASS\n`);
}
if (process.env.LIVE_REGRESSION_UNIT_TEST !== '1') main().catch((error) => { process.stderr.write(`${JSON.stringify({ code: error instanceof ContractError ? error.code : 'LIVE_REGRESSION_FAILURE', pointer: error instanceof ContractError ? error.pointer : '', message: error instanceof Error ? error.message : String(error) })}\n`); process.exitCode = 1; });
