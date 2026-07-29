import { spawnSync } from 'node:child_process';
import { expect, test } from 'bun:test';

function rootGate(script) {
  return spawnSync('bun', ['run', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 180_000,
  });
}

test('Given a task worktree without historical evidence or Manyfast source files when root schema and ADR gates run then tracked authority contracts make both gates self-contained', () => {
  const schema = rootGate('test:schema');
  const adr = rootGate('validate:adr');

  expect(schema.status).toBe(0);
  expect(adr.status).toBe(0);
  expect(`${schema.stdout}${schema.stderr}`).not.toContain('.omo/evidence/implementation/20260727T000000Z');
  expect(`${adr.stdout}${adr.stderr}`).not.toContain('docs/Manyfast/');
}, 30_000);
