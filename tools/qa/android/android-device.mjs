import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { QualificationError, execute, tools } from './qa-common.mjs';

const packageId = 'com.warriorraising.dev';
const activityNeedle = 'com.warriorraising.dev';
const fatalPattern = /(FATAL EXCEPTION|ANR in com\.warriorraising\.dev|Fatal signal)/;
const splashDismissalWaitMs = 4_000;
const stableFrameIntervalMs = 750;

function text(command, args, timeout = 60_000) {
  const result = execute(command, args, { encoding: 'utf8', timeout });
  if (result.error || result.status !== 0) throw new QualificationError(`${command} failed: ${result.error ?? result.stderr}`);
  return result.stdout;
}

function adb(args, timeout) {
  return text(tools.adb, args, timeout);
}

function pause(milliseconds) {
  return new Promise((resolvePause) => setTimeout(resolvePause, milliseconds));
}

function attribute(node, name) {
  return new RegExp(`${name}="([^"]*)"`).exec(node)?.[1] ?? '';
}

export function parseFullscreenTutorial(xml) {
  const nodes = [...xml.matchAll(/<node\b[^>]*\/?>/g)].map((match) => match[0]);
  const tutorialDetected = nodes.some((node) => attribute(node, 'text') === '전체 화면 모드');
  const confirmation = nodes.find((node) => attribute(node, 'text') === '확인');
  if (!tutorialDetected || !confirmation) return { detected: false };
  const bounds = /^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/.exec(attribute(confirmation, 'bounds'));
  if (!bounds) throw new QualificationError('Malformed Android bounds for immersive tutorial confirmation.');
  const confirmBounds = {
    left: Number(bounds[1]),
    top: Number(bounds[2]),
    right: Number(bounds[3]),
    bottom: Number(bounds[4]),
  };
  return {
    detected: true,
    confirmBounds,
    confirmCenter: {
      x: Math.round((confirmBounds.left + confirmBounds.right) / 2),
      y: Math.round((confirmBounds.top + confirmBounds.bottom) / 2),
    },
  };
}

export function findShellReadyMarker(logcat, target) {
  for (const line of logcat.split('\n').reverse()) {
    const match = /^\s*(\d+(?:\.\d+)?)\s+.*T6_SHELL_READY width=(\d+) height=(\d+)\s*$/.exec(line);
    if (!match) continue;
    const width = Number(match[2]);
    const height = Number(match[3]);
    if (width === target.width && height === target.height) return { timestamp: match[1], width, height };
  }
  return null;
}

export function findStableConsecutiveFrames(frameHashes) {
  for (let index = 1; index < frameHashes.length; index += 1) {
    if (frameHashes[index] === frameHashes[index - 1]) {
      return { firstIndex: index - 1, secondIndex: index, hash: frameHashes[index] };
    }
  }
  return null;
}

export async function startPixel6a() {
  const current = adb(['devices']);
  if (current.includes('\tdevice')) {
    const avd = adb(['emu', 'avd', 'name']).split('\n')[0].trim();
    if (avd !== 'Pixel_6a') throw new QualificationError(`Connected emulator is ${avd}, expected Pixel_6a.`);
    return { started: false, pid: null, avd };
  }
  const emulator = spawn(tools.emulator, ['-avd', 'Pixel_6a', '-no-snapshot-save', '-no-boot-anim'], {
    detached: true,
    stdio: 'ignore',
  });
  emulator.unref();
  for (let attempt = 0; attempt < 90; attempt += 1) {
    await pause(2_000);
    try {
      if (adb(['shell', 'getprop', 'sys.boot_completed']).trim() === '1') return { started: true, pid: emulator.pid ?? null, avd: 'Pixel_6a' };
    } catch {}
  }
  throw new QualificationError('Pixel_6a did not complete boot within 180 seconds.');
}

export function deviceState() {
  const properties = adb(['shell', 'getprop']);
  const activity = adb(['shell', 'dumpsys', 'activity', 'activities']);
  const window = adb(['shell', 'dumpsys', 'window']);
  return {
    abi: /\[ro\.product\.cpu\.abi\]: \[(.+)\]/.exec(properties)?.[1] ?? null,
    api: /\[ro\.build\.version\.sdk\]: \[(.+)\]/.exec(properties)?.[1] ?? null,
    avd: adb(['emu', 'avd', 'name']).split('\n')[0].trim(),
    wmSize: adb(['shell', 'wm', 'size']).trim(),
    wmDensity: adb(['shell', 'wm', 'density']).trim(),
    insets: adb(['shell', 'dumpsys', 'window', 'insets']).trim(),
    package: adb(['shell', 'pm', 'path', packageId]).trim(),
    activity: {
      focused: window.includes(activityNeedle) && /(mCurrentFocus=.*com\.warriorraising\.dev|mFocusedApp=.*com\.warriorraising\.dev|topDisplayFocusedRootTask=.*com\.warriorraising\.dev)/.test(window),
      resumed: /(topResumedActivity|mResumedActivity|Resumed:|ResumedActivity:)[^\n]*com\.warriorraising\.dev/.test(activity),
      raw: activity.trim(),
    },
  };
}

export async function launchPackage() {
  adb(['shell', 'monkey', '-p', packageId, '1']);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await pause(1_000);
    const state = deviceState();
    if (state.package && state.activity.focused && state.activity.resumed) return state;
  }
  throw new QualificationError(`Package launch did not reach focused/resumed state: ${JSON.stringify(deviceState().activity)}`);
}

function dumpCurrentUi() {
  return adb(['exec-out', 'uiautomator', 'dump', '/dev/tty']);
}

async function dismissFullscreenTutorial() {
  const initial = parseFullscreenTutorial(dumpCurrentUi());
  if (!initial.detected) return { initialDetected: false, dismissed: false, atCaptureDetected: false };
  adb(['shell', 'input', 'tap', String(initial.confirmCenter.x), String(initial.confirmCenter.y)]);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await pause(500);
    if (!parseFullscreenTutorial(dumpCurrentUi()).detected) {
      return { initialDetected: true, dismissed: true, confirmBounds: initial.confirmBounds, confirmCenter: initial.confirmCenter, atCaptureDetected: false };
    }
  }
  throw new QualificationError('Android immersive tutorial remained visible after accessible confirmation tap.');
}

async function waitForShellReady(target) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const marker = findShellReadyMarker(adb(['logcat', '-d', '-v', 'epoch']), target);
    if (marker) return marker;
    await pause(500);
  }
  throw new QualificationError(`T6 shell readiness marker did not appear for ${target.width}x${target.height}.`);
}

function pngDimensions(data) {
  const signature = '89504e470d0a1a0a';
  if (data.subarray(0, 8).toString('hex') !== signature) throw new QualificationError('Device screenshot is not a PNG.');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

function screenshotFrame(target) {
  const image = execute(tools.adb, ['exec-out', 'screencap', '-p'], { encoding: null, timeout: 60_000 });
  if (image.error || image.status !== 0) throw new QualificationError(`Screenshot failed: ${image.error ?? image.stderr.toString('utf8')}`);
  const dimensions = pngDimensions(image.stdout);
  if (dimensions.width !== target.width || dimensions.height !== target.height) throw new QualificationError(`Screenshot dimensions drifted from ${target.size}.`);
  return {
    data: image.stdout,
    hash: createHash('sha256').update(image.stdout).digest('hex'),
    capturedAt: new Date().toISOString(),
  };
}

async function stableScreenshot(target) {
  const frames = [];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const frame = screenshotFrame(target);
    frames.push(frame);
    const stable = findStableConsecutiveFrames(frames.map(({ hash }) => hash));
    if (stable) return { accepted: frame, frames, stable };
    await pause(stableFrameIntervalMs);
  }
  throw new QualificationError(`No two consecutive stable screenshots were observed for ${target.size}.`);
}

function currentFatalState() {
  const logcat = adb(['logcat', '-d', '-t', '1500']);
  return { detected: fatalPattern.test(logcat), checkedAt: new Date().toISOString() };
}

export async function captureScreenshotMatrix(evidence) {
  const targets = [
    { label: '20x9', size: '1080x2400', width: 1080, height: 2400 },
    { label: '19_5x9', size: '1080x2340', width: 1080, height: 2340 },
    { label: '16x9', size: '1080x1920', width: 1080, height: 1920 },
  ];
  const captures = [];
  try {
    for (const target of targets) {
      adb(['shell', 'wm', 'size', target.size]);
      clearLogcat();
      adb(['shell', 'am', 'force-stop', packageId]);
      await launchPackage();
      const overlay = await dismissFullscreenTutorial();
      const marker = await waitForShellReady(target);
      await pause(splashDismissalWaitMs);
      const overlayAtCapture = parseFullscreenTutorial(dumpCurrentUi());
      if (overlayAtCapture.detected) throw new QualificationError('Android immersive tutorial returned before screenshot capture.');
      const stable = await stableScreenshot(target);
      const state = deviceState();
      const fatalState = currentFatalState();
      if (!state.activity.focused || !state.activity.resumed) throw new QualificationError(`Product activity was not focused and resumed at capture: ${JSON.stringify(state.activity)}`);
      if (fatalState.detected) throw new QualificationError(`Android logcat contains a fatal application failure before ${target.size} capture.`);
      const path = resolve(evidence, `android-${target.label}.png`);
      await writeFile(path, stable.accepted.data);
      captures.push({
        label: target.label,
        path,
        dimensions: target.size,
        sha256: stable.accepted.hash,
        captureState: 'shell',
        capturedAt: stable.accepted.capturedAt,
        overlay: { ...overlay, atCaptureDetected: overlayAtCapture.detected },
        readiness: { markerTimestamp: marker.timestamp, width: marker.width, height: marker.height, splashDismissalWaitMs },
        stability: {
          requiredConsecutiveFrames: 2,
          intervalMs: stableFrameIntervalMs,
          frameHashes: stable.frames.map(({ hash }) => hash),
          acceptedPair: stable.stable,
        },
        fatalState,
        state,
      });
    }
  } finally {
    adb(['shell', 'wm', 'size', 'reset']);
    adb(['shell', 'wm', 'density', 'reset']);
  }
  return captures;
}

export async function writeLogcat(evidence) {
  const logcat = adb(['logcat', '-d', '-t', '1500']);
  await writeFile(resolve(evidence, 'logcat.txt'), logcat, 'utf8');
  if (fatalPattern.test(logcat)) {
    throw new QualificationError('Android logcat contains a fatal application failure.');
  }
  return 'no fatal exception, ANR, or fatal signal for com.warriorraising.dev';
}

export async function writeTestRunnerLogcat(evidence) {
  const content = adb(['logcat', '-d', '-t', '1500']);
  const path = resolve(evidence, 'playmode-logcat.txt');
  await writeFile(path, content, 'utf8');
  return { path, content };
}

export function clearLogcat() {
  adb(['logcat', '-c']);
}

export function teardownDevice() {
  try { adb(['shell', 'am', 'force-stop', packageId]); } catch {}
  try { adb(['emu', 'kill']); } catch {}
  try { adb(['kill-server']); } catch {}
}
