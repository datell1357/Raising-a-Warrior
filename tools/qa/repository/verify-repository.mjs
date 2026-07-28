#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ContractError, array, exactKeys, fail, object, string } from './contract-utils.mjs';
import { validateCandidate } from './candidate-validator.mjs';
import { buildRepositoryModel } from './repository-model.mjs';
import { validateRepositoryPolicy } from './repository-policy.mjs';
import { assertSafePath, repositoryPath } from './path-safety.mjs';

const root = resolve(process.cwd());

function parseArguments(args) {
  if (args.length === 0) return { fixture: null };
  if (args.length === 1 && args[0].startsWith('--fixture=')) return { fixture: args[0].slice('--fixture='.length) };
  fail('UNSUPPORTED_ARGUMENT', '', `unsupported arguments ${args.join(' ')}`);
}

async function loadFixture(path) {
  const absolute = repositoryPath(root, path, '/fixture');
  try { await assertSafePath(root, absolute, '/fixture', true); }
  catch (error) { if (error instanceof ContractError) fail(error.code === 'INPUT_UNSAFE' ? 'FIXTURE_UNSAFE' : error.code, error.pointer, error.message); throw error; }
  let source;
  try {
    source = await readFile(absolute, 'utf8');
  } catch (error) {
    fail('INPUT_UNREADABLE', '/fixture', error instanceof Error ? error.message : 'fixture could not be read');
  }
  try {
    const fixture = object(JSON.parse(source), '/fixture');
    exactKeys(fixture, ['kind', 'patches'], '/fixture');
    if (fixture.kind !== 'repository-validation-fixture') fail('INVALID_FIXTURE_KIND', '/fixture/kind', 'unsupported fixture kind');
    return array(fixture.patches, '/fixture/patches');
  } catch (error) {
    if (error instanceof ContractError) throw error;
    fail('INPUT_INVALID_JSON', '/fixture', error instanceof Error ? error.message : 'fixture JSON could not be parsed');
  }
}

function patchParts(pointer, at) {
  const encoded = string(pointer, at);
  if (!encoded.startsWith('/')) fail('INVALID_PATCH_POINTER', at, 'patch pointer must begin with /');
  return encoded.slice(1).split('/').map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
}

function applyPatch(candidate, value, at) {
  const patch = exactKeys(object(value, at), ['op', 'pointer', 'value'], at);
  if (!['add', 'remove', 'replace'].includes(patch.op)) fail('INVALID_PATCH_OPERATION', `${at}/op`, 'only add, remove, and replace patches are supported');
  const parts = patchParts(patch.pointer, `${at}/pointer`);
  let parent = candidate;
  for (const key of parts.slice(0, -1)) {
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
  } else if (parent && typeof parent === 'object' && (patch.op === 'add' || key in parent)) {
    if (patch.op === 'remove') delete parent[key];
    else parent[key] = patch.value;
  } else fail('INVALID_PATCH_POINTER', `${at}/pointer`, 'patch key does not exist');
}

function writeIssue(error) {
  const issue = error instanceof ContractError
    ? { code: error.code, pointer: error.pointer, message: error.message }
    : { code: 'REPOSITORY_VERIFICATION_FAILURE', pointer: '', message: error instanceof Error ? error.message : String(error) };
  process.stderr.write(`${JSON.stringify(issue)}\n`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const model = await buildRepositoryModel(root);
  let overlaid = model;
  if (options.fixture) {
    const patches = await loadFixture(options.fixture);
    overlaid = structuredClone(model);
    patches.forEach((patch, index) => applyPatch(overlaid, patch, `/fixture/patches/${index}`));
  }
  const candidate = Object.fromEntries(['files', 'assemblies', 'environments', 'typescript', 'lockfile', 'provenance'].map((key) => [key, overlaid[key]]));
  validateCandidate(candidate);
  await validateRepositoryPolicy(overlaid);
  process.stdout.write('PASS\n');
}

main().catch((error) => {
  writeIssue(error);
  process.exitCode = 1;
});
