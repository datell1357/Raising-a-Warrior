#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { ContractError, fail } from '../repository/contract-utils.mjs';

const root = resolve(process.cwd());
const commands = [
  ['tools/qa/repository/run-validation-suite.mjs', {}],
  ['tools/qa/repository/run-live-regressions.mjs', {}],
  ['tools/qa/android/test-contract.mjs', { ANDROID_REPOSITORY_AGGREGATE: '1' }],
];

function run(script, environment) {
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', env: { ...process.env, ...environment }, timeout: 300000, maxBuffer: 1024 * 1024 });
  if (result.error) fail('REPOSITORY_AGGREGATE_EXECUTION_FAILURE', '/test:repo', result.error.message);
  return { script, status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function main() {
  const results = commands.map(([script, environment]) => run(script, environment));
  const failed = results.find((result) => result.status !== 0);
  if (failed) {
    if (failed.stderr === '') fail('REPOSITORY_AGGREGATE_PROTOCOL_ERROR', '/test:repo', `${failed.script} failed without a machine-readable issue`);
    process.stderr.write(failed.stderr);
    process.exitCode = 1;
    return;
  }
  for (const result of results) process.stdout.write(result.stdout);
  process.stdout.write('PASS\n');
}

try {
  main();
} catch (error) {
  const issue = error instanceof ContractError
    ? { code: error.code, pointer: error.pointer, message: error.message }
    : { code: 'REPOSITORY_AGGREGATE_FAILURE', pointer: '', message: error instanceof Error ? error.message : String(error) };
  process.stderr.write(`${JSON.stringify(issue)}\n`);
  process.exitCode = 1;
}
