const UNSIGNED_INTEGER_PATTERN = '^(0|[1-9][0-9]*)$';
const SIGNED_INTEGER_PATTERN = '^-?(0|[1-9][0-9]*)$';
const EXTERNAL_DEFINITIONS = new Set(['contentVersion']);
const ROOT_KEYS = new Set(['$schema', '$id', 'title', '$defs', 'oneOf']);
const NODE_KEYS = new Set(['type', 'required', 'properties', 'additionalProperties', 'items', 'pattern', 'const', 'enum', '$ref', 'description']);
const COMMAND_DEFINITIONS = ['stateVersion', 'contentVersion', 'commandId', 'currencyAmount', 'commandPayload', 'resultPayload', 'commandEnvelope', 'commandResult', 'domainError', 'commandError'];
const ROOT_OBJECTS = new Set(['commandEnvelope', 'commandResult', 'commandError']);
const NESTED_OBJECTS = new Set(['currencyAmount', 'commandPayload', 'resultPayload']);
const INHERITED_MEMBERS = new Set(['Equals', 'GetHashCode', 'GetType', 'MemberwiseClone', 'Finalize', 'ToString']);
const RESERVED_GENERATED_TYPES = new Set(['ContentVersion', 'CanonicalDecimalString', 'FixedInt64String', 'GeneratedCommandContract', 'CanonicalCommandJson', 'CommandModelMapper', 'JsonValue', 'JsonObjectValue', 'JsonArrayValue', 'JsonStringValue', 'JsonNumberValue', 'JsonBooleanValue', 'JsonNullValue', 'JsonParser', 'JsonObjectReader', 'InvalidOperationException', 'ArgumentNullException', 'IReadOnlyList', 'List', 'Func', 'CultureInfo', 'NumberStyles']);
const CSHARP_RESERVED = new Set('abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while add alias ascending async await by descending dynamic equals from get global group into join let nameof not notnull on or orderby partial remove select set unmanaged value var when where yield'.split(' '));

function fail(message) {
  const error = new Error(`unsupported command schema: ${message}`);
  error.code = 'UNSUPPORTED_COMMAND_SCHEMA';
  error.reason = message;
  throw error;
}

function pascalCase(value) {
  return value.replace(/(^|[-_\s])([a-zA-Z0-9])/g, (_, __, character) => character.toUpperCase());
}

function camelCase(value) {
  return value[0].toLowerCase() + value.slice(1);
}

function definitionName(ref) {
  const match = /^#\/\$defs\/([A-Za-z][A-Za-z0-9]*)$/.exec(ref ?? '');
  if (!match) fail(`reference ${JSON.stringify(ref)}`);
  return match[1];
}

function assertSupportedNode(node, pointer) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) fail(`node ${pointer}`);
  const keys = Object.keys(node);
  if (node.description !== undefined && (typeof node.description !== 'string' || /[\u0000-\u001f\u007f]/.test(node.description))) fail(`description ${pointer}`);
  for (const key of keys) if (!NODE_KEYS.has(key)) fail(`keyword ${pointer}/${key}`);
  if (node.$ref) {
    if (keys.length !== 1) fail(`$ref siblings at ${pointer}`);
    definitionName(node.$ref);
    return;
  }
  if (node.const !== undefined) {
    if (keys.length !== 1 || typeof node.const !== 'string') fail(`const shape at ${pointer}`);
    return;
  }
  if (node.enum) {
    if (!keys.every((key) => key === 'type' || key === 'enum' || key === 'description') || node.type !== 'string' || !Array.isArray(node.enum) || node.enum.length === 0 || !node.enum.every((value) => typeof value === 'string')) fail(`enum shape at ${pointer}`);
    return;
  }
  if (node.type === 'object') {
    if (!keys.every((key) => key === 'type' || key === 'required' || key === 'properties' || key === 'additionalProperties' || key === 'description') || !Array.isArray(node.required) || !node.properties || node.additionalProperties !== false) fail(`object shape at ${pointer}`);
    for (const [name, property] of Object.entries(node.properties)) assertSupportedNode(property, `${pointer}/properties/${name}`);
    return;
  }
  if (node.type === 'array') {
    if (!keys.every((key) => key === 'type' || key === 'items' || key === 'description') || !node.items || !node.items.$ref || Object.keys(node.items).length !== 1) fail(`array shape at ${pointer}`);
    return;
  }
  if (node.type === 'string') {
    if (pointer === '#/$defs/contentVersion' && (node.pattern !== undefined || !keys.every((key) => key === 'type' || key === 'description'))) fail('contentVersion shape');
    if (!keys.every((key) => key === 'type' || key === 'pattern' || key === 'description') || (node.pattern !== undefined && node.pattern !== UNSIGNED_INTEGER_PATTERN && node.pattern !== SIGNED_INTEGER_PATTERN)) fail(`string shape at ${pointer}`);
    return;
  }
  if (node.type === 'boolean' && keys.every((key) => key === 'type' || key === 'description')) return;
  fail(`node shape at ${pointer}`);
}

function assertSupportedSchema(commandSchema) {
  if (!commandSchema || typeof commandSchema !== 'object' || Array.isArray(commandSchema)) fail('root');
  for (const key of Object.keys(commandSchema)) {
    if (!ROOT_KEYS.has(key)) fail(`root keyword ${key}`);
  }
  if (commandSchema.$schema !== 'https://json-schema.org/draft/2020-12/schema') fail('root metadata $schema');
  if (commandSchema.$id !== 'content/contracts/command.schema.json') fail('root metadata $id');
  if (commandSchema.title !== 'Canonical command, result, and error schema') fail('root metadata title');
  if (!commandSchema.$defs || typeof commandSchema.$defs !== 'object' || Array.isArray(commandSchema.$defs)) fail('$defs');
  for (const [name, node] of Object.entries(commandSchema.$defs)) assertSupportedNode(node, `#/$defs/${name}`);
  if (!Array.isArray(commandSchema.oneOf)) fail('oneOf');
  for (const [index, node] of commandSchema.oneOf.entries()) assertSupportedNode(node, `#/oneOf/${index}`);
}

function objectDefinition(definitions, name) {
  const node = definitions[name];
  if (!node || node.type !== 'object' || !Array.isArray(node.required) || !node.properties || node.additionalProperties !== false) {
    fail(`object definition ${name}`);
  }
  if (node.required.some((field) => typeof field !== 'string') || new Set(node.required).size !== node.required.length) fail(`required entries ${name}`);
  if (Object.keys(node.properties).length !== node.required.length || node.required.some((field) => !Object.hasOwn(node.properties, field))) fail(`required/property set ${name}`);
  return node;
}

function assertFieldNames(node, name) {
  const generated = new Set();
  for (const field of node.required) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(field)) fail(`identifier ${field}`);
    const property = pascalCase(field);
    const parameter = camelCase(property);
    if (CSHARP_RESERVED.has(property.toLowerCase()) || CSHARP_RESERVED.has(parameter.toLowerCase())) fail(`reserved identifier ${field}`);
    if (property === name || INHERITED_MEMBERS.has(property)) fail(`member/enclosing type collision ${field}`);
    if (generated.has(property) || generated.has(parameter)) fail(`generated field collision ${field}`);
    generated.add(property); generated.add(parameter);
  }
}

function objectName(definition, payloadPrefix) {
  if (definition === 'commandPayload' || definition === 'resultPayload') return `${payloadPrefix}${pascalCase(definition)}`;
  if (definition === 'currencyAmount') return 'CommandCurrencyAmount';
  return pascalCase(definition);
}

function scalarType(node, fieldName) {
  if (node.type === 'boolean') return { ts: 'boolean', cs: 'bool', parser: 'boolean' };
  if (node.type !== 'string') fail(`field ${fieldName} type ${JSON.stringify(node.type)}`);
  if (node.pattern === UNSIGNED_INTEGER_PATTERN) return { ts: 'CanonicalDecimalString', cs: 'CanonicalDecimalString', parser: 'unsigned' };
  if (node.pattern === SIGNED_INTEGER_PATTERN) return { ts: 'FixedInt64String', cs: 'FixedInt64String', parser: 'signed' };
  if (node.pattern !== undefined) fail(`field ${fieldName} pattern ${node.pattern}`);
  return { ts: 'string', cs: 'string', parser: 'string' };
}

function enumType(fieldName, values, owned) {
  if (!values.every((value) => typeof value === 'string' && value.length > 0) || new Set(values).size !== values.length) fail(`enum values ${fieldName}`);
  const members = values.map((value) => pascalCase(value));
  if (members.some((member) => !/^[A-Za-z][A-Za-z0-9]*$/.test(member) || CSHARP_RESERVED.has(member.toLowerCase())) || new Set(members).size !== members.length) fail(`enum members ${fieldName}`);
  if (members.includes(pascalCase(fieldName))) fail(`enum member/enclosing type collision ${fieldName}`);
  return { ts: values.map(JSON.stringify).join(' | '), cs: pascalCase(fieldName), parser: 'enum', enumName: pascalCase(fieldName), values, members, owned };
}

function registerEnum(enums, entry, origin) {
  const current = enums.get(entry.enumName);
  if (current && current.origin !== origin) fail(`enum type collision ${entry.enumName}`);
  if (!current) enums.set(entry.enumName, { ...entry, origin });
}

function buildField(definitions, typeNames, node, fieldName, enums, owner) {
  if (node.$ref) {
    const name = definitionName(node.$ref);
    const target = definitions[name];
    if (!target) fail(`missing definition ${name}`);
    if (target.type === 'object') {
      if (!NESTED_OBJECTS.has(name)) fail(`root object reference ${owner}.${fieldName} -> ${name}`);
      return { jsonName: fieldName, propertyName: pascalCase(fieldName), parameterName: camelCase(pascalCase(fieldName)), ts: typeNames[name], cs: typeNames[name], parser: 'object', definition: name };
    }
    if (target.enum) {
      const result = enumType(name, target.enum, name === 'domainError');
      registerEnum(enums, result, `definition:${name}`);
      return { jsonName: fieldName, propertyName: pascalCase(fieldName), parameterName: camelCase(pascalCase(fieldName)), ...result, ts: result.enumName };
    }
    const scalar = scalarType(target, name);
    if (target.type === 'boolean') fail(`reference boolean ${name}`);
    if (target.pattern === SIGNED_INTEGER_PATTERN) fail(`reference signed ${name}`);
    if (name === 'contentVersion' && (Object.keys(target).some((key) => key !== 'type' && key !== 'description') || target.type !== 'string')) fail('contentVersion shape');
    const typeName = pascalCase(name);
    return { jsonName: fieldName, propertyName: pascalCase(fieldName), parameterName: camelCase(pascalCase(fieldName)), ts: typeName, cs: typeName, parser: 'reference', definition: name, scalar };
  }
  if (node.const !== undefined) {
    if (typeof node.const !== 'string') fail(`const field ${fieldName}`);
    const result = enumType(`${pascalCase(node.const)}Command${pascalCase(fieldName)}`, [node.const], true);
    registerEnum(enums, result, `${owner}.${fieldName}`);
    return { jsonName: fieldName, propertyName: pascalCase(fieldName), parameterName: camelCase(pascalCase(fieldName)), ...result, ts: JSON.stringify(node.const), constValue: node.const };
  }
  if (node.enum) {
    const result = enumType(owner === 'currencyAmount' ? 'CommandCurrencyId' : fieldName, node.enum, true);
    registerEnum(enums, result, `${owner}.${fieldName}`);
    return { jsonName: fieldName, propertyName: pascalCase(fieldName), parameterName: camelCase(pascalCase(fieldName)), ...result, ts: result.enumName };
  }
  if (node.type === 'array' && node.items) {
    const itemDefinition = definitionName(node.items.$ref);
    if (itemDefinition !== 'currencyAmount') fail(`array item reference ${owner}.${fieldName} -> ${itemDefinition}`);
    const item = buildField(definitions, typeNames, node.items, `${fieldName}Item`, enums, owner);
    return { jsonName: fieldName, propertyName: pascalCase(fieldName), parameterName: camelCase(pascalCase(fieldName)), ts: `ReadonlyArray<${item.ts}>`, cs: `IReadOnlyList<${item.cs}>`, parser: 'array', item };
  }
  return { jsonName: fieldName, propertyName: pascalCase(fieldName), parameterName: camelCase(pascalCase(fieldName)), ...scalarType(node, fieldName) };
}

function findPayloadPrefix(definitions, commandPayload) {
  const payload = objectDefinition(definitions, commandPayload);
  const discriminators = payload.required.filter((field) => typeof payload.properties[field].const === 'string');
  if (discriminators.length !== 1) fail('payload discriminator count');
  const discriminator = discriminators[0];
  const value = payload.properties[discriminator].const;
  if (typeof value !== 'string') fail(`payload discriminator ${discriminator}`);
  return pascalCase(value);
}

export function buildCommandSchemaIr(commandSchema) {
  assertSupportedSchema(commandSchema);
  const definitions = commandSchema?.$defs;
  if (Object.keys(definitions ?? {}).length !== COMMAND_DEFINITIONS.length || COMMAND_DEFINITIONS.some((name) => !Object.hasOwn(definitions ?? {}, name))) fail('definition inventory');
  if (!definitions || !Array.isArray(commandSchema.oneOf)) fail('$defs and oneOf');
  const roots = commandSchema.oneOf.map((branch) => definitionName(branch.$ref));
  if (roots.join(',') !== 'commandEnvelope,commandResult,commandError') fail('root topology');
  const envelope = roots.find((name) => name.toLowerCase().includes('envelope'));
  const result = roots.find((name) => name.toLowerCase().includes('result'));
  const error = roots.find((name) => name.toLowerCase().includes('error'));
  if (!envelope || !result || !error) fail('envelope, result, and error roots');
  const envelopeDefinition = objectDefinition(definitions, envelope);
  const resultDefinition = objectDefinition(definitions, result);
  const contentVersion = definitions.contentVersion;
  if (contentVersion.type !== 'string' || Object.keys(contentVersion).some((key) => key !== 'type' && key !== 'description')) fail('contentVersion shape');
  const commandPayload = definitionName(envelopeDefinition.properties.payload?.$ref);
  const resultPayload = definitionName(resultDefinition.properties.payload?.$ref);
  const payloadPrefix = findPayloadPrefix(definitions, commandPayload);
  const typeNames = Object.fromEntries(Object.keys(definitions).map((name) => [name, objectName(name, payloadPrefix)]));
  for (const name of Object.keys(definitions).filter((name) => definitions[name].type === 'object')) assertFieldNames(objectDefinition(definitions, name), typeNames[name]);
  const ownedEnums = new Map();
  const objects = Object.keys(definitions)
    .filter((name) => definitions[name].type === 'object')
    .map((name) => {
      const definition = objectDefinition(definitions, name);
      const fields = definition.required.map((field) => buildField(definitions, typeNames, definition.properties[field], field, ownedEnums, name));
      return { definition: name, name: typeNames[name], fields, description: definition.description ?? null, external: EXTERNAL_DEFINITIONS.has(name) };
    });
  const scalarDefinitions = Object.entries(definitions)
    .filter(([name, node]) => node.type === 'string' && !node.enum && !EXTERNAL_DEFINITIONS.has(name))
    .map(([name, node]) => ({ definition: name, name: pascalCase(name), ...scalarType(node, name) }));
  const generatedNames = [...objects.map((object) => object.name), ...scalarDefinitions.map((scalar) => scalar.name), ...ownedEnums.keys()];
  if (new Set(generatedNames).size !== generatedNames.length) fail('generated type collision');
  const reservedCollision = generatedNames.find((name) => RESERVED_GENERATED_TYPES.has(name));
  if (reservedCollision) fail(`generated type collision ${reservedCollision}`);
  return {
    description: definitions.domainError?.description ?? null,
    enums: [...ownedEnums.values()],
    objects,
    roots: roots.map((definition) => ({ definition, name: typeNames[definition] })),
    scalarDefinitions,
  };
}
