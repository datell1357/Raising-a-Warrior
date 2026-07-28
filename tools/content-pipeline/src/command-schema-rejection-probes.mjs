import { buildCommandModelFiles } from './command-model-generator.mjs';

function clone(schema) { return JSON.parse(JSON.stringify(schema)); }
function addRequired(schema, definition, field, value) { schema.$defs[definition].properties[field] = value; schema.$defs[definition].required.push(field); }

const CASES = [
  ['duplicate-required', 'required entries', (schema) => schema.$defs.commandEnvelope.required.push('commandId')],
  ['duplicate-enum-value', 'enum values', (schema) => schema.$defs.domainError.enum.push('VersionConflict')],
  ['csharp-enum-member-collision', 'enum members', (schema) => schema.$defs.currencyAmount.properties.currencyId.enum.push('Brass-Coin')],
  ['invalid-field-identifier', 'identifier client-build', (schema) => addRequired(schema, 'commandEnvelope', 'client-build', { type: 'string' })],
  ['reserved-parameter-identifier', 'reserved identifier event', (schema) => addRequired(schema, 'commandEnvelope', 'event', { type: 'string' })],
  ['generated-property-collision', 'generated field collision CommandId', (schema) => addRequired(schema, 'commandEnvelope', 'CommandId', { type: 'string' })],
  ['invalid-enum-member', 'enum members', (schema) => schema.$defs.domainError.enum.push('9Lives')],
  ['referenced-boolean-scalar', 'reference boolean commandId', (schema) => { schema.$defs.commandId = { type: 'boolean' }; }],
  ['external-content-version-type-drift', 'contentVersion shape', (schema) => { schema.$defs.contentVersion = { type: 'boolean' }; }],
  ['external-content-version-constraint-drift', 'contentVersion shape', (schema) => { schema.$defs.contentVersion.pattern = '^x$'; }],
  ['signed-scalar-reference', 'reference signed commandId', (schema) => { schema.$defs.commandId = { type: 'string', pattern: '^-?(0|[1-9][0-9]*)$' }; }],
  ['ignored-extra-definition', 'definition inventory', (schema) => { schema.$defs.extra = { type: 'string' }; }],
  ['enum-type-name-collision', 'enum type collision DomainError', (schema) => addRequired(schema, 'resultPayload', 'domainError', { type: 'string', enum: ['x'] })],
  ['ambiguous-payload-discriminator', 'payload discriminator count', (schema) => addRequired(schema, 'commandPayload', 'mode', { const: 'other' })],
];

export function runCommandSchemaRejectionProbes(schema, sourceHash, generatorVersion) {
  return CASES.map(([name, reason, mutate]) => {
    const candidate = clone(schema);
    mutate(candidate);
    try { buildCommandModelFiles(candidate, sourceHash, generatorVersion); }
    catch (error) {
      if (error.code === 'UNSUPPORTED_COMMAND_SCHEMA' && error.reason.includes(reason)) return { name, code: error.code, reason: error.reason };
      throw error;
    }
    throw new Error(`rejection probe accepted: ${name}`);
  });
}
