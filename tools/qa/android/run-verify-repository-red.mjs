#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { ContractError, fail } from '../repository/contract-utils.mjs';

const root = resolve(process.cwd());
const commands = [
  ['bun', ['run', '--silent', 'typecheck']],
  [process.execPath, ['tools/qa/android/run-repository-red.mjs']],
];

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 300000, maxBuffer: 1024 * 1024 });
  if (result.error) fail('REPOSITORY_VERIFY_EXECUTION_FAILURE', '/verify:repo', result.error.message);
  return { command, args, status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function main() {
  const results = commands.map(([command, args]) => run(command, args));
  const failed = results.find((result) => result.status !== 0);
  if (failed) {
    if (failed.stderr === '') fail('REPOSITORY_VERIFY_PROTOCOL_ERROR', '/verify:repo', `${failed.command} failed without a machine-readable issue`);
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
    : { code: 'REPOSITORY_VERIFY_FAILURE', pointer: '', message: error instanceof Error ? error.message : String(error) };
  process.stderr.write(`${JSON.stringify(issue)}\n`);
  process.exitCode = 1;
}
