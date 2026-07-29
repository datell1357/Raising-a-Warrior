import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from 'bun:test';

const root = resolve(import.meta.dirname, '../../..');
function playModeEvidence(output) {
  const marker = /^PLAYMODE_EVIDENCE=(.+)$/m.exec(output)?.[1];
  if (!marker) throw new Error('PlayMode run did not report fresh evidence.');
  return resolve(root, marker);
}

function androidEvidence(output) {
  const marker = /^ANDROID_QUALIFICATION_EVIDENCE=(.+)$/m.exec(output)?.[1];
  if (!marker) throw new Error('Android qualification did not report fresh evidence.');
  return resolve(root, marker);
}

function run(command, args) {
  return spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 1_800_000 });
}

test('Given the dev variant when Android qualification runs then it emits verified artifacts, device launch, and all screenshot ratios', { timeout: 1_800_000 }, async () => {
  const result = run('bun', ['run', 'verify:android', '--', '--variant', 'dev']);

  expect(result.status).toBe(0);
  expect(result.stderr).not.toContain('T6_ANDROID_SHELL_BUILD_BLOCKED');

  const receipt = JSON.parse(await readFile(resolve(androidEvidence(result.stdout), 'android-qualification.json'), 'utf8'));
  expect(receipt.artifacts.aab.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(receipt.artifacts.symbols.level).toBe('public');
  expect(receipt.artifacts.pad.present).toBeTrue();
  expect(receipt.device.package).toBe('com.warriorraising.dev');
  expect(receipt.device.avd).toBe('Pixel_6a');
  expect(receipt.device.activity.focused).toBeTrue();
  expect(receipt.overlayPolicy).toEqual({
    checkedPerTarget: true,
    dismissalTrigger: 'fullscreen-title-and-confirmation-labels',
    coordinateSource: 'confirmation-bounds-center',
    appDataCleared: false,
  });
  expect(receipt.screenshots.map((capture) => [capture.label, capture.dimensions])).toEqual([
    ['20x9', '1080x2400'],
    ['19_5x9', '1080x2340'],
    ['16x9', '1080x1920'],
  ]);
  for (const capture of receipt.screenshots) {
    expect(capture.captureState).toBe('shell');
    expect(capture.overlay.dismissed).toBe(capture.overlay.initialDetected);
    expect(capture.overlay.atCaptureDetected).toBeFalse();
    expect(capture.readiness.width + 'x' + capture.readiness.height).toBe(capture.dimensions);
    expect(capture.readiness.markerTimestamp).toMatch(/^\d+\.\d+$/);
    expect(capture.readiness.splashDismissalWaitMs).toBeGreaterThanOrEqual(4_000);
    expect(capture.stability.requiredConsecutiveFrames).toBe(2);
    expect(capture.stability.acceptedPair.hash).toBe(capture.sha256);
    expect(capture.stability.frameHashes[capture.stability.acceptedPair.firstIndex]).toBe(capture.sha256);
    expect(capture.stability.frameHashes[capture.stability.acceptedPair.secondIndex]).toBe(capture.sha256);
    expect(capture.fatalState.detected).toBeFalse();
    expect(capture.state.activity.focused).toBeTrue();
    expect(capture.state.activity.resumed).toBeTrue();
  }
});

test('Given the connected Android emulator when PlayMode runs then Unity reports exactly one passing test', { timeout: 1_800_000 }, async () => {
  const result = run('bun', ['run', 'test:unity:playmode']);

  expect(result.status).toBe(0);
  expect(result.stderr).not.toContain('T6_UNITY_TEST_EXECUTION_BLOCKED');

  const xml = await readFile(resolve(playModeEvidence(result.stdout), 'playmode-results.xml'), 'utf8');
  expect(xml).toMatch(/total="1"/);
  expect(xml).toMatch(/passed="1"/);
  expect(xml).toMatch(/failed="0"/);
});
