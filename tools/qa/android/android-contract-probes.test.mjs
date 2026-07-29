import { expect, test } from 'bun:test';

test('Given a Unity execution mode when ultra QA probes run then nested package probes are explicitly skipped', async () => {
  process.env.ANDROID_CONTRACT_UNIT_TEST = '1';
  const { runUltraQaProbes, shouldRunPackageCommandProbes } = await import('./test-contract.mjs?execution-mode-probe');

  const probes = runUltraQaProbes({ mode: 'playmode', verifyAndroid: false });
  const packageProbe = probes.find((probe) => probe.label === 'actual-package-command');

  expect(packageProbe).toEqual({
    label: 'actual-package-command',
    status: 'N/A',
    reason: 'Execution modes skip nested package-command probes; structural test:android-contract owns them.',
  });
  expect(shouldRunPackageCommandProbes({ mode: 'playmode', verifyAndroid: false })).toBeFalse();
});

test('Given the structural invocation when ultra QA probes run then package probes remain enabled', async () => {
  process.env.ANDROID_CONTRACT_UNIT_TEST = '1';
  const { shouldRunPackageCommandProbes } = await import('./test-contract.mjs?structural-probe');

  expect(shouldRunPackageCommandProbes({ mode: null, verifyAndroid: false })).toBeTrue();
});

test('Given immutable artifact strings when a live overlay applies then the source map remains unchanged', async () => {
  process.env.ANDROID_CONTRACT_UNIT_TEST = '1';
  const { applyLiveOverlay } = await import('./test-contract.mjs?overlay-copy');
  const files = { 'ProjectSettings/ProjectSettings.asset': 'AndroidTargetSdkVersion: 36', 'android/build/output.json': '{"format":"AAB"}' };
  const overlay = applyLiveOverlay(files, [{ path: 'android/build/output.json', content: '{"format":"APK"}' }]);
  expect(files['android/build/output.json']).toBe('{"format":"AAB"}');
  expect(overlay['android/build/output.json']).toBe('{"format":"APK"}');
});
