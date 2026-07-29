import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildRepositoryModel } from './repository-model.mjs';

const root = resolve(import.meta.dirname, '../../..');
const canonicalize = (value) => Array.isArray(value)
  ? value.map(canonicalize)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
    : value;

describe('repository evidence capture', () => {
  test('embedded repository contract hash matches the canonical model', async () => {
    const source = await readFile(resolve(root, 'tools/qa/repository/capture-evidence.mjs'), 'utf8');
    const expected = /canonicalRepositoryContractSha256 = '([a-f0-9]{64})'/.exec(source)?.[1];
    const model = await buildRepositoryModel(root);
    const actual = createHash('sha256').update(JSON.stringify(canonicalize(model.repositoryContract))).digest('hex');

    expect(expected).toBe(actual);
  });

  test('ignored prerequisite evidence resolves from the common checkout in a linked worktree', async () => {
    const source = await readFile(resolve(root, 'tools/qa/repository/capture-evidence.mjs'), 'utf8');

    expect(source).toContain("'--git-common-dir'");
    expect(source).toMatch(/preRemediationInventory[\s\S]*gitCommonDir|gitCommonDir[\s\S]*preRemediationInventory/);
  });

  test('dependency lockfile changes use the planned package scope verification', async () => {
    const source = await readFile(resolve(root, 'tools/qa/repository/capture-evidence.mjs'), 'utf8');

    expect(source).toMatch(/package:\s*\[[^\]]*'package\.json'[^\]]*'bun\.lock'[^\]]*\]/);
    expect(source).toMatch(/scopePath\(path\)[\s\S]*path === 'bun\.lock'/);
    expect(source).not.toContain('excluded bun.lock must remain unchanged and unallowed');
  });

  test('selected symlink canary exercises the forbidden-symlink diagnostic', async () => {
    const source = await readFile(resolve(root, 'tools/qa/repository/capture-evidence.mjs'), 'utf8');
    const match = /run\('fixture-symlink', process\.execPath, \['tools\/qa\/repository\/verify-repository\.mjs', '--fixture=([^']+)'\]\)/.exec(source);
    expect(match?.[1]).toBeDefined();

    const result = spawnSync(process.execPath, [
      'tools/qa/repository/verify-repository.mjs',
      `--fixture=${match[1]}`,
    ], { cwd: root, encoding: 'utf8' });
    const issue = JSON.parse(result.stderr.trim());

    expect(result.status).toBe(1);
    expect(issue).toMatchObject({ code: 'SYMLINK_FORBIDDEN', pointer: '/fixture' });
  });
});
