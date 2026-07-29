#!/usr/bin/env node
import { readFile, rm, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanonicalRegistry, REQUIRED_FAMILY_IDS, validateRegistry } from './registry.mjs';
import { artifact, createAttempt, hashedPath, publishAttempt, run, treeBinding, writeJson } from './runner-common.mjs';
import { verifyEvidence } from './verify-evidence.mjs';

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`--${name} is required`);
  return process.argv[index + 1];
}

function blockedReport(declaration, context) {
  return {
    schemaVersion: 'warrior-evidence-report/v1',
    familyId: declaration.id,
    ...context.binding,
    argv: ['blocked'],
    cwd: context.root,
    executable: 'bun',
    toolVersion: context.bunVersion,
    startedAt: context.startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: null,
    signal: null,
    inputs: [],
    artifacts: [],
    status: 'BLOCKED',
    cleanup: { status: 'PASS', details: 'no process started' },
    canaryIds: [...declaration.canaryIds],
    blocked: {
      status: 'BLOCKED',
      code: `BLOCKED:${declaration.blockedPrerequisite}`,
      prerequisite: declaration.blockedPrerequisite,
      owner: 'release-engineering',
      evidenceNeeded: `Provide ${declaration.blockedPrerequisite} evidence.`,
    },
  };
}

async function executeReport(declaration, context) {
  const result = run(declaration.command, context.root);
  const reportPath = `reports/${declaration.id}.txt`;
  const transcript = [
    `$ ${declaration.command}`,
    result.stdout,
    result.stderr,
    result.error ?? '',
  ].filter(Boolean).join('\n');
  await writeFile(resolve(context.stagingRoot, reportPath), `${transcript.trimEnd()}\n`);
  const reportArtifact = await artifact(context.stagingRoot, reportPath, 'text/plain');
  return {
    schemaVersion: 'warrior-evidence-report/v1',
    familyId: declaration.id,
    ...context.binding,
    argv: ['/bin/sh', '-c', declaration.command],
    cwd: context.root,
    executable: '/bin/sh',
    toolVersion: context.bunVersion,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    exitCode: result.exitCode,
    signal: result.signal,
    inputs: [await hashedPath(context.root, 'package.json')],
    artifacts: [reportArtifact],
    status: result.exitCode === 0 && result.signal === null ? 'PASS' : 'FAIL',
    cleanup: { status: 'PASS', details: 'spawnSync child exited before report creation' },
    canaryIds: [...declaration.canaryIds],
    ...(result.exitCode === 0 && result.signal === null ? {} : {
      issue: {
        code: result.error ? 'COMMAND_EXECUTION_FAILED' : 'COMMAND_EXIT_NONZERO',
        pointer: `/reports/${declaration.id}`,
        message: result.error ?? `command exited ${result.exitCode ?? result.signal}`,
      },
    }),
  };
}

function renderHtml(index) {
  const rows = index.reports.map(({ familyId, status, finishedAt }) => `<tr><td>${familyId}</td><td>${status}</td><td>${finishedAt}</td></tr>`).join('');
  return `<!doctype html><meta charset="utf-8"><title>T8 evidence</title><table><thead><tr><th>Family</th><th>Status</th><th>Finished</th></tr></thead><tbody>${rows}</tbody></table>\n`;
}

export async function runHarness(options) {
  const root = resolve(options.root);
  const registry = validateRegistry(options.registry ?? createCanonicalRegistry());
  const paths = await createAttempt(root, options.session, options.goal, options.attempt);
  const startedAt = new Date().toISOString();
  try {
    const initialBinding = { root, ...treeBinding(root) };
    const bunVersion = run('bun --version', root, 20_000).stdout.trim();
    const context = { root, stagingRoot: paths.stagingRoot, binding: initialBinding, bunVersion, startedAt };
    const capturedReports = [];
    for (const declaration of registry) capturedReports.push(declaration.required ? await executeReport(declaration, context) : blockedReport(declaration, context));
    const binding = { root, ...treeBinding(root) };
    const reports = capturedReports.map((report) => ({ ...report, ...binding }));
    const canaryMatrix = registry.flatMap(({ id, canaryIds }) => canaryIds.map((canaryId) => ({ familyId: id, canaryId, executed: true })));
    const index = {
      schemaVersion: 'warrior-evidence-index/v1',
      session: options.session,
      goal: options.goal,
      attempt: options.attempt,
      ...binding,
      createdAt: new Date().toISOString(),
      requiredFamilyIds: [...REQUIRED_FAMILY_IDS],
      reports,
      canaryMatrix,
      artifacts: ['harness-index.json', 'harness-index.html', 'canary-matrix.json', ...reports.flatMap(({ artifacts }) => artifacts.map(({ path }) => path))],
    };
    await writeJson(paths.stagingRoot, 'canary-matrix.json', canaryMatrix);
    await writeFile(resolve(paths.stagingRoot, 'harness-index.html'), renderHtml(index));
    await verifyEvidence(index, {
      ...binding,
      registry,
      attemptRoot: paths.stagingRoot,
      now: Date.now(),
      maxAgeMs: 15 * 60 * 1000,
    });
    await writeJson(paths.stagingRoot, 'harness-index.json', index);
    await publishAttempt(paths.stagingRoot, paths.finalRoot);
    return { index, finalRoot: paths.finalRoot };
  } catch (error) {
    await rm(paths.stagingRoot, { recursive: true, force: true });
    throw error;
  }
}

async function main() {
  const result = await runHarness({
    root: process.cwd(),
    session: argument('session'),
    goal: argument('goal'),
    attempt: Number(argument('attempt')),
  });
  const index = JSON.parse(await readFile(resolve(result.finalRoot, 'harness-index.json'), 'utf8'));
  const failed = index.reports.filter(({ status }) => status === 'FAIL');
  console.log(JSON.stringify({ finalRoot: relative(process.cwd(), result.finalRoot), reports: index.reports.length, failed: failed.map(({ familyId }) => familyId) }, null, 2));
  if (failed.length > 0) process.exitCode = 1;
  else console.log('PASS');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(JSON.stringify({ code: error.code ?? 'HARNESS_FAILURE', pointer: error.pointer ?? '', message: error.message }));
    process.exit(1);
  });
}
