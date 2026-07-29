import { expect, test } from 'bun:test';

process.env.ANDROID_CONTRACT_UNIT_TEST = '1';
const { assertPackageCommandResult } = await import('./test-contract.mjs?package-probe-red');

for (const [label, result] of [
  ['timeout', { status: null, signal: 'SIGTERM', error: 'spawnSync bun ETIMEDOUT', stdout: 'partial', stderr: '' }],
  ['signal', { status: null, signal: 'SIGKILL', error: null, stdout: '', stderr: '' }],
  ['nonzero', { status: 1, signal: null, error: null, stdout: '', stderr: '{"code":"X"}' }],
  ['stderr', { status: 0, signal: null, error: null, stdout: 'PASS\n', stderr: 'warning' }],
  ['protocol', { status: 0, signal: null, error: null, stdout: 'PASS\nnoise', stderr: '' }],
]) test(`Given a ${label} child when package probing then diagnostics preserve machine state`, () => {
  expect(() => assertPackageCommandResult('test:repo', result, 123)).toThrow(/"command":"test:repo"/);
  expect(() => assertPackageCommandResult('test:repo', result, 123)).toThrow(/"durationMs":123/);
});
