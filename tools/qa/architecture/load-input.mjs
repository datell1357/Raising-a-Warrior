import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { array, exactKeys, fail, object, pointer, string, valueIn } from './contract-utils.mjs';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    fail('INVALID_JSON', '', error instanceof Error ? error.message : 'unable to read JSON');
  }
}

function decodePointer(at) {
  if (at === '') return [];
  if (!at.startsWith('/')) fail('INVALID_PATCH_POINTER', '/patches', 'patch pointer must begin with /');
  return at.slice(1).split('/').map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
}

function patchTarget(root, patch, at) {
  const parts = decodePointer(string(patch.pointer, pointer([at.slice(1), 'pointer'])));
  if (parts.length === 0) fail('INVALID_PATCH_POINTER', pointer([at.slice(1), 'pointer']), 'root replacement is not supported');
  let target = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const segment = parts[index];
    if (!target || typeof target !== 'object' || !(segment in target)) fail('INVALID_PATCH_POINTER', pointer([at.slice(1), 'pointer']), 'patch parent does not exist');
    target = target[segment];
  }
  return { parent: target, key: parts.at(-1) };
}

function applyPatch(root, patch, at) {
  exactKeys(patch, ['target', 'op', 'pointer', 'value'], at);
  valueIn(patch.target, ['matrix', 'prerequisites', 'adrs', 'sourceClaims'], pointer([at.slice(1), 'target']), 'INVALID_PATCH_TARGET');
  valueIn(patch.op, ['replace', 'remove', 'add'], pointer([at.slice(1), 'op']), 'INVALID_PATCH_OPERATION');
  const selected = root[patch.target];
  const { parent, key } = patchTarget(selected, patch, at);
  if (Array.isArray(parent)) {
    if (patch.op === 'add' && key === '-') {
      parent.push(patch.value);
      return;
    }
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= parent.length) fail('INVALID_PATCH_POINTER', pointer([at.slice(1), 'pointer']), 'array patch index does not exist');
    if (patch.op === 'remove') parent.splice(index, 1);
    else parent[index] = patch.value;
    return;
  }
  object(parent, pointer([at.slice(1), 'pointer']));
  if (patch.op === 'remove') {
    if (!(key in parent)) fail('INVALID_PATCH_POINTER', pointer([at.slice(1), 'pointer']), 'object patch key does not exist');
    delete parent[key];
    return;
  }
  parent[key] = patch.value;
}

export async function loadInput(root, candidate) {
  const matrixPath = resolve(root, 'docs/architecture/mutation-matrix.json');
  const prerequisitesPath = resolve(root, 'docs/operations/external-prerequisites.json');
  const matrix = await readJson(matrixPath);
  const adrs = Object.fromEntries(await Promise.all(matrix.adrRegistry.map(async ({ id, path }) => [id, await readFile(resolve(root, path), 'utf8')])));
  const input = { matrix, prerequisites: await readJson(prerequisitesPath), adrs, sourceClaims: await readJson(resolve(root, 'tools/qa/architecture/official-source-claims.json')) };
  if (!candidate) return input;
  const fixture = await readJson(resolve(root, candidate));
  exactKeys(fixture, ['kind', 'matrix', 'prerequisites', 'patches'], '');
  if (fixture.kind !== 'architecture-validation-fixture') fail('INVALID_FIXTURE_KIND', '/kind', 'unsupported fixture kind');
  if (fixture.matrix !== 'docs/architecture/mutation-matrix.json' || fixture.prerequisites !== 'docs/operations/external-prerequisites.json') fail('INVALID_FIXTURE_SOURCE', '', 'fixture must derive from canonical architecture inputs');
  const patches = array(fixture.patches, '/patches');
  for (let index = 0; index < patches.length; index += 1) applyPatch(input, object(patches[index], pointer(['patches', index])), pointer(['patches', index]));
  return input;
}

export async function loadCanonicalReferences(root) {
  const scope = await readJson(resolve(root, 'docs/production/scope-contract.json'));
  const flowText = await readFile(resolve(root, 'docs/Manyfast/워리어 키우기_유저플로우.md'), 'utf8');
  const match = flowText.match(/```json\n([\s\S]*?)\n```/);
  if (!match) fail('CANONICAL_FLOW_UNREADABLE', '/docs/Manyfast/user-flow', 'canonical flow JSON block is missing');
  try {
    return { scope, flow: JSON.parse(match[1]) };
  } catch (error) {
    fail('CANONICAL_FLOW_UNREADABLE', '/docs/Manyfast/user-flow', error instanceof Error ? error.message : 'canonical flow parse failed');
  }
}
