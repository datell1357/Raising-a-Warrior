import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { clearLogcat, startPixel6a, teardownDevice, writeTestRunnerLogcat } from './android-device.mjs';
import { execute, hashFile, QualificationError, runLogged, tools } from './qa-common.mjs';

const playModeLeaves = [
  'Warrior.Tests.PlayMode.BootstrapShellPlayModeTests.BootstrapShell_whenInitialized_inPlayMode_remainsEmpty',
  'Warrior.Tests.PlayMode.BootstrapShellPlayModeTests.S_LVWHIB_NS_SESSION_RECONNECT_S_TGKDXL_preserveIdentityProgress',
];

export function restoreAssetVisibility(project) {
  const roots = [resolve(project, 'Assets'), resolve(project, 'Library/PackageCache')].filter(existsSync);
  for (const root of roots) {
    const result = execute('/usr/bin/chflags', ['-R', 'nohidden', root]);
    if (result.error || result.status !== 0) {
      throw new QualificationError(`Unable to restore Unity source visibility: ${result.error ?? result.stderr}`);
    }
  }
}

function attributes(source) {
  return Object.fromEntries([...source.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value]));
}

function requiredElement(xml, expression, label) {
  const match = expression.exec(xml);
  if (!match) throw new QualificationError(`PlayMode XML is missing ${label}.`);
  return attributes(match[1]);
}

function requiredCount(attributesValue, name) {
  const value = Number(attributesValue[name]);
  if (!Number.isInteger(value)) throw new QualificationError(`PlayMode XML ${name} is invalid.`);
  return value;
}

function requireExact(value, expected, label) {
  if (value !== expected) throw new QualificationError(`PlayMode ${label} was ${JSON.stringify(value)}, expected ${JSON.stringify(expected)}.`);
}

function requireInvocationTime(value, label, startedAt, finishedAt) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp < startedAt.getTime() || timestamp > finishedAt.getTime()) {
    throw new QualificationError(`PlayMode ${label} is outside the current invocation.`);
  }
}

export function createPlayModeRunDirectory(root, startedAt = new Date(), processId = process.pid, nonce = randomUUID()) {
  const timestamp = startedAt.toISOString().replace(/[-:.]/g, '');
  return resolve(root, '.omo/evidence/implementation/local-20260728/mvp-t6/a1/task-6/lanes/l6/playmode-runs', `${timestamp}-${processId}-${nonce}`);
}

export function assertNoTestRunnerFatal(logcat) {
  if (/(FATAL EXCEPTION|Fatal signal|ANR in com\.UnityTestRunner\.UnityTestRunner)/.test(logcat)) {
    throw new QualificationError('Android test-runner logcat contains a fatal failure.');
  }
}

export function waitForChildWithin(child, timeout, lifecycle = {}) {
  const setTimer = lifecycle.setTimer ?? setTimeout;
  const clearTimer = lifecycle.clearTimer ?? clearTimeout;
  const killProcessGroup = lifecycle.killProcessGroup ?? ((pid, signal) => process.kill(-pid, signal));
  const grace = lifecycle.grace ?? 5_000;
  return new Promise((resolveChild, rejectChild) => {
    let completed = false;
    let termination = null;
    let terminationError = null;
    const finish = (callback, value) => {
      if (completed) return;
      completed = true;
      clearTimer(deadline);
      if (termination !== null) clearTimer(termination);
      child.removeListener('error', onError);
      child.removeListener('close', onClose);
      callback(value);
    };
    const terminate = (error) => {
      if (termination !== null || completed) return;
      try { killProcessGroup(child.pid, 'SIGTERM'); } catch (killError) {
        finish(rejectChild, new QualificationError(`${error.message}; SIGTERM failed: ${killError instanceof Error ? killError.message : String(killError)}.`));
        return;
      }
      terminationError = error;
      termination = setTimer(() => {
        try { killProcessGroup(child.pid, 'SIGKILL'); } catch (killError) {
          finish(rejectChild, new QualificationError(`${error.message}; SIGKILL failed: ${killError instanceof Error ? killError.message : String(killError)}.`));
        }
      }, grace);
    };
    const onError = (error) => terminate(error instanceof QualificationError ? error : new QualificationError(`Unity PlayMode child error: ${error.message}`));
    const onClose = (status, signal) => terminationError === null
      ? finish(resolveChild, { status, signal })
      : finish(rejectChild, new QualificationError(`${terminationError.message}; terminated with ${signal ?? 'SIGTERM'}.`));
    const deadline = setTimer(() => terminate(new QualificationError('Unity PlayMode process exceeded 1800 seconds.')), timeout);
    child.once('error', onError);
    child.once('close', onClose);
  });
}

export function assertPlayModeSourceContract(source) {
  for (const required of [
    '[UnityPlatform(RuntimePlatform.Android)]',
    'BootstrapShell_whenInitialized_inPlayMode_remainsEmpty',
    'Assert.That(initialization.Identity, Is.EqualTo(ShellIdentity.Empty));',
    'Assert.That(initialization.Lifecycle, Is.EqualTo(ShellLifecycle.Empty));',
    'S_LVWHIB_NS_SESSION_RECONNECT_S_TGKDXL_preserveIdentityProgress',
    'Assert.That(restart.State, Is.EqualTo(AccountEntryState.Ready));',
    'Assert.That(restart.Session.Uid, Is.EqualTo(firstLaunch.Session.Uid));',
    'Assert.That(restart.Session.IsAnonymous, Is.False);',
    'Assert.That(restart.Progress.Marker, Is.EqualTo(firstLaunch.Progress.Marker));',
  ]) if (!source.includes(required)) throw new QualificationError(`PlayMode source contract is missing ${required}.`);
}

export function assertPlayModeEvidence({ xml, log, resultPath, startedAt, finishedAt, resultMtime }) {
  if (xml === null) throw new QualificationError('PlayMode result XML is missing.');
  if (resultMtime < startedAt || resultMtime > finishedAt) throw new QualificationError('PlayMode result XML is not fresh for this invocation.');
  if (!log.includes(`Saving results to: ${resultPath}`)) throw new QualificationError('Unity did not save results to the current PlayMode path.');
  if (!/installed to device/.test(log) || !log.includes('Launching application "com.UnityTestRunner.UnityTestRunner/')) {
    throw new QualificationError('Unity log does not establish Android test package installation and launch.');
  }

  const root = requiredElement(xml, /<test-run\b([^>]*)>/, 'test-run');
  const counts = Object.fromEntries(['total', 'passed', 'failed', 'skipped', 'inconclusive'].map((name) => [name, requiredCount(root, name)]));
  if (counts.total !== 2 || counts.passed !== 2 || counts.failed !== 0 || counts.skipped !== 0 || counts.inconclusive !== 0 || root.result !== 'Passed') {
    throw new QualificationError(`PlayMode XML counts were ${JSON.stringify(counts)} with result ${root.result}.`);
  }

  const assembly = requiredElement(xml, /<test-suite\b(?=[^>]*\btype="Assembly")([^>]*)>/, 'test assembly');
  requireExact(assembly.name, 'Tests.PlayMode.dll', 'assembly');
  requireExact(assembly.fullname, '/system/bin/Tests.PlayMode.dll', 'assembly path');
  requireExact(assembly.result, 'Passed', 'assembly result');
  requireInvocationTime(assembly['start-time'], 'assembly start time', startedAt, finishedAt);
  requireInvocationTime(assembly['end-time'], 'assembly end time', startedAt, finishedAt);
  const appDomain = /<property\b(?=[^>]*\bname="_APPDOMAIN")([^>]*)>/.exec(xml);
  const platform = /<property\b(?=[^>]*\bname="platform")([^>]*)>/.exec(xml);
  const editorOnly = /<property\b(?=[^>]*\bname="EditorOnly")([^>]*)>/.exec(xml);
  if (!appDomain || !platform || !editorOnly) throw new QualificationError('PlayMode XML is missing Android assembly properties.');
  requireExact(attributes(appDomain[1]).value, 'IL2CPP Root Domain', 'app domain');
  requireExact(attributes(platform[1]).value, 'PlayMode', 'platform');
  requireExact(attributes(editorOnly[1]).value, 'False', 'EditorOnly');
  const leaves = [...xml.matchAll(/<test-case\b([^>]*)>/g)].map((match) => requiredElement(match[0], /<test-case\b([^>]*)>/, 'test leaf'));
  if (leaves.length !== playModeLeaves.length) throw new QualificationError(`PlayMode XML contained ${leaves.length} test leaves.`);
  for (const [index, expected] of playModeLeaves.entries()) {
    requireExact(leaves[index].fullname, expected, `test leaf ${index + 1}`);
    requireExact(leaves[index].result, 'Passed', `test leaf ${index + 1} result`);
  }
  return { counts, assembly: assembly.name, leaves: leaves.map((leaf) => leaf.fullname), resultPath };
}

export async function runUnityTests(root, evidence, mode) {
  const project = resolve(root, 'client/WarriorRaising');
  restoreAssetVisibility(project);
  const startedAt = new Date();
  const runDirectory = mode === 'playmode' ? createPlayModeRunDirectory(root, startedAt) : resolve(evidence, 'editmode-runs', `${startedAt.toISOString().replace(/[-:.]/g, '')}-${process.pid}-${randomUUID()}`);
  const resultPath = resolve(runDirectory, `${mode}-results.xml`);
  const logPath = resolve(runDirectory, `${mode}.log`);
  await mkdir(runDirectory, { recursive: true });
  let emulator = null;
  let testRunnerLogcat = null;
  try {
    if (mode === 'playmode') {
      emulator = await startPixel6a();
      clearLogcat();
    }
    const args = [
      '-batchmode', '-nographics', '-projectPath', project,
    ];
    if (mode === 'playmode') args.push('-buildTarget', 'Android');
    args.push(
      '-runTests',
      '-testPlatform', mode === 'editmode' ? 'EditMode' : 'Android',
      '-testResults', resultPath,
      '-logFile', logPath,
    );
    if (mode === 'playmode') args.push('-assemblyNames', 'Tests.PlayMode');
    if (mode === 'playmode') {
      await writeFile(resolve(runDirectory, `${mode}-command.log`), `$ ${[tools.unity, ...args].map((part) => JSON.stringify(part)).join(' ')}\n`, 'utf8');
      const unity = spawn(tools.unity, args, { cwd: root, stdio: 'ignore', detached: true });
      const outcome = await waitForChildWithin(unity, 1_800_000);
      if (outcome.status !== 0) throw new QualificationError(`Unity PlayMode process failed with status ${outcome.status ?? 'none'} and signal ${outcome.signal ?? 'none'}.`);
    } else {
      await runLogged(resolve(runDirectory, `${mode}-command.log`), tools.unity, args, { cwd: root, timeout: 1_800_000 });
    }
    const finishedAt = new Date();
    const xml = await readFile(resultPath, 'utf8').catch((error) => error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT' ? null : Promise.reject(error));
    const resultDetails = xml === null ? null : await stat(resultPath);
    const log = await readFile(logPath, 'utf8');
    if (/error CS|Scripts have compiler errors/.test(log)) throw new QualificationError('Unity log contains compiler errors.');
    if (mode === 'playmode') {
      testRunnerLogcat = await writeTestRunnerLogcat(runDirectory);
      assertNoTestRunnerFatal(testRunnerLogcat.content);
      assertPlayModeSourceContract(await readFile(resolve(project, 'Assets/Warrior/Tests/PlayMode/BootstrapShellPlayModeTests.cs'), 'utf8'));
      const result = assertPlayModeEvidence({ xml, log, resultPath, startedAt, finishedAt, resultMtime: resultDetails?.mtime ?? new Date(0) });
      return {
        ...result,
        evidence: relative(root, runDirectory),
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        result: { ...(await hashFile(resultPath)), mtime: resultDetails.mtime.toISOString() },
        logcat: { ...(await hashFile(testRunnerLogcat.path)), path: relative(root, testRunnerLogcat.path) },
      };
    }
    if (xml === null) throw new QualificationError('EditMode result XML is missing.');
    const counts = requiredElement(xml, /<test-run\b([^>]*)>/, 'test-run');
    if (requiredCount(counts, 'total') !== 28 || requiredCount(counts, 'passed') !== 28 || requiredCount(counts, 'failed') !== 0) throw new QualificationError('EditMode XML counts are invalid.');
    return { counts: { total: 28, passed: 28, failed: 0 }, evidence: relative(root, runDirectory) };
  } finally {
    if (mode === 'playmode' && emulator !== null && testRunnerLogcat === null) {
      testRunnerLogcat = await writeTestRunnerLogcat(runDirectory);
      assertNoTestRunnerFatal(testRunnerLogcat.content);
    }
    if (emulator?.started) teardownDevice();
  }
}
