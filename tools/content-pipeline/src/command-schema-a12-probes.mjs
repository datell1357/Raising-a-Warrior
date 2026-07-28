import { buildCommandModelFiles } from './command-model-generator.mjs';

function clone(schema) { return JSON.parse(JSON.stringify(schema)); }
function addField(schema, definition, field, value) { schema.$defs[definition].properties[field] = value; schema.$defs[definition].required.push(field); }
function expectReject(name, reason, mutate, schema, hash, version) {
  const candidate = clone(schema); mutate(candidate);
  try { buildCommandModelFiles(candidate, hash, version); } catch (error) {
    if (error.code === 'UNSUPPORTED_COMMAND_SCHEMA' && error.reason.includes(reason)) return { name, code: error.code, reason: error.reason };
    throw error;
  }
  throw new Error(`a12 probe accepted: ${name}`);
}

const CASES = [
  ...['commandEnvelope', 'commandResult', 'commandError'].map((target) => [`direct-root-ref-${target}`, `root object reference currencyAmount.link -> ${target}`, (s) => addField(s, 'currencyAmount', 'link', { $ref: `#/$defs/${target}` })]),
  ...['commandEnvelope', 'commandResult', 'commandError'].map((target) => [`array-root-ref-${target}`, `array item reference commandResult.walletDelta -> ${target}`, (s) => { s.$defs.commandResult.properties.walletDelta.items = { $ref: `#/$defs/${target}` }; }]),
  ...['commandPayload', 'resultPayload'].map((target) => [`array-payload-ref-${target}`, `array item reference commandResult.walletDelta -> ${target}`, (s) => { s.$defs.commandResult.properties.walletDelta.items = { $ref: `#/$defs/${target}` }; }]),
  ['inline-existing-enum-collision', 'enum type collision DomainError', (s) => addField(s, 'resultPayload', 'domainError', { type: 'string', enum: ['x'] })],
  ['inline-inline-enum-collision-different', 'enum type collision Extra', (s) => { addField(s, 'commandPayload', 'extra', { type: 'string', enum: ['a'] }); addField(s, 'resultPayload', 'extra', { type: 'string', enum: ['b'] }); }],
  ['inline-inline-enum-collision-identical', 'enum type collision Extra', (s) => { addField(s, 'commandPayload', 'extra', { type: 'string', enum: ['a'] }); addField(s, 'resultPayload', 'extra', { type: 'string', enum: ['a'] }); }],
  ['class-enclosing-member', 'member/enclosing type collision commandEnvelope', (s) => addField(s, 'commandEnvelope', 'commandEnvelope', { type: 'string' })],
  ['payload-enclosing-member', 'member/enclosing type collision noopCommandPayload', (s) => addField(s, 'commandPayload', 'noopCommandPayload', { type: 'string' })],
  ['enum-enclosing-member', 'enum member/enclosing type collision domainError', (s) => s.$defs.domainError.enum.push('domainError')],
  ['inherited-object-member-ToString', 'member/enclosing type collision ToString', (s) => addField(s, 'commandEnvelope', 'ToString', { type: 'string' })],
  ['numeric-object-description', 'description #/$defs/commandEnvelope', (s) => { s.$defs.commandEnvelope.description = 1; }],
  ['numeric-enum-description', 'description #/$defs/domainError', (s) => { s.$defs.domainError.description = 1; }],
  ['numeric-inline-description', 'description #/$defs/commandPayload/properties/kind', (s) => { s.$defs.commandPayload.properties.kind.description = 1; }],
  ['multiline-description', 'description #/$defs/commandEnvelope', (s) => { s.$defs.commandEnvelope.description = 'bad\ntext'; }],
  ...['$schema', '$id', 'title'].flatMap((key) => [['missing', (s) => delete s[key]], ['number', (s) => { s[key] = 1; }], ['wrong-string', (s) => { s[key] = 'wrong'; }]].map(([suffix, mutate]) => [`root-metadata-${key}-${suffix}`, `root metadata ${key}`, mutate])),
];

export function runA12RejectionProbes(schema, hash, version) { return CASES.map(([name, reason, mutate]) => expectReject(name, reason, mutate, schema, hash, version)); }

export function runA12PositiveEnumReuse(schema, hash, version) {
  const candidate = clone(schema);
  addField(candidate, 'commandError', 'secondaryError', { $ref: '#/$defs/domainError' });
  const files = buildCommandModelFiles(candidate, hash, version);
  const declarationCount = (files.cs.match(/public enum DomainError/g) ?? []).length;
  const parserCount = (files.cs.match(/ParseDomainError\(JsonValue/g) ?? []).length;
  if (declarationCount !== 1 || parserCount !== 1 || !files.ts.includes('readonly secondaryError: DomainError;') || !files.cs.includes('DomainError secondaryError')) throw new Error('a12 positive enum reuse failed');
  return { name: 'positive-repeated-domain-error-reference', declarationCount, parserCount };
}
