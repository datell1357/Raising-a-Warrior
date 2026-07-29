#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanonicalRegistry, REQUIRED_FAMILY_IDS, validateRegistry } from './registry.mjs';

function fail(code, pointer, message) {
  const error = new Error(message);
  error.code = code;
  error.pointer = pointer;
  throw error;
}

function object(value, at) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('EVIDENCE_SHAPE_INVALID', at, 'value must be an object');
  return value;
}

function array(value, at) {
  if (!Array.isArray(value)) fail('EVIDENCE_SHAPE_INVALID', at, 'value must be an array');
  return value;
}

function string(value, at) {
  if (typeof value !== 'string' || value === '') fail('EVIDENCE_SHAPE_INVALID', at, 'value must be a non-empty string');
  return value;
}

function unique(values, code, at) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) fail(code, at, `${value} must be unique`);
    seen.add(value);
  }
  return seen;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function safeFile(root, path, at) {
  const absolute = resolve(root, string(path, at));
  const rel = relative(root, absolute);
  if (!rel || rel.startsWith('..') || resolve(root, rel) !== absolute) fail('ARTIFACT_PATH_INVALID', at, 'artifact must be below the attempt root');
  let stat;
  try {
    stat = await lstat(absolute);
  } catch {
    fail('ARTIFACT_MISSING', at, 'declared artifact is missing');
  }
  if (!stat.isFile() || stat.isSymbolicLink()) fail('ARTIFACT_PATH_INVALID', at, 'artifact must be a regular non-symlink file');
  return { absolute, stat };
}

function timestamp(value, at) {
  const epoch = Date.parse(string(value, at));
  if (!Number.isFinite(epoch)) fail('TIMESTAMP_INVALID', at, 'timestamp must be ISO-8601');
  return epoch;
}

function validateBlocked(value, declaration, at) {
  const blocked = object(value, at);
  if (blocked.status !== 'BLOCKED') fail('BLOCKED_ENVELOPE_INVALID', `${at}/status`, 'blocked status must be exact');
  if (blocked.code !== `BLOCKED:${blocked.prerequisite}`) fail('BLOCKED_ENVELOPE_INVALID', `${at}/code`, 'blocked code must bind prerequisite');
  for (const key of ['prerequisite', 'owner', 'evidenceNeeded']) string(blocked[key], `${at}/${key}`);
  if (declaration.required || blocked.prerequisite !== declaration.blockedPrerequisite) {
    fail('BLOCKED_ENVELOPE_INVALID', `${at}/prerequisite`, 'family may only block on its declared prerequisite');
  }
}

async function validateReport(reportValue, declaration, context, at) {
  const report = object(reportValue, at);
  if (report.schemaVersion !== 'warrior-evidence-report/v1') fail('REPORT_SCHEMA_INVALID', `${at}/schemaVersion`, 'report schema version is invalid');
  if (report.familyId !== declaration.id) fail('REPORT_FAMILY_INVALID', `${at}/familyId`, 'report family differs from registry');
  if (report.root !== context.root) fail('REPORT_ROOT_MISMATCH', `${at}/root`, 'report root differs');
  if (report.head !== context.head || report.dirtyStateSha256 !== context.dirtyStateSha256) fail('REPORT_TREE_MISMATCH', at, 'report tree binding differs');
  const started = timestamp(report.startedAt, `${at}/startedAt`);
  const finished = timestamp(report.finishedAt, `${at}/finishedAt`);
  if (finished < started || finished > context.now || finished < context.now - context.maxAgeMs) fail('REPORT_STALE', `${at}/finishedAt`, 'report is outside the accepted invocation window');
  array(report.argv, `${at}/argv`);
  string(report.cwd, `${at}/cwd`);
  string(report.executable, `${at}/executable`);
  string(report.toolVersion, `${at}/toolVersion`);
  const canaries = unique(array(report.canaryIds, `${at}/canaryIds`), 'REPORT_CANARY_DUPLICATE', `${at}/canaryIds`);
  for (const canary of declaration.canaryIds) if (!canaries.has(canary)) fail('REPORT_CANARY_UNTRIGGERED', `${at}/canaryIds`, `canary ${canary} did not execute`);
  if (report.status === 'PASS' && (report.exitCode !== 0 || report.signal !== null)) fail('REPORT_MISLEADING_PASS', at, 'PASS requires exit 0 and no signal');
  if (report.status === 'FAIL' && !report.issue) fail('REPORT_FAILURE_ISSUE_MISSING', `${at}/issue`, 'FAIL requires an issue');
  if (report.status === 'BLOCKED') {
    if (array(report.artifacts, `${at}/artifacts`).length !== 0) fail('BLOCKED_ARTIFACT_FORBIDDEN', `${at}/artifacts`, 'BLOCKED cannot fabricate artifacts');
    validateBlocked(report.blocked, declaration, `${at}/blocked`);
    return;
  }
  if (!['PASS', 'FAIL'].includes(report.status)) fail('REPORT_STATUS_INVALID', `${at}/status`, 'report status is invalid');
  if (object(report.cleanup, `${at}/cleanup`).status !== 'PASS') fail('REPORT_CLEANUP_INVALID', `${at}/cleanup/status`, 'cleanup must pass');
  const bindings = report.bindings ?? {};
  for (const binding of declaration.requiredBindings ?? []) {
    if (!/^[0-9a-f]{64}$/.test(bindings[binding] ?? '')) fail('REPORT_BINDING_INVALID', `${at}/bindings/${binding}`, `${binding} must be a SHA-256`);
  }
  for (let index = 0; index < array(report.inputs, `${at}/inputs`).length; index += 1) {
    const input = report.inputs[index];
    const absolute = resolve(context.root, string(input.path, `${at}/inputs/${index}/path`));
    let contents;
    try {
      contents = await readFile(absolute);
    } catch {
      fail('INPUT_MISSING', `${at}/inputs/${index}/path`, 'bound input is missing');
    }
    if (sha256(contents) !== input.sha256) fail('INPUT_HASH_MISMATCH', `${at}/inputs/${index}/sha256`, 'input hash differs');
  }
  for (let index = 0; index < array(report.artifacts, `${at}/artifacts`).length; index += 1) {
    const artifact = report.artifacts[index];
    const { absolute, stat } = await safeFile(context.attemptRoot, artifact.path, `${at}/artifacts/${index}/path`);
    const contents = await readFile(absolute);
    if (stat.size !== artifact.size) fail('ARTIFACT_SIZE_MISMATCH', `${at}/artifacts/${index}/size`, 'artifact size differs');
    if (sha256(contents) !== artifact.sha256) fail('ARTIFACT_HASH_MISMATCH', `${at}/artifacts/${index}/sha256`, 'artifact hash differs');
  }
}

export async function verifyEvidence(indexValue, options) {
  const index = object(indexValue, '');
  const registry = validateRegistry(options.registry ?? createCanonicalRegistry());
  const declarations = new Map(registry.map((item) => [item.id, item]));
  if (index.schemaVersion !== 'warrior-evidence-index/v1') fail('INDEX_SCHEMA_INVALID', '/schemaVersion', 'index schema version is invalid');
  if (index.root !== options.root) fail('INDEX_ROOT_MISMATCH', '/root', 'index root differs');
  if (index.head !== options.head || index.dirtyStateSha256 !== options.dirtyStateSha256) fail('INDEX_TREE_MISMATCH', '', 'index tree binding differs');
  const created = timestamp(index.createdAt, '/createdAt');
  if (created > options.now || created < options.now - options.maxAgeMs) fail('INDEX_STALE', '/createdAt', 'index is stale');
  const requiredIds = array(index.requiredFamilyIds, '/requiredFamilyIds');
  if (JSON.stringify(requiredIds) !== JSON.stringify(REQUIRED_FAMILY_IDS)) fail('INDEX_REQUIRED_FAMILIES_INVALID', '/requiredFamilyIds', 'required family inventory differs');
  const reports = array(index.reports, '/reports');
  const reportIds = unique(reports.map((report) => report.familyId), 'INDEX_FAMILY_DUPLICATE', '/reports');
  for (const declaration of registry) if (!reportIds.has(declaration.id)) fail('INDEX_FAMILY_OMITTED', '/reports', `family ${declaration.id} is missing`);
  for (const id of reportIds) if (!declarations.has(id)) fail('INDEX_FAMILY_UNKNOWN', '/reports', `family ${id} is unknown`);
  const context = { ...options, attemptRoot: options.attemptRoot };
  for (let indexNumber = 0; indexNumber < reports.length; indexNumber += 1) await validateReport(reports[indexNumber], declarations.get(reports[indexNumber].familyId), context, `/reports/${indexNumber}`);
  const executed = new Set(array(index.canaryMatrix, '/canaryMatrix').filter(({ executed: value }) => value === true).map(({ familyId, canaryId }) => `${familyId}:${canaryId}`));
  for (const declaration of registry) for (const canaryId of declaration.canaryIds) {
    if (!executed.has(`${declaration.id}:${canaryId}`)) fail('INDEX_CANARY_UNTRIGGERED', '/canaryMatrix', `canary ${declaration.id}:${canaryId} is missing`);
  }
  return index;
}

export async function verifyEvidenceFile(path, options) {
  return verifyEvidence(JSON.parse(await readFile(path, 'utf8')), { ...options, attemptRoot: options.attemptRoot ?? dirname(path) });
}

async function main() {
  const [path] = process.argv.slice(2);
  if (!path) fail('INDEX_PATH_REQUIRED', '', 'index path is required');
  const index = JSON.parse(await readFile(path, 'utf8'));
  await verifyEvidence(index, {
    root: process.cwd(),
    head: process.env.HARNESS_HEAD,
    dirtyStateSha256: process.env.HARNESS_DIRTY_SHA256,
    attemptRoot: dirname(path),
    now: Date.now(),
    maxAgeMs: 15 * 60 * 1000,
  });
  console.log('PASS');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(JSON.stringify({ code: error.code ?? 'EVIDENCE_VERIFY_FAILURE', pointer: error.pointer ?? '', message: error.message }));
    process.exit(1);
  });
}
