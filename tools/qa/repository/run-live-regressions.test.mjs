import { expect, test } from 'bun:test';
process.env.LIVE_REGRESSION_UNIT_TEST = '1';
const { applyCopyOnWrite } = await import('./run-live-regressions.mjs?cow');
const baseline = { object: { keep: 'yes', replace: 'old' }, list: ['a', 'b'] };
test('Given object and array patches when copy-on-write applies then baseline remains unchanged', () => {
  const result = applyCopyOnWrite(baseline, [
    { op: 'add', pointer: '/object/add', value: 'new' }, { op: 'replace', pointer: '/object/replace', value: 'new' },
    { op: 'remove', pointer: '/list/0', value: null }, { op: 'add', pointer: '/list/-', value: 'c' },
  ]);
  expect(result).toEqual({ object: { keep: 'yes', replace: 'new', add: 'new' }, list: ['b', 'c'] });
  expect(baseline).toEqual({ object: { keep: 'yes', replace: 'old' }, list: ['a', 'b'] });
});
test('Given separate fixtures when they patch one branch then they cannot leak', () => {
  expect(applyCopyOnWrite(baseline, [{ op: 'replace', pointer: '/object/replace', value: 'one' }]).object.replace).toBe('one');
  expect(applyCopyOnWrite(baseline, [{ op: 'replace', pointer: '/object/replace', value: 'two' }]).object.replace).toBe('two');
  expect(baseline.object.replace).toBe('old');
});
test('Given an invalid pointer when copy-on-write applies then it keeps the diagnostic', () => {
  expect(() => applyCopyOnWrite(baseline, [{ op: 'replace', pointer: '/missing/key', value: 'x' }])).toThrow('patch parent does not exist');
});
