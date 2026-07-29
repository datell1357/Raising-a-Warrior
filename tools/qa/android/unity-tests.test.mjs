import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'bun:test';
import { assertNoTestRunnerFatal, assertPlayModeEvidence, assertPlayModeSourceContract, createPlayModeRunDirectory, restoreAssetVisibility, waitForChildWithin } from './unity-tests.mjs';

const startedAt = new Date('2026-07-29T10:00:00.000Z');
const finishedAt = new Date('2026-07-29T10:00:01.000Z');
const runnerSource = readFileSync(new URL('./unity-tests.mjs', import.meta.url), 'utf8');
const source = [
  'using NUnit.Framework;',
  'using UnityEngine;',
  'using UnityEngine.TestTools;',
  '[UnityPlatform(RuntimePlatform.Android)]',
  'public sealed class BootstrapShellPlayModeTests',
  '{',
  '  [UnityTest]',
  '  public IEnumerator BootstrapShell_whenInitialized_inPlayMode_remainsEmpty()',
  '  {',
  '    Assert.That(initialization.Identity, Is.EqualTo(ShellIdentity.Empty));',
  '    Assert.That(initialization.Lifecycle, Is.EqualTo(ShellLifecycle.Empty));',
  '  }',
  '  [UnityTest]',
  '  public IEnumerator S_LVWHIB_NS_SESSION_RECONNECT_S_TGKDXL_preserveIdentityProgress()',
  '  {',
  '    Assert.That(restart.State, Is.EqualTo(AccountEntryState.Ready));',
  '    Assert.That(restart.Session.Uid, Is.EqualTo(firstLaunch.Session.Uid));',
  '    Assert.That(restart.Session.IsAnonymous, Is.False);',
  '    Assert.That(restart.Progress.Marker, Is.EqualTo(firstLaunch.Progress.Marker));',
  '  }',
  '  [UnityTest]',
  '  public IEnumerator S_LVWHIB_BootstrapScene_entersGuestMain()',
  '  {',
  '    Assert.That(label.text, Is.EqualTo("Guest active"));',
  '    Assert.That(PlayerPrefs.HasKey(DeviceIdentityAuthAdapter.UidKey), Is.True);',
  '  }',
  '}',
].join('\n');

test('Given recursively hidden Unity assets when tests start then visibility restoration makes every source discoverable', () => {
  const project = mkdtempSync(join(tmpdir(), 'warrior-unity-visibility-'));
  const nested = join(project, 'Assets', 'Warrior', 'Tests');
  const sourcePath = join(nested, 'Example.cs');
  const packageRoot = join(project, 'Library', 'PackageCache', 'com.unity.example');
  const packageSource = join(packageRoot, 'Runtime', 'ExamplePackage.cs');
  mkdirSync(nested, { recursive: true });
  mkdirSync(join(packageRoot, 'Runtime'), { recursive: true });
  writeFileSync(sourcePath, 'public sealed class Example {}\n');
  writeFileSync(packageSource, 'public sealed class ExamplePackage {}\n');
  try {
    const hide = spawnSync('/usr/bin/chflags', ['hidden', join(project, 'Assets'), nested, sourcePath, packageRoot, packageSource]);
    expect(hide.status).toBe(0);
    restoreAssetVisibility(project);
    const result = spawnSync('/usr/bin/find', [join(project, 'Assets'), join(project, 'Library', 'PackageCache'), '-flags', '+hidden', '-print'], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test('Given Android PlayMode when Unity starts then the runner selects Android before script compilation', () => {
  const buildTarget = runnerSource.indexOf("args.push('-buildTarget', 'Android')");
  const runTests = runnerSource.indexOf("'-runTests'");
  expect(buildTarget).toBeGreaterThan(-1);
  expect(buildTarget).toBeLessThan(runTests);
});

test('Given externally hidden Unity assets when tests start then the runner restores visibility before launching Unity', () => {
  expect(runnerSource).toMatch(/restoreAssetVisibility\(project\);[\s\S]*spawn\(tools\.unity|restoreAssetVisibility\(project\);[\s\S]*runLogged/);
  expect(runnerSource).toContain("execute('/usr/bin/chflags', ['-R', 'nohidden'");
});

function xml(overrides = {}) {
  const values = {
    total: '3', passed: '3', failed: '0', skipped: '0', inconclusive: '0', result: 'Passed',
    assembly: 'Tests.PlayMode.dll', platform: 'PlayMode', editorOnly: 'False',
    leaf: 'Warrior.Tests.PlayMode.BootstrapShellPlayModeTests.BootstrapShell_whenInitialized_inPlayMode_remainsEmpty',
    identityLeaf: 'Warrior.Tests.PlayMode.BootstrapShellPlayModeTests.S_LVWHIB_NS_SESSION_RECONNECT_S_TGKDXL_preserveIdentityProgress',
    guestMainLeaf: 'Warrior.Tests.PlayMode.BootstrapShellPlayModeTests.S_LVWHIB_BootstrapScene_entersGuestMain',
    ...overrides,
  };
  return `<test-run result="${values.result}" total="${values.total}" passed="${values.passed}" failed="${values.failed}" skipped="${values.skipped}" inconclusive="${values.inconclusive}" start-time="2026-07-29 10:00:00Z" end-time="2026-07-29 10:00:01Z"><test-suite type="Assembly" name="${values.assembly}" fullname="/system/bin/${values.assembly}" result="Passed" start-time="2026-07-29 10:00:00Z" end-time="2026-07-29 10:00:01Z"><properties><property name="_APPDOMAIN" value="IL2CPP Root Domain"/><property name="platform" value="${values.platform}"/><property name="EditorOnly" value="${values.editorOnly}"/></properties><test-case fullname="${values.leaf}" result="Passed"/><test-case fullname="${values.guestMainLeaf}" result="Passed"/><test-case fullname="${values.identityLeaf}" result="Passed"/></test-suite></test-run>`;
}

test('Given PlayMode evidence when its directory is created then it is unique to the invocation', () => {
  const first = createPlayModeRunDirectory('/repo', startedAt, 42, 'first');
  const second = createPlayModeRunDirectory('/repo', startedAt, 42, 'second');

  expect(first).not.toBe(second);
  expect(first).toContain('playmode-runs/20260729T100000000Z-42-first');
});

test('Given fresh exact Android XML when PlayMode evidence is verified then it returns the Android receipt', () => {
  const receipt = assertPlayModeEvidence({
    xml: xml(),
    log: 'Saving results to: /repo/.omo/evidence/playmode-runs/current/playmode-results.xml\nApplication "player.aab" installed to device\nLaunching application "com.UnityTestRunner.UnityTestRunner/com.unity3d.player.UnityPlayerActivity"',
    resultPath: '/repo/.omo/evidence/playmode-runs/current/playmode-results.xml',
    startedAt,
    finishedAt,
    resultMtime: finishedAt,
  });

  expect(receipt.counts).toEqual({ total: 3, passed: 3, failed: 0, skipped: 0, inconclusive: 0 });
  expect(receipt.assembly).toBe('Tests.PlayMode.dll');
  expect(receipt.leaves).toEqual([
    'Warrior.Tests.PlayMode.BootstrapShellPlayModeTests.BootstrapShell_whenInitialized_inPlayMode_remainsEmpty',
    'Warrior.Tests.PlayMode.BootstrapShellPlayModeTests.S_LVWHIB_BootstrapScene_entersGuestMain',
    'Warrior.Tests.PlayMode.BootstrapShellPlayModeTests.S_LVWHIB_NS_SESSION_RECONNECT_S_TGKDXL_preserveIdentityProgress',
  ]);
});

test('Given stale or missing XML when PlayMode evidence is verified then it is rejected', () => {
  const input = {
    xml: xml(), log: 'Saving results to: /repo/current.xml\nApplication "player.aab" installed to device\nLaunching application "com.UnityTestRunner.UnityTestRunner/com.unity3d.player.UnityPlayerActivity"', resultPath: '/repo/current.xml', startedAt, finishedAt,
  };

  expect(() => assertPlayModeEvidence({ ...input, resultMtime: new Date('2026-07-29T09:59:59.000Z') })).toThrow('fresh');
  expect(() => assertPlayModeEvidence({ ...input, xml: null, resultMtime: finishedAt })).toThrow('missing');
});

test('Given misleading Android XML when PlayMode evidence is verified then identity and runtime drift are rejected', () => {
  const input = {
    log: 'Saving results to: /repo/current.xml\nApplication "player.aab" installed to device\nLaunching application "com.UnityTestRunner.UnityTestRunner/com.unity3d.player.UnityPlayerActivity"', resultPath: '/repo/current.xml', startedAt, finishedAt, resultMtime: finishedAt,
  };

  for (const drift of [
    { total: '0', passed: '0' },
    { skipped: '1' },
    { leaf: 'Other.Test' },
    { identityLeaf: 'Other.IdentityTest' },
    { guestMainLeaf: 'Other.GuestMainTest' },
    { assembly: 'Tests.EditMode.dll' },
    { platform: 'EditMode' },
    { editorOnly: 'True' },
    { result: 'Failed' },
  ]) expect(() => assertPlayModeEvidence({ ...input, xml: xml(drift) })).toThrow();
});

test('Given the Android test source when its identity and assertions drift then the source contract is rejected', () => {
  expect(() => assertPlayModeSourceContract(source)).not.toThrow();
  expect(() => assertPlayModeSourceContract(source.replace('RuntimePlatform.Android', 'RuntimePlatform.WindowsEditor'))).toThrow();
  expect(() => assertPlayModeSourceContract(source.replace('Assert.That(initialization.Lifecycle, Is.EqualTo(ShellLifecycle.Empty));', ''))).toThrow();
  expect(() => assertPlayModeSourceContract(source.replace('S_LVWHIB_NS_SESSION_RECONNECT_S_TGKDXL_preserveIdentityProgress', 'OtherIdentityFlow'))).toThrow();
  expect(() => assertPlayModeSourceContract(source.replace('Assert.That(restart.Session.IsAnonymous, Is.False);', ''))).toThrow();
  expect(() => assertPlayModeSourceContract(source.replace('S_LVWHIB_BootstrapScene_entersGuestMain', 'OtherGuestFlow'))).toThrow();
  expect(() => assertPlayModeSourceContract(source.replace('Assert.That(label.text, Is.EqualTo("Guest active"));', ''))).toThrow();
});

test('Given current test-package logcat when it contains a fatal test-runner event then it is rejected', () => {
  expect(() => assertNoTestRunnerFatal('I/Unity: test passed')).not.toThrow();
  expect(() => assertNoTestRunnerFatal('FATAL EXCEPTION: main\nProcess: com.UnityTestRunner.UnityTestRunner')).toThrow();
});


test('Given a completed Unity child when its deadline is owned then the timeout handle is cleared', async () => {
  const child = new EventEmitter();
  const handles = [];
  const result = waitForChildWithin(child, 1_800_000, { setTimer: (callback) => {
    const handle = { callback, cleared: false };
    handles.push(handle);
    return handle;
  }, clearTimer: (handle) => { handle.cleared = true; } });

  child.emit('close', 0, null);

  await expect(result).resolves.toEqual({ status: 0, signal: null });
  expect(handles).toEqual([{ callback: expect.any(Function), cleared: true }]);
  expect(child.listenerCount('close')).toBe(0);
  expect(child.listenerCount('error')).toBe(0);
});

test('Given a timed out Unity child when it closes after TERM then its process group is terminated before the timeout error', async () => {
  const child = Object.assign(new EventEmitter(), { pid: 42 });
  const timers = [];
  const kills = [];
  const result = waitForChildWithin(child, 1, { setTimer: (callback) => { const timer = { callback, cleared: false }; timers.push(timer); return timer; }, clearTimer: (timer) => { timer.cleared = true; }, killProcessGroup: (pid, signal) => kills.push({ pid, signal }), grace: 1 });
  timers[0].callback();
  child.emit('close', null, 'SIGTERM');
  await expect(result).rejects.toThrow('exceeded 1800 seconds');
  expect(kills).toEqual([{ pid: 42, signal: 'SIGTERM' }]);
  expect(timers.every((timer) => timer.cleared)).toBeTrue();
  expect(child.listenerCount('close')).toBe(0);
});

test('Given a timed out Unity child when it ignores TERM then SIGKILL is escalated and cleanup waits for close', async () => {
  const child = Object.assign(new EventEmitter(), { pid: 43 });
  const timers = [];
  const kills = [];
  const result = waitForChildWithin(child, 1, { setTimer: (callback) => { const timer = { callback, cleared: false }; timers.push(timer); return timer; }, clearTimer: (timer) => { timer.cleared = true; }, killProcessGroup: (pid, signal) => kills.push({ pid, signal }), grace: 1 });
  timers[0].callback();
  timers[1].callback();
  child.emit('close', null, 'SIGKILL');
  await expect(result).rejects.toThrow('exceeded 1800 seconds');
  expect(kills).toEqual([{ pid: 43, signal: 'SIGTERM' }, { pid: 43, signal: 'SIGKILL' }]);
  expect(child.listenerCount('error')).toBe(0);
});

test('Given a Unity child error or failed TERM when cleanup starts then the original failure remains observable without listeners', async () => {
  const child = Object.assign(new EventEmitter(), { pid: 44 });
  const timers = [];
  const errorResult = waitForChildWithin(child, 1, { setTimer: (callback) => { const timer = { callback, cleared: false }; timers.push(timer); return timer; }, clearTimer: (timer) => { timer.cleared = true; }, killProcessGroup: () => {} });
  child.emit('error', new Error('spawn failed'));
  child.emit('close', null, 'SIGTERM');
  await expect(errorResult).rejects.toThrow('spawn failed');
  expect(child.listenerCount('close')).toBe(0);

  const failingChild = Object.assign(new EventEmitter(), { pid: 45 });
  const failedKill = waitForChildWithin(failingChild, 1, { setTimer: (callback) => ({ callback }), clearTimer: () => {}, killProcessGroup: () => { throw new Error('permission denied'); } });
  failingChild.emit('error', new Error('startup failed'));
  await expect(failedKill).rejects.toThrow('startup failed; SIGTERM failed');
  expect(failingChild.listenerCount('error')).toBe(0);
});
