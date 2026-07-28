import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const GENERATED_CSHARP_FILES = [
  'content/generated/csharp/ContentModels.cs',
  'content/generated/csharp/CommandModels.cs',
  'content/generated/csharp/launch-models.cs',
  'content/generated/csharp/d90-models.cs',
];

const CAP_ABSENCE_FILES = [
  'content/contracts/game.schema.json',
  'content/contracts/command.schema.json',
  'content/contracts/manifest.schema.json',
  'content/contracts/release-candidate.schema.json',
  'content/contracts/locale.schema.json',
  'content/generated/typescript/content-models.ts',
  'content/generated/typescript/launch-models.ts',
  'content/generated/typescript/d90-models.ts',
  'content/generated/typescript/command-models.ts',
  ...GENERATED_CSHARP_FILES,
  'tools/content-pipeline/src/contracts.ts',
  'tools/content-pipeline/src/model-generator.mjs',
  'tools/content-pipeline/src/csharp-model-generator.mjs',
  'tools/content-pipeline/src/csharp-parser-template.mjs',
  'tools/content-pipeline/src/command-model-generator.mjs',
  'tools/content-pipeline/src/command-contract-audit.mjs',
  'tools/content-pipeline/src/pipeline.mjs',
  'tools/content-pipeline/fixtures/canonical-launch.json',
  'tools/content-pipeline/fixtures/canonical-d90.json',
];

export async function auditGeneratedCsharp(root) {
  const sources = await Promise.all(GENERATED_CSHARP_FILES.map(async (relative) => ({
    relative,
    text: await readFile(resolve(root, relative), 'utf8'),
  })));
  const combined = sources.map((source) => source.text).join('\n');
  const forbidden = ['record ', 'IsExternalInit', 'System.Text.Json', 'DataContractJsonSerializer', 'default(T)', 'return default'];
  for (const token of forbidden) {
    if (combined.includes(token)) throw new Error(`generated C# contains forbidden token: ${token}`);
  }
  if (/public\s+class\s/.test(combined)) throw new Error('generated C# contains an unsealed public class');

  const sealedClassCount = (combined.match(/public sealed class /g) ?? []).length;
  const readonlyStructCount = (combined.match(/public readonly struct /g) ?? []).length;
  if (sealedClassCount < 30) throw new Error('generated C# sealed model inventory is incomplete');
  if (readonlyStructCount !== 17) throw new Error('generated C# branded struct inventory is incomplete');

  return {
    files: GENERATED_CSHARP_FILES,
    forbiddenTokensAbsent: forbidden,
    sealedClassCount,
    readonlyStructCount,
    apiCompatibilityProof: 'netstandard2.1 compiler gate with C# language version 9.0 and warnings as errors',
  };
}

export async function auditCapAbsence(root) {
  const forbiddenValues = ['288' + '00', '604' + '800'];
  for (const relative of CAP_ABSENCE_FILES) {
    const text = await readFile(resolve(root, relative), 'utf8');
    for (const value of forbiddenValues) {
      if (text.includes(value)) throw new Error(`product cap value ${value} found in ${relative}`);
    }
  }
  return {
    files: CAP_ABSENCE_FILES,
    forbiddenValues,
    absent: true,
    authoredCanonicalValues: { launch: '1', d90: '2' },
  };
}
