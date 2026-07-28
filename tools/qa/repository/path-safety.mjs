import { lstat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fail, string } from './contract-utils.mjs';

export function repositoryPath(root, path, pointer) {
  const candidate = resolve(root, string(path, pointer));
  const local = relative(root, candidate);
  if (local.startsWith('..') || (local && resolve(root, local) !== candidate)) fail('PATH_OUTSIDE_REPOSITORY', pointer, 'path must remain inside the repository');
  return candidate;
}

export async function assertSafePath(root, absolute, pointer, fileRequired = false) {
  const local = relative(root, absolute);
  if (local.startsWith('..') || (local && resolve(root, local) !== absolute)) fail('PATH_OUTSIDE_REPOSITORY', pointer, 'path must remain inside the repository');
  let current = root;
  for (const part of local.split('/').filter(Boolean)) {
    current = resolve(current, part);
    const stat = await lstat(current).catch(() => null);
    if (!stat) break;
    if (stat.isSymbolicLink()) fail('SYMLINK_FORBIDDEN', pointer, 'repository path must not include a symlink');
  }
  const stat = await lstat(absolute).catch(() => null);
  if (fileRequired && (!stat?.isFile() || stat.isSymbolicLink())) fail('INPUT_UNSAFE', pointer, 'input must be a regular file');
  return stat;
}
