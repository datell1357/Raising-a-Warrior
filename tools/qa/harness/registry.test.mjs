import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from 'bun:test';
import { createCanonicalRegistry, REQUIRED_FAMILY_IDS, validateRegistry } from './registry.mjs';

function issue(action, code) {
  expect(action).toThrow();
  try {
    action();
  } catch (error) {
    expect(error.code).toBe(code);
  }
}

test('Given the canonical harness registry when validated then every executable family and canary is unique', () => {
  const registry = createCanonicalRegistry();
  expect(validateRegistry(registry)).toEqual(registry);
  expect(registry.filter(({ required }) => required).map(({ id }) => id)).toEqual(REQUIRED_FAMILY_IDS);
});

test('Given the Android device family when registered then it uses the supported verifier command', () => {
  const androidDevice = createCanonicalRegistry().find(({ id }) => id === 'android-device');

  expect(androidDevice.command).toBe('bun run verify:android -- --variant=dev');
});

test('Given registry drift when validated then omissions duplicates and unknown families fail deterministically', () => {
  const omitted = createCanonicalRegistry().filter(({ id }) => id !== 'scope');
  issue(() => validateRegistry(omitted), 'REGISTRY_FAMILY_OMITTED');
  const duplicate = createCanonicalRegistry();
  duplicate.push(structuredClone(duplicate[0]));
  issue(() => validateRegistry(duplicate), 'REGISTRY_FAMILY_DUPLICATE');
  const unknown = createCanonicalRegistry();
  unknown.push({ id: 'unknown', command: null, canaryIds: ['unknown-blocked'], required: false, blockedPrerequisite: 'unknown' });
  issue(() => validateRegistry(unknown), 'REGISTRY_FAMILY_UNKNOWN');
});

test('Given canary or blocked declaration drift when validated then it fails deterministically', () => {
  const missing = createCanonicalRegistry();
  missing[0].canaryIds = [];
  issue(() => validateRegistry(missing), 'REGISTRY_CANARY_MISSING');
  const duplicate = createCanonicalRegistry();
  duplicate[1].canaryIds = [...duplicate[0].canaryIds];
  issue(() => validateRegistry(duplicate), 'REGISTRY_CANARY_DUPLICATE');
  const blocked = createCanonicalRegistry();
  delete blocked.find(({ required }) => !required).blockedPrerequisite;
  issue(() => validateRegistry(blocked), 'REGISTRY_BLOCKED_PREREQUISITE_MISSING');
});

test('Given evidence schemas when loaded then their required field inventories remain strict', async () => {
  const root = resolve(process.cwd(), 'release/evidence');
  const [report, index, blocked] = await Promise.all(
    ['report.schema.json', 'index.schema.json', 'blocked.schema.json'].map(async (name) => JSON.parse(await readFile(resolve(root, name), 'utf8'))),
  );
  expect(report.additionalProperties).toBeFalse();
  expect(report.required).toContain('dirtyStateSha256');
  expect(report.required).toContain('canaryIds');
  expect(index.additionalProperties).toBeFalse();
  expect(index.required).toContain('canaryMatrix');
  expect(blocked.required).toEqual(['status', 'code', 'prerequisite', 'owner', 'evidenceNeeded']);
});
