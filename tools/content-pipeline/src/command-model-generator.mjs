import { buildCommandCsharp } from './command-csharp-generator.mjs';
import { buildCommandSchemaIr } from './command-schema-ir.mjs';
import { buildCommandTypescript } from './command-typescript-generator.mjs';

export function buildCommandModelFiles(commandSchema, sourceHash, generatorVersion) {
  const contract = buildCommandSchemaIr(commandSchema);
  const header = `// generator: ${generatorVersion}
// source-hash: ${sourceHash}
// source: content/contracts/command.schema.json
`;
  return {
    ts: buildCommandTypescript(contract, header, sourceHash, generatorVersion),
    cs: buildCommandCsharp(contract, header, sourceHash, generatorVersion),
    contract,
  };
}
