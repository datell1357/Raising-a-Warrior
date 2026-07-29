import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export class QualificationError extends Error {}

export const tools = Object.freeze({
  unity: '/Applications/Unity/Unity-6000.5.4f1/Unity.app/Contents/MacOS/Unity',
  adb: '/Applications/Unity/Unity-6000.5.4f1/PlaybackEngines/AndroidPlayer/SDK/platform-tools/adb',
  emulator: '/Applications/Unity/Unity-6000.5.4f1/PlaybackEngines/AndroidPlayer/SDK/emulator/emulator',
  java: '/Applications/Unity/Unity-6000.5.4f1/PlaybackEngines/AndroidPlayer/OpenJDK/bin/java',
  jar: '/Applications/Unity/Unity-6000.5.4f1/PlaybackEngines/AndroidPlayer/OpenJDK/bin/jar',
  bundletool: '/Applications/Unity/Unity-6000.5.4f1/PlaybackEngines/AndroidPlayer/Tools/bundletool-all-1.17.2.jar',
});

export function execute(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: options.encoding === undefined ? 'utf8' : options.encoding,
    timeout: options.timeout ?? 300_000,
    maxBuffer: 32 * 1024 * 1024,
  });
  return {
    command,
    args,
    status: result.status,
    signal: result.signal,
    error: result.error?.message ?? null,
    stdout: result.stdout ?? (options.encoding === null ? Buffer.alloc(0) : ''),
    stderr: result.stderr ?? (options.encoding === null ? Buffer.alloc(0) : ''),
  };
}

export async function runLogged(logPath, command, args, options = {}) {
  const result = execute(command, args, options);
  const output = [
    `$ ${[command, ...args].map((part) => JSON.stringify(part)).join(' ')}`,
    result.stdout,
    result.stderr,
  ].join('\n');
  await writeFile(logPath, output, 'utf8');
  if (result.error || result.status !== 0) {
    throw new QualificationError(`${command} failed with status ${result.status ?? 'none'}: ${result.error ?? result.stderr}`);
  }
  return result;
}

export async function prepareEvidence(root) {
  const run = `${new Date().toISOString().replace(/[-:.]/g, '')}-${process.pid}`;
  const path = resolve(root, '.omo/evidence/implementation/local-20260728/mvp-t6/a1/task-6/lanes/l6/android-runs', run);
  await mkdir(path, { recursive: true });
  return path;
}

export async function hashFile(path) {
  const data = await readFile(path);
  const details = await stat(path);
  return { sha256: createHash('sha256').update(data).digest('hex'), size: details.size };
}

export async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}
