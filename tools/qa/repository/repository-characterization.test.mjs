import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from 'bun:test';
import { buildRepositoryModel } from './repository-model.mjs';
import * as repositoryPolicy from './repository-policy.mjs';

const candidateClassificationSha256 = '119840475aa17d9c181d140474fe82e25aed6bb76790b0d05ae5b2b51c869a97';
const liveClassificationSha256 = '93528864476d455a168a3b3f1ffe96e02bc09c085ed95885d7d4a4028de84a08';
const characterizationTimeoutMs = 180_000;
const publicExports = ['T6_UNITY_CONTRACT', 'runT6PolicyMutationProbes', 'validateRepositoryPolicy', 'validateUnityCandidate', 'validateUnityPolicyDeclaration', 'validateUnityProject'];

function pureLoc(source) {
  return source.split(/\r?\n/).filter((line) => line.trim() !== '' && !line.trim().startsWith('//')).length;
}

function receipt(script) {
  const output = execFileSync(process.execPath, [script], { encoding: 'utf8', timeout: 180_000 });
  return JSON.parse(output.slice(0, output.lastIndexOf('\nPASS\n')));
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

test('Given the T5/T6 candidate suite when it is characterized then all 24 diagnostics retain their classification', () => {
  const result = receipt('tools/qa/repository/run-validation-suite.mjs');
  const classification = {
    canonical: result.canonical,
    negativeFixtures: result.negativeFixtures.map(({ id, expected, observedIssue, matchesExpectedDiagnostic }) => ({ id, expected, observedIssue, matchesExpectedDiagnostic })),
  };

  expect(result.fixtureCount).toBe(24);
  expect(hash(classification)).toBe(candidateClassificationSha256);
});

test('Given the T5/T6 live suite when it is characterized then all 36 diagnostics retain their classification', { timeout: 180_000 }, () => {
  const result = receipt('tools/qa/repository/run-live-regressions.mjs');

  expect(result.fixtureCount).toBe(36);
  expect(hash({ results: result.results })).toBe(liveClassificationSha256);
});

test('Given the repository policy modules when their structure is characterized then each stays within the policy LOC budget without changing its public diagnostics', async () => {
  const policyDirectory = resolve(process.cwd(), 'tools/qa/repository/policy');
  const policyModules = (await readdir(policyDirectory)).filter((path) => path.endsWith('.mjs')).sort();
  const paths = ['tools/qa/repository/repository-policy.mjs', ...policyModules.map((path) => `tools/qa/repository/policy/${path}`)];
  const sources = await Promise.all(paths.map(async (path) => [path, await readFile(resolve(process.cwd(), path), 'utf8')]));

  expect(pureLoc(sources[0][1])).toBeLessThanOrEqual(250);
  for (const [, source] of sources.slice(1)) expect(pureLoc(source)).toBeLessThanOrEqual(250);
  expect(Object.keys(repositoryPolicy).sort()).toEqual(publicExports);
  expect(repositoryPolicy.runT6PolicyMutationProbes(JSON.parse(await readFile(resolve(process.cwd(), 'client/WarriorRaising/asmdef-policy.json'), 'utf8')))).toEqual([
    { label: 'forged-declaration', code: 'ASMDEF_POLICY_INVALID', pointer: '/asmdefPolicy/rules/acyclic' },
    { label: 'asmdef-precompiled-reference', code: 'UNITY_ASMDEF_SHAPE_INVALID', pointer: '/Assets/Warrior/Runtime/Core/Core.asmdef/precompiledReferences' },
    { label: 'hidden-asmdef', code: 'UNITY_ASMDEF_EXTRA', pointer: '/asmdefs/Hidden' },
    { label: 'package-lock-source', code: 'UNITY_PACKAGE_LOCK_INVALID', pointer: '/Packages/packages-lock.json/dependencies/com.unity.addressables' },
    { label: 'package-lock-depth', code: 'UNITY_PACKAGE_LOCK_INVALID', pointer: '/Packages/packages-lock.json/dependencies/com.unity.addressables' },
    { label: 'package-direct-extra', code: 'UNITY_PACKAGE_MANIFEST_INVALID', pointer: '/Packages/manifest.json' },
    { label: 'test-optional-reference-removed', code: 'ASMDEF_GRAPH_DRIFT', pointer: '/asmdefPolicy/assemblies/7' },
    { label: 'test-optional-reference-extra', code: 'ASMDEF_GRAPH_DRIFT', pointer: '/asmdefPolicy/assemblies/8/optionalUnityReferences' },
    { label: 'test-optional-reference-drift', code: 'ASMDEF_GRAPH_DRIFT', pointer: '/asmdefPolicy/assemblies/7/optionalUnityReferences' },
    { label: 'build-evidence-disabled-symbols', code: 'ANDROID_SYMBOLS_REQUIRED', pointer: '/android/build/symbols' },
    { label: 'ignored-unity-path', code: 'PASS', pointer: '/client/WarriorRaising/Assets/dist' },
  ]);
});

test('Given the repository baseline when policy validation runs then it passes', { timeout: characterizationTimeoutMs }, async () => {
  const model = await buildRepositoryModel(process.cwd());

  await expect(repositoryPolicy.validateRepositoryPolicy(model)).resolves.toBeUndefined();
});
