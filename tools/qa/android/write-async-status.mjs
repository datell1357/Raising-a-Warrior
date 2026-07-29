import { createHash } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';

const [path, exitCode, startedAt, session, ...sources] = process.argv.slice(2);
const sourceHashes = Object.fromEntries(await Promise.all(sources.map(async (source) => [source, createHash('sha256').update(await readFile(source)).digest('hex')])));
const receipt = { exitCode: Number(exitCode), signal: null, startedAt, endedAt: new Date().toISOString(), session, sourceHashes };
await writeFile(`${path}.tmp`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
await rename(`${path}.tmp`, path);
