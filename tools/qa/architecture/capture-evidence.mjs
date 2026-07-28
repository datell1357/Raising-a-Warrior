#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const evidenceRoot = resolve(root, '.omo/evidence');
const evidenceArg = process.argv.find((arg) => arg.startsWith('--evidence-dir='));
const runIdArg = process.argv.find((arg) => arg.startsWith('--run-id='));
const skipCliProbes = process.argv.includes('--skip-cli-probes');
const runId = runIdArg ? runIdArg.slice('--run-id='.length) : '20260728T000000Z-task4-a4';
if (!/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error('invalid run ID');
const evidenceDir = resolve(root, evidenceArg ? evidenceArg.slice('--evidence-dir='.length) : '.omo/evidence/implementation/20260727T000000Z/architecture/a4/task-4');
const evidenceRelative = relative(evidenceRoot, evidenceDir);
if (!evidenceRelative || evidenceRelative.startsWith('..') || resolve(evidenceRoot, evidenceRelative) !== evidenceDir) throw new Error('evidence directory must be a descendant of .omo/evidence');

async function rejectSymlinkComponents() {
  const rootStat = await lstat(evidenceRoot);
  if (rootStat.isSymbolicLink()) throw new Error('evidence root must not be a symlink');
  let current = evidenceRoot;
  for (const segment of evidenceRelative.split('/')) {
    current = resolve(current, segment);
    const stat = await lstat(current).catch(() => null);
    if (stat?.isSymbolicLink()) throw new Error('evidence directory must not contain symlink components');
  }
}

function run(label, command, args) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  return { label, cwd: root, command, args, exit_code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', signal: result.signal ?? null, durationMs: Date.now() - startedAt };
}

async function writeJson(name, value) {
  await writeFile(resolve(evidenceDir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function hash(paths) {
  const output = {};
  for (const path of paths) output[path] = createHash('sha256').update(await readFile(resolve(root, path))).digest('hex');
  return output;
}

async function fixturePaths(directory) {
  const entries = await readdir(resolve(root, directory), { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) paths.push(...await fixturePaths(path));
    else if (entry.isFile()) paths.push(path);
  }
  return paths.sort();
}

async function main() {
  await rejectSymlinkComponents();
  const cliNegativeResults = skipCliProbes ? [] : [
    run('invalid-run-id', 'node', ['tools/qa/architecture/capture-evidence.mjs', '--skip-cli-probes', '--run-id=bad/id']),
    run('evidence-root', 'node', ['tools/qa/architecture/capture-evidence.mjs', '--skip-cli-probes', '--evidence-dir=.omo/evidence']),
    run('outside-evidence-dir', 'node', ['tools/qa/architecture/capture-evidence.mjs', '--skip-cli-probes', '--evidence-dir=.omo/evidence/../outside']),
    run('sibling-prefix-evidence-dir', 'node', ['tools/qa/architecture/capture-evidence.mjs', '--skip-cli-probes', '--evidence-dir=.omo/evidence-sibling/task-4']),
  ];
  for (const result of cliNegativeResults) if (result.exit_code === 0 || !/invalid run ID|evidence directory must be a descendant/.test(result.stderr)) throw new Error(`CLI negative probe failed: ${result.label}`);
  await mkdir(evidenceDir, { recursive: true });
  await writeJson('cli-negative-results.json', cliNegativeResults);
  const syntaxResults = (await readdir(resolve(root, 'tools/qa/architecture'), { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.mjs'))
    .map((entry) => `tools/qa/architecture/${entry.name}`)
    .sort()
    .map((path) => run(`syntax:${path}`, 'node', ['--check', path]));
  const commands = [
    run('validate-scope', 'bun', ['run', 'validate:scope']),
    run('test-schema', 'bun', ['run', 'test:schema']),
    run('validate-adr', 'bun', ['run', 'validate:adr']),
    ...syntaxResults,
    run('raw-matrix-audit', 'node', ['-e', "const fs=require('fs'); const m=JSON.parse(fs.readFileSync('docs/architecture/mutation-matrix.json')); if(m.mutations.length!==50) process.exit(1); console.log('PASS')"]),
    run('raw-prerequisite-audit', 'node', ['-e', "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('docs/operations/external-prerequisites.json')); if(p.prerequisites.length!==16) process.exit(1); console.log('PASS')"]),
    run('architecture-suite-evidence', 'node', ['tools/qa/architecture/run-validation-suite.mjs', `--evidence-dir=${evidenceDir}`]),
  ];
  const failed = commands.find((entry) => entry.exit_code !== 0);
  await writeJson('command-log.json', { runId, commands });
  await writeJson('syntax-diagnostics.json', { status: syntaxResults.every((entry) => entry.exit_code === 0) ? 'PASS' : 'FAIL', files: syntaxResults });
  if (failed) throw new Error(`${failed.label} failed with exit ${failed.exit_code}`);
  const matrix = JSON.parse(await readFile(resolve(root, 'docs/architecture/mutation-matrix.json'), 'utf8'));
  const prerequisites = JSON.parse(await readFile(resolve(root, 'docs/operations/external-prerequisites.json'), 'utf8'));
  const blockers = prerequisites.prerequisites.filter((entry) => entry.status !== 'VERIFIED').map((entry) => `BLOCKED:${entry.id}`);
  await writeJson('authority-matrix.json', { mutationCount: matrix.mutations.length, exclusions: matrix.exclusions, mutations: matrix.mutations });
  await writeJson('policy-snapshot.json', { policy: matrix.policy, adrs: matrix.adrRegistry, contractStatus: 'PASS', externalPrerequisiteStatus: 'BLOCKED' });
  await writeJson('prerequisite-status.json', { prerequisites: prerequisites.prerequisites, blockers, status: 'BLOCKED' });
  await writeJson('official-source-snapshot.json', matrix.sourceRegistry);
  await writeJson('official-source-claims.json', JSON.parse(await readFile(resolve(root, 'tools/qa/architecture/official-source-claims.json'), 'utf8')));
  await writeJson('canonical-binding-verification.json', { bindings: matrix.canonicalBindings, status: 'PASS' });
  await writeJson('owner-security-profile-verification.json', { status: 'PASS', profiles: matrix.mutations.map(({ specId, serverOwner, authBoundary, appCheckIntegrity, classification, classificationRationale, securityProofs, commerceProof }) => ({ specId, serverOwner, authBoundary, appCheckIntegrity, classification, classificationRationale, securityProofs, commerceProof })) });
  await writeJson('prerequisite-proof-verification.json', { status: 'BLOCKED', prerequisites: prerequisites.prerequisites.map(({ id, status, proofKind, verification }) => ({ id, status, proofKind, verification })) });
  await writeJson('adr-structured-verification.json', { status: 'PASS', adrs: matrix.adrRegistry, sourceClaims: JSON.parse(await readFile(resolve(root, 'tools/qa/architecture/official-source-claims.json'), 'utf8')) });
  await writeJson('artifact-hashes.json', await hash([
    'package.json',
    'docs/Manyfast/워리어 키우기_PRD.md',
    'docs/Manyfast/워리어 키우기_기능명세서.md',
    'docs/Manyfast/워리어 키우기_유저플로우.md',
    'docs/production/scope-contract.json',
    'content/contracts/command.schema.json',
    '.omo/evidence/implementation/20260727T000000Z/contracts/a14/task-3/artifact-hashes.json',
    'docs/architecture/mutation-matrix.json',
    'docs/operations/external-prerequisites.json',
    'docs/architecture/adr/001-authority.md',
    'docs/architecture/adr/002-deterministic-combat.md',
    'docs/architecture/adr/003-idempotency-ledger.md',
    'docs/architecture/adr/004-content-versioning.md',
    'docs/architecture/adr/005-privacy-delete.md',
    'docs/architecture/adr/006-platform-policy.md',
    'tools/qa/architecture/constants.mjs',
    'tools/qa/architecture/contract-utils.mjs',
    'tools/qa/architecture/load-input.mjs',
    'tools/qa/architecture/validate-bindings.mjs',
    'tools/qa/architecture/mutation-profiles.mjs',
    'tools/qa/architecture/validate-matrix.mjs',
    'tools/qa/architecture/validate-adrs.mjs',
    'tools/qa/architecture/validate-source-claims.mjs',
    'tools/qa/architecture/validate-prerequisites.mjs',
    'tools/qa/architecture/validate-adr.mjs',
    'tools/qa/architecture/run-validation-suite.mjs',
    'tools/qa/architecture/capture-evidence.mjs',
    'tools/qa/architecture/official-source-claims.json',
    'tools/qa/architecture/negative-fixtures.json',
    ...await fixturePaths('tools/qa/architecture/fixtures'),
  ]));
  await writeJson('cleanup-receipt.json', { evidenceDir, createdBy: 'tools/qa/architecture/capture-evidence.mjs', deletedOrMovedFiles: [], temporaryArtifacts: [] });
  console.log('PASS');
}

main().catch((error) => {
  console.error(JSON.stringify({ code: 'EVIDENCE_CAPTURE_FAILURE', pointer: '', message: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
