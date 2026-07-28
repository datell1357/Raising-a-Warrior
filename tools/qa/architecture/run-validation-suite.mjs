#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const evidenceArg = process.argv.find((arg) => arg.startsWith('--evidence-dir='));
const evidenceDir = evidenceArg ? resolve(root, evidenceArg.slice('--evidence-dir='.length)) : null;
const evidenceRoot = resolve(root, '.omo/evidence');

async function ensureSafeEvidenceDir() {
  if (!evidenceDir) return;
  const relativePath = relative(evidenceRoot, evidenceDir);
  if (!relativePath || relativePath.startsWith('..') || resolve(evidenceRoot, relativePath) !== evidenceDir) throw new Error('evidence directory must be a descendant of .omo/evidence');
  if ((await lstat(evidenceRoot)).isSymbolicLink()) throw new Error('evidence root must not be a symlink');
  let current = evidenceRoot;
  for (const segment of relativePath.split('/')) {
    current = resolve(current, segment);
    if ((await lstat(current).catch(() => null))?.isSymbolicLink()) throw new Error('evidence directory must not contain symlink components');
  }
}

function run(label, args) {
  const startedAt = Date.now();
  const result = spawnSync('node', args, { cwd: root, encoding: 'utf8' });
  return { label, command: ['node', ...args].join(' '), args, exitCode: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', signal: result.signal ?? null, durationMs: Date.now() - startedAt };
}

function parseIssue(stderr) {
  const line = stderr.trim().split('\n').find((value) => value.startsWith('{'));
  if (!line) throw new Error(`negative fixture did not produce machine-readable failure: ${stderr}`);
  return JSON.parse(line);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}

function junit(cases) {
  const tests = cases.map((item) => `  <testcase name="${item.id}" classname="architecture" time="0"><system-out>${JSON.stringify(item)}</system-out></testcase>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="architecture" tests="${cases.length}" failures="0" errors="0" skipped="0">\n${tests}\n</testsuite>\n`;
}

async function writeEvidence(name, value) {
  if (!evidenceDir) return;
  await ensureSafeEvidenceDir();
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(resolve(evidenceDir, name), typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main() {
  const manifest = JSON.parse(await readFile(resolve(root, 'tools/qa/architecture/negative-fixtures.json'), 'utf8'));
  const payloads = new Map();
  for (const fixture of manifest) {
    const payload = JSON.parse(await readFile(resolve(root, fixture.path), 'utf8'));
    const hash = createHash('sha256').update(JSON.stringify(canonicalize(payload))).digest('hex');
    if (payloads.has(hash)) throw new Error(`duplicate fixture payloads: ${payloads.get(hash)} and ${fixture.id}`);
    payloads.set(hash, fixture.id);
  }
  const canonical = run('canonical', ['tools/qa/architecture/validate-adr.mjs']);
  if (canonical.exitCode !== 0 || !canonical.stdout.endsWith('PASS\n')) throw new Error(`canonical contract failed: ${canonical.stderr || canonical.stdout}`);
  const results = [];
  for (const fixture of manifest) {
    const result = run(fixture.id, ['tools/qa/architecture/validate-adr.mjs', fixture.path]);
    if (result.exitCode === 0) throw new Error(`negative fixture passed: ${fixture.id}`);
    const issue = parseIssue(result.stderr);
    if (issue.code !== fixture.expect.code || issue.pointer !== fixture.expect.pointer) throw new Error(`negative fixture mismatch for ${fixture.id}: ${JSON.stringify(issue)}`);
    results.push({ ...fixture, result, issue });
  }
  const canary = run('misleading-pass-exit-one', ['-e', "process.stdout.write('PASS\\n'); process.exit(1)"]);
  if (canary.exitCode !== 1 || canary.stdout !== 'PASS\n') throw new Error('misleading PASS/exit-1 canary was not authoritative');
  const receipt = { phase: 'GREEN', canonical, fixtureCount: results.length, distinctFixturePayloads: payloads.size, negativeFixtures: results.map(({ id, issue }) => ({ id, ...issue })), canary, externalPrerequisites: 'BLOCKED is reported separately from contract PASS' };
  await writeEvidence('negative-fixture-manifest.json', manifest);
  await writeEvidence('negative-fixture-results.json', results);
  await writeEvidence('architecture-junit.xml', junit([{ id: 'canonical-contract', result: canonical }, ...results.map(({ id, issue }) => ({ id, issue })), { id: canary.label, result: canary }]));
  await writeEvidence('red-green-receipt.json', receipt);
  console.log(JSON.stringify(receipt, null, 2));
  console.log('PASS');
}

main().catch((error) => {
  console.error(JSON.stringify({ code: 'ARCHITECTURE_SUITE_FAILURE', pointer: '', message: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
