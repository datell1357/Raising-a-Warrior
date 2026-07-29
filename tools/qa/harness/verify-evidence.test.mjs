import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createCanonicalRegistry, REQUIRED_FAMILY_IDS } from './registry.mjs';
import { verifyEvidence } from './verify-evidence.mjs';

const head = '1'.repeat(40);
const dirtyStateSha256 = '2'.repeat(64);
const now = Date.parse('2026-07-29T08:00:00.000Z');
let root;
let attemptRoot;

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function blockedReport(declaration) {
  return {
    schemaVersion: 'warrior-evidence-report/v1',
    familyId: declaration.id,
    root,
    head,
    dirtyStateSha256,
    argv: ['blocked'],
    cwd: root,
    executable: 'bun',
    toolVersion: '1.3.14',
    startedAt: '2026-07-29T07:59:00.000Z',
    finishedAt: '2026-07-29T07:59:01.000Z',
    exitCode: null,
    signal: null,
    inputs: [],
    artifacts: [],
    status: 'BLOCKED',
    cleanup: { status: 'PASS', details: 'nothing started' },
    canaryIds: [...declaration.canaryIds],
    blocked: {
      status: 'BLOCKED',
      code: `BLOCKED:${declaration.blockedPrerequisite}`,
      prerequisite: declaration.blockedPrerequisite,
      owner: 'release-engineering',
      evidenceNeeded: 'external prerequisite evidence',
    },
  };
}

async function passReport(declaration) {
  const path = `reports/${declaration.id}.txt`;
  const absolute = resolve(attemptRoot, path);
  const contents = Buffer.from(`${declaration.id}\n`);
  await writeFile(absolute, contents);
  return {
    schemaVersion: 'warrior-evidence-report/v1',
    familyId: declaration.id,
    root,
    head,
    dirtyStateSha256,
    argv: declaration.command.split(' '),
    cwd: root,
    executable: 'bun',
    toolVersion: '1.3.14',
    startedAt: '2026-07-29T07:59:00.000Z',
    finishedAt: '2026-07-29T07:59:01.000Z',
    exitCode: 0,
    signal: null,
    inputs: [],
    artifacts: [{ path, sha256: hash(contents), size: contents.length, mediaType: 'text/plain' }],
    status: 'PASS',
    cleanup: { status: 'PASS', details: 'no resources' },
    canaryIds: [...declaration.canaryIds],
    bindings: Object.fromEntries((declaration.requiredBindings ?? []).map((key) => [key, '3'.repeat(64)])),
  };
}

async function fixture() {
  const registry = createCanonicalRegistry();
  const reports = [];
  for (const declaration of registry) reports.push(declaration.required ? await passReport(declaration) : blockedReport(declaration));
  return {
    schemaVersion: 'warrior-evidence-index/v1',
    session: 'session',
    goal: 'mvp-t8',
    attempt: 1,
    root,
    head,
    dirtyStateSha256,
    createdAt: '2026-07-29T07:59:02.000Z',
    requiredFamilyIds: [...REQUIRED_FAMILY_IDS],
    reports,
    canaryMatrix: registry.flatMap(({ id, canaryIds }) => canaryIds.map((canaryId) => ({ familyId: id, canaryId, executed: true }))),
    artifacts: ['harness-index.html', 'canary-matrix.json', ...reports.flatMap(({ artifacts }) => artifacts.map(({ path }) => path))],
  };
}

async function issue(mutator, code) {
  const value = await fixture();
  await mutator(value);
  await expect(verifyEvidence(value, { root, head, dirtyStateSha256, attemptRoot, now, maxAgeMs: 15 * 60 * 1000 })).rejects.toMatchObject({ code });
}

beforeAll(async () => {
  root = await mkdtemp(resolve(tmpdir(), 'warrior-harness-root-'));
  attemptRoot = resolve(root, 'attempt');
  await mkdir(resolve(attemptRoot, 'reports'), { recursive: true });
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

test('Given fresh evidence when independently verified then every report hash and canary passes', async () => {
  await expect(verifyEvidence(await fixture(), { root, head, dirtyStateSha256, attemptRoot, now, maxAgeMs: 15 * 60 * 1000 })).resolves.toMatchObject({ goal: 'mvp-t8' });
});

test('Given index inventory drift when verified then omission duplicate and unknown fail', async () => {
  await issue((value) => { value.reports.shift(); }, 'INDEX_FAMILY_OMITTED');
  await issue((value) => { value.reports.push(structuredClone(value.reports[0])); }, 'INDEX_FAMILY_DUPLICATE');
  await issue((value) => { value.reports.push({ ...structuredClone(value.reports[0]), familyId: 'unknown' }); }, 'INDEX_FAMILY_UNKNOWN');
});

test('Given stale root or misleading PASS when verified then it fails deterministically', async () => {
  await issue((value) => { value.createdAt = '2026-07-29T07:00:00.000Z'; }, 'INDEX_STALE');
  await issue((value) => { value.root = '/wrong'; }, 'INDEX_ROOT_MISMATCH');
  await issue((value) => { value.reports[0].exitCode = 1; }, 'REPORT_MISLEADING_PASS');
});

test('Given corrupt or missing artifacts when verified then it fails deterministically', async () => {
  await issue(async (value) => { await writeFile(resolve(attemptRoot, value.reports[0].artifacts[0].path), 'corrupt'); }, 'ARTIFACT_SIZE_MISMATCH');
  await issue(async (value) => { await rm(resolve(attemptRoot, value.reports[0].artifacts[0].path), { force: true }); }, 'ARTIFACT_MISSING');
});

test('Given binding canary or BLOCKED drift when verified then it fails deterministically', async () => {
  await issue((value) => {
    const report = value.reports.find(({ familyId }) => familyId === 'release-manifest');
    report.status = 'PASS';
    report.exitCode = 0;
    report.blocked = undefined;
    report.bindings = { rcSha256: 'wrong' };
  }, 'REPORT_BINDING_INVALID');
  await issue((value) => { value.canaryMatrix.pop(); }, 'INDEX_CANARY_UNTRIGGERED');
  await issue((value) => {
    const report = value.reports.find(({ status }) => status === 'BLOCKED');
    report.blocked.code = 'BLOCKED:other';
  }, 'BLOCKED_ENVELOPE_INVALID');
});

test('Given a symlink artifact when verified then it is rejected', async () => {
  const value = await fixture();
  const report = value.reports[0];
  const linkPath = resolve(attemptRoot, 'reports/link.txt');
  await symlink(resolve(attemptRoot, report.artifacts[0].path), linkPath);
  report.artifacts[0] = { ...report.artifacts[0], path: 'reports/link.txt' };
  await expect(verifyEvidence(value, { root, head, dirtyStateSha256, attemptRoot, now, maxAgeMs: 15 * 60 * 1000 })).rejects.toMatchObject({ code: 'ARTIFACT_PATH_INVALID' });
});
