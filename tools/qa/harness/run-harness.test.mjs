import { lstat, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { runHarness } from './run-harness.mjs';
import { treeBinding } from './runner-common.mjs';

let root;

function registry(command = 'printf PASS') {
  return [
    { id: 'scope', command, canaryIds: ['scope-negative'], required: true },
    ...[
      'clean-room', 'schema', 'architecture', 'typecheck', 'repository', 'android-contract',
      'unity-editmode', 'unity-playmode', 'android-device', 'firebase', 'repository-evidence',
    ].map((id) => ({ id, command: 'printf PASS', canaryIds: [`${id}-negative`], required: true })),
    ...[
      ['playwright-web', 'web-runner'],
      ['perfetto', 'device-lab'],
      ['locale', 'locale-catalog'],
      ['release-manifest', 'release-candidate'],
    ].map(([id, blockedPrerequisite]) => ({
      id,
      command: null,
      canaryIds: [`${id}-blocked`],
      required: false,
      blockedPrerequisite,
      requiredBindings: id === 'release-manifest' ? ['rcSha256'] : [],
    })),
  ];
}

beforeAll(async () => {
  root = await mkdtemp(resolve(tmpdir(), 'warrior-harness-runner-'));
  await mkdir(resolve(root, '.git'));
  await writeFile(resolve(root, 'package.json'), '{}\n');
  await writeFile(resolve(root, '.gitignore'), '.omo/\n');
  const git = Bun.spawnSync(['git', 'init'], { cwd: root });
  expect(git.exitCode).toBe(0);
  Bun.spawnSync(['git', 'config', 'user.email', 'qa@example.invalid'], { cwd: root });
  Bun.spawnSync(['git', 'config', 'user.name', 'QA'], { cwd: root });
  Bun.spawnSync(['git', 'add', 'package.json', '.gitignore'], { cwd: root });
  Bun.spawnSync(['git', 'commit', '-m', 'fixture'], { cwd: root });
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

test('Given a unique attempt when the harness runs then it atomically publishes verified index HTML and canaries', async () => {
  const result = await runHarness({ root, session: 'session', goal: 'goal', attempt: 1, registry: registry() });
  expect((await lstat(result.finalRoot)).isDirectory()).toBeTrue();
  expect(JSON.parse(await readFile(resolve(result.finalRoot, 'harness-index.json'), 'utf8')).reports).toHaveLength(16);
  expect(await readFile(resolve(result.finalRoot, 'harness-index.html'), 'utf8')).toContain('<table>');
  expect(JSON.parse(await readFile(resolve(result.finalRoot, 'canary-matrix.json'), 'utf8'))).toHaveLength(16);
  await expect(lstat(`${result.finalRoot}.staging-${process.pid}`)).rejects.toMatchObject({ code: 'ENOENT' });
});

test('Given a preexisting attempt when the harness runs then it rejects overwrite', async () => {
  await expect(runHarness({ root, session: 'session', goal: 'goal', attempt: 1, registry: registry() })).rejects.toThrow('attempt output already exists');
});

test('Given a failing family when the harness runs then it publishes a truthful FAIL report', async () => {
  const result = await runHarness({ root, session: 'session', goal: 'goal', attempt: 2, registry: registry('exit 7') });
  const index = JSON.parse(await readFile(resolve(result.finalRoot, 'harness-index.json'), 'utf8'));
  expect(index.reports.find(({ familyId }) => familyId === 'scope')).toMatchObject({ status: 'FAIL', exitCode: 7 });
});

test('Given a symlink output when the harness runs then it rejects the attempt root', async () => {
  const target = resolve(root, 'target');
  await mkdir(target);
  const finalRoot = resolve(root, '.omo/evidence/implementation/session/goal/a3/task-8');
  await mkdir(resolve(finalRoot, '..'), { recursive: true });
  await symlink(target, finalRoot);
  await expect(runHarness({ root, session: 'session', goal: 'goal', attempt: 3, registry: registry() })).rejects.toThrow('attempt output already exists');
});

test('Given a family changes Git-visible paths when the harness finishes then the index binds the final tree', async () => {
  const result = await runHarness({
    root,
    session: 'session',
    goal: 'goal',
    attempt: 4,
    registry: registry('touch generated.txt; printf PASS'),
  });
  const index = JSON.parse(await readFile(resolve(result.finalRoot, 'harness-index.json'), 'utf8'));
  expect(index.dirtyStateSha256).toBe(treeBinding(root).dirtyStateSha256);
});
