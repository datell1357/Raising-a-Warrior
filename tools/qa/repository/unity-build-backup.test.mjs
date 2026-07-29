import { expect, test } from 'bun:test';
import { shouldIgnoreRepositoryPath } from './repository-model.mjs';

test('Given a generated Unity Android backup when repository paths are inventoried then it is ignored', () => {
  expect(shouldIgnoreRepositoryPath('client/WarriorRaising/android/build/WarriorRaising-dev_BackUpThisFolder_ButDontShipItWithYourGame')).toBeTrue();
});

test('Given Android build metadata when repository paths are inventoried then it remains visible', () => {
  expect(shouldIgnoreRepositoryPath('client/WarriorRaising/android/build/output.json')).toBeFalse();
});
