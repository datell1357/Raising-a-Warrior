import { relative, resolve } from 'node:path';
import { installAab, validateAab } from './android-artifacts.mjs';
import { captureScreenshotMatrix, clearLogcat, deviceState, startPixel6a, teardownDevice, writeLogcat } from './android-device.mjs';
import { prepareEvidence, readJson, runLogged, tools, writeJson } from './qa-common.mjs';

export async function runAndroidQualification(root, variant) {
  if (variant !== 'dev') throw new Error(`Android qualification only supports dev, received ${variant ?? 'none'}.`);
  const evidence = await prepareEvidence(root);
  const project = resolve(root, 'client/WarriorRaising');
  let device = null;
  try {
    await runLogged(resolve(evidence, 'unity-aab-build-command.log'), tools.unity, [
      '-batchmode', '-nographics', '-quit', '-projectPath', project, '-buildTarget', 'Android',
      '-executeMethod', 'T6AndroidBuild.BuildDev', '-logFile', resolve(evidence, 'unity-aab-build.log'),
    ], { cwd: root, timeout: 1_800_000 });
    const buildReport = await readJson(resolve(project, 'android/build/build-report.json'));
    if (buildReport.result !== 'Succeeded' || buildReport.buildTarget !== 'Android') throw new Error(`Unexpected Unity BuildReport: ${JSON.stringify(buildReport)}.`);
    const built = await validateAab(root, evidence);
    device = await startPixel6a();
    clearLogcat();
    const apks = await installAab(root, evidence, built);
    const screenshots = await captureScreenshotMatrix(evidence);
    const logcat = await writeLogcat(evidence);
    const receipt = {
      variant,
      buildReport,
      artifacts: { ...built.artifacts, apks },
      evidence: relative(root, evidence),
      device: { ...deviceState(), package: 'com.warriorraising.dev', activity: screenshots.at(-1).state.activity },
      overlayPolicy: {
        checkedPerTarget: true,
        dismissalTrigger: 'fullscreen-title-and-confirmation-labels',
        coordinateSource: 'confirmation-bounds-center',
        appDataCleared: false,
      },
      screenshots: screenshots.map(({ path, ...capture }) => ({ ...capture, path: relative(root, path) })),
      logcat,
    };
    await writeJson(resolve(evidence, 'android-qualification.json'), receipt);
    process.stdout.write(`ANDROID_QUALIFICATION_EVIDENCE=${receipt.evidence}\n`);
    return receipt;
  } finally {
    if (device) teardownDevice();
  }
}
