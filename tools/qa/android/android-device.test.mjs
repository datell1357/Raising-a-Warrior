import { expect, test } from 'bun:test';
import * as androidDevice from './android-device.mjs';

const tutorialXml = `<?xml version="1.0" encoding="UTF-8"?>
<hierarchy rotation="0">
  <node text="전체 화면 모드" bounds="[96,720][984,864]" />
  <node text="확인" clickable="true" bounds="[420,1320][660,1440]" />
</hierarchy>`;

test('T6-ANDROID-RED-001 Given the immersive tutorial XML when parsed then it returns the accessible confirmation center', () => {
  expect(androidDevice.parseFullscreenTutorial(tutorialXml)).toEqual({
    detected: true,
    confirmBounds: { left: 420, top: 1320, right: 660, bottom: 1440 },
    confirmCenter: { x: 540, y: 1380 },
  });
});

test('T6-ANDROID-RED-002 Given shell-only UI XML when parsed then no overlay is reported', () => {
  expect(androidDevice.parseFullscreenTutorial('<hierarchy><node text="" bounds="[0,0][1080,2400]" /></hierarchy>')).toEqual({ detected: false });
});

test('T6-ANDROID-RED-003 Given malformed confirmation bounds when parsed then the overlay is rejected', () => {
  const malformed = tutorialXml.replace('[420,1320][660,1440]', '[420,1320][bad,1440]');

  expect(() => androidDevice.parseFullscreenTutorial(malformed)).toThrow('Malformed Android bounds');
});

test('T6-ANDROID-RED-004 Given logcat with a shell-ready marker when parsed then its timestamp and dimensions are recognized', () => {
  const logcat = '         1753779123.125  1010  1040 I Unity   : T6_SHELL_READY width=1080 height=2400';

  expect(androidDevice.findShellReadyMarker(logcat, { width: 1080, height: 2400 })).toEqual({
    timestamp: '1753779123.125',
    width: 1080,
    height: 2400,
  });
});

test('T6-ANDROID-RED-005 Given a ready marker for another target size when parsed then readiness is not accepted', () => {
  const logcat = '1753779123.125  1010  1040 I Unity   : T6_SHELL_READY width=1080 height=2400';

  expect(androidDevice.findShellReadyMarker(logcat, { width: 1080, height: 2340 })).toBeNull();
});

test('T6-ANDROID-RED-006 Given changing frame hashes when checked then stability requires two consecutive equal frames', () => {
  expect(androidDevice.findStableConsecutiveFrames(['first', 'second', 'third'])).toBeNull();
  expect(androidDevice.findStableConsecutiveFrames(['first', 'second', 'second'])).toEqual({ firstIndex: 1, secondIndex: 2, hash: 'second' });
});
