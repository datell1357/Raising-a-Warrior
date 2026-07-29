import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, relative, resolve } from 'node:path';

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function run(command, root, timeout = 270_000) {
  const startedAt = new Date().toISOString();
  const result = spawnSync('/bin/sh', ['-c', command], { cwd: root, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024 });
  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: result.status,
    signal: result.signal,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error?.message ?? null,
  };
}

export function git(command, root) {
  const result = spawnSync('git', command, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || `git ${command.join(' ')} failed`);
  return result.stdout;
}

export function treeBinding(root) {
  const head = git(['rev-parse', 'HEAD'], root).trim();
  const dirty = git(['status', '--porcelain=v1', '--untracked-files=all'], root);
  return { head, dirtyStateSha256: sha256(dirty), dirty };
}

export async function hashedPath(root, path) {
  const contents = await readFile(resolve(root, path));
  return { path, sha256: sha256(contents) };
}

export async function artifact(root, path, mediaType) {
  const absolute = resolve(root, path);
  const stat = await lstat(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`${path} must be a regular file`);
  const contents = await readFile(absolute);
  return { path, sha256: sha256(contents), size: stat.size, mediaType };
}

export async function createAttempt(root, session, goal, attempt) {
  const evidenceRoot = resolve(root, '.omo/evidence/implementation');
  const finalRoot = resolve(evidenceRoot, session, goal, `a${attempt}`, 'task-8');
  const rel = relative(evidenceRoot, finalRoot);
  if (!rel || rel.startsWith('..') || resolve(evidenceRoot, rel) !== finalRoot) throw new Error('attempt path escapes evidence root');
  try {
    await lstat(finalRoot);
    throw new Error('attempt output already exists');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const stagingRoot = `${finalRoot}.staging-${process.pid}`;
  await rm(stagingRoot, { recursive: true, force: true });
  await mkdir(resolve(stagingRoot, 'reports'), { recursive: true });
  return { evidenceRoot, finalRoot, stagingRoot };
}

export async function publishAttempt(stagingRoot, finalRoot) {
  const stat = await lstat(stagingRoot);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('staging root must be a real directory');
  await mkdir(dirname(finalRoot), { recursive: true });
  await rename(stagingRoot, finalRoot);
}

export async function writeJson(root, path, value) {
  const absolute = resolve(root, path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`);
}
