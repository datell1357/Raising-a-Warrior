import { buildCommandModelFiles } from './command-model-generator.mjs';

const CASES = [
  ['contentVersion', 'ContentVersion'],
  ['canonicalDecimalString', 'CanonicalDecimalString'],
  ['fixedInt64String', 'FixedInt64String'],
  ['generatedCommandContract', 'GeneratedCommandContract'],
  ['canonicalCommandJson', 'CanonicalCommandJson'],
  ['commandModelMapper', 'CommandModelMapper'],
];

export function runA13GeneratedTypeCollisionProbes(schema, hash, version) {
  return CASES.map(([field, typeName]) => {
    const candidate = JSON.parse(JSON.stringify(schema));
    candidate.$defs.resultPayload.properties[field] = { type: 'string', enum: ['x'] };
    candidate.$defs.resultPayload.required.push(field);
    try { buildCommandModelFiles(candidate, hash, version); } catch (error) {
      if (error.code === 'UNSUPPORTED_COMMAND_SCHEMA' && error.reason === `generated type collision ${typeName}`) return { name: `${field}-collision`, code: error.code, reason: error.reason };
      throw error;
    }
    throw new Error(`generated type collision accepted: ${typeName}`);
  });
}
