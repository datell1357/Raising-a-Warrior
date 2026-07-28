import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const CONTRACT_SCHEMA_FILES = [
  'game.schema.json',
  'command.schema.json',
  'manifest.schema.json',
  'release-candidate.schema.json',
  'locale.schema.json',
];

export const SUPPORTED_SCHEMA_KEYWORDS = [
  'type',
  'required',
  'properties',
  'additionalProperties',
  'items',
  'pattern',
  'const',
  'enum',
  'minimum',
  'minItems',
  'maxItems',
  'oneOf',
  '$ref',
  '$defs',
];

const SCHEMA_METADATA_KEYWORDS = new Set([
  '$schema',
  '$id',
  '$comment',
  'title',
  'description',
  'default',
  'examples',
]);

function stable(value) {
  if (Array.isArray(value)) {
    return '[' + value.map((entry) => stable(entry)).join(',') + ']';
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((key) => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function fail(code, pointer, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  error.pointer = pointer;
  error.payload = { code, pointer, message, ...extra };
  throw error;
}

function escapeJsonPointer(segment) {
  return String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
}

function joinPointer(pointer, segment) {
  return pointer ? `${pointer}/${escapeJsonPointer(segment)}` : `/${escapeJsonPointer(segment)}`;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertSupportedSchemaKeywords(schema, pointer = '') {
  if (!isObject(schema)) {
    fail('SCHEMA_DEFINITION_ERROR', pointer, 'schema node must be an object');
  }

  for (const [key, value] of Object.entries(schema)) {
    if (!SUPPORTED_SCHEMA_KEYWORDS.includes(key) && !SCHEMA_METADATA_KEYWORDS.has(key)) {
      fail('SCHEMA_DEFINITION_ERROR', joinPointer(pointer, key), `unsupported schema keyword: ${key}`);
    }
    if (key === 'properties' || key === '$defs') {
      if (!isObject(value)) fail('SCHEMA_DEFINITION_ERROR', joinPointer(pointer, key), `${key} must be an object`);
      for (const [name, nestedSchema] of Object.entries(value)) {
        assertSupportedSchemaKeywords(nestedSchema, joinPointer(joinPointer(pointer, key), name));
      }
    }
    if (key === 'items') {
      assertSupportedSchemaKeywords(value, joinPointer(pointer, key));
    }
    if (key === 'oneOf') {
      if (!Array.isArray(value)) fail('SCHEMA_DEFINITION_ERROR', joinPointer(pointer, key), 'oneOf must be an array');
      value.forEach((nestedSchema, index) => assertSupportedSchemaKeywords(nestedSchema, joinPointer(joinPointer(pointer, key), index)));
    }
  }
}

function resolveRef(rootSchema, ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) {
    fail('SCHEMA_REFERENCE_ERROR', '', `unsupported $ref: ${ref}`);
  }
  let target = rootSchema;
  for (const segment of ref.slice(2).split('/').map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))) {
    if (!isObject(target) && !Array.isArray(target)) {
      fail('SCHEMA_REFERENCE_ERROR', '', `invalid $ref target: ${ref}`);
    }
    target = target[segment];
    if (target === undefined) {
      fail('SCHEMA_REFERENCE_ERROR', '', `unresolved $ref: ${ref}`);
    }
  }
  return target;
}

function typeMatches(value, schemaType) {
  const types = Array.isArray(schemaType) ? schemaType : [schemaType];
  return types.some((type) => {
    switch (type) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number' && Number.isFinite(value);
      case 'integer': return Number.isInteger(value);
      case 'boolean': return typeof value === 'boolean';
      case 'object': return isObject(value);
      case 'array': return Array.isArray(value);
      case 'null': return value === null;
      default:
        fail('SCHEMA_VALIDATION_ERROR', '', `unsupported schema type: ${type}`);
    }
  });
}

function validateNode(value, schema, pointer, rootSchema, coverage) {
  if (!isObject(schema)) {
    fail('SCHEMA_VALIDATION_ERROR', pointer, 'schema node must be an object');
  }

  for (const key of Object.keys(schema)) {
    if (SUPPORTED_SCHEMA_KEYWORDS.includes(key)) coverage.add(key);
  }

  if (schema.$ref !== undefined) {
    const refSchema = resolveRef(rootSchema, schema.$ref);
    validateNode(value, refSchema, pointer, rootSchema, coverage);
    return;
  }

  if (schema.oneOf !== undefined) {
    if (!Array.isArray(schema.oneOf)) fail('SCHEMA_VALIDATION_ERROR', pointer, 'oneOf must be an array');
    let matches = 0;
    let lastError = null;
    for (const branch of schema.oneOf) {
      try {
        validateNode(value, branch, pointer, rootSchema, coverage);
        matches += 1;
      } catch (error) {
        lastError = error;
      }
    }
    if (matches !== 1) {
      fail('SCHEMA_VALIDATION_ERROR', pointer, `expected exactly one matching oneOf branch, got ${matches}`, lastError ? { lastError: lastError.payload ?? lastError.message } : {});
    }
    return;
  }

  if (schema.type !== undefined) {
    if (!typeMatches(value, schema.type)) {
      fail('SCHEMA_VALIDATION_ERROR', pointer, `expected type ${Array.isArray(schema.type) ? schema.type.join('|') : schema.type}`);
    }
  }

  if (schema.const !== undefined && stable(value) !== stable(schema.const)) {
    fail('SCHEMA_VALIDATION_ERROR', pointer, 'const mismatch');
  }

  if (schema.enum !== undefined) {
    if (!Array.isArray(schema.enum)) fail('SCHEMA_VALIDATION_ERROR', pointer, 'enum must be an array');
    const matches = schema.enum.some((entry) => stable(entry) === stable(value));
    if (!matches) fail('SCHEMA_VALIDATION_ERROR', pointer, 'enum mismatch');
  }

  if (schema.pattern !== undefined) {
    if (typeof value !== 'string') fail('SCHEMA_VALIDATION_ERROR', pointer, 'pattern requires string value');
    const re = new RegExp(schema.pattern);
    if (!re.test(value)) fail('SCHEMA_VALIDATION_ERROR', pointer, 'pattern mismatch');
  }

  if (schema.minimum !== undefined) {
    if (typeof value !== 'number') fail('SCHEMA_VALIDATION_ERROR', pointer, 'minimum requires numeric value');
    if (value < schema.minimum) fail('SCHEMA_VALIDATION_ERROR', pointer, 'minimum mismatch');
  }

  if (schema.minItems !== undefined || schema.maxItems !== undefined || schema.items !== undefined) {
    if (!Array.isArray(value)) fail('SCHEMA_VALIDATION_ERROR', pointer, 'expected array');
    if (schema.minItems !== undefined && value.length < schema.minItems) fail('SCHEMA_VALIDATION_ERROR', pointer, 'minItems mismatch');
    if (schema.maxItems !== undefined && value.length > schema.maxItems) fail('SCHEMA_VALIDATION_ERROR', pointer, 'maxItems mismatch');
    if (schema.items !== undefined) {
      value.forEach((entry, index) => validateNode(entry, schema.items, joinPointer(pointer, index), rootSchema, coverage));
    }
  }

  if (schema.required !== undefined || schema.properties !== undefined || schema.additionalProperties !== undefined) {
    if (!isObject(value)) fail('SCHEMA_VALIDATION_ERROR', pointer, 'expected object');
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        fail('SCHEMA_VALIDATION_ERROR', joinPointer(pointer, key), `missing required property ${key}`);
      }
    }
    const properties = isObject(schema.properties) ? schema.properties : {};
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        validateNode(value[key], propertySchema, joinPointer(pointer, key), rootSchema, coverage);
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(properties, key)) {
          fail('SCHEMA_VALIDATION_ERROR', joinPointer(pointer, key), `unexpected property ${key}`);
        }
      }
    }
    if (schema.additionalProperties !== undefined && schema.additionalProperties !== true && schema.additionalProperties !== false) {
      fail('SCHEMA_VALIDATION_ERROR', pointer, 'additionalProperties must be boolean');
    }
  }
}

export async function loadContractSchemas(contractDir) {
  const schemas = {};
  for (const fileName of CONTRACT_SCHEMA_FILES) {
    const filePath = resolve(contractDir, fileName);
    const schema = JSON.parse(await readFile(filePath, 'utf8'));
    assertSupportedSchemaKeywords(schema);
    schemas[fileName] = schema;
    if (schema.$id) schemas[schema.$id] = schema;
  }
  return schemas;
}

export function validateSchemaInstance(instance, schema, schemaName = '', coverage = new Set()) {
  assertSupportedSchemaKeywords(schema, schemaName);
  validateNode(instance, schema, '', schema, coverage);
  return coverage;
}

export function validateNamedSchema(instance, schemaName, schemas, coverage = new Set()) {
  const schema = schemas[schemaName] ?? schemas[Object.keys(schemas).find((key) => key.endsWith(`/${schemaName}`))];
  if (!schema) fail('SCHEMA_VALIDATION_ERROR', '', `unknown schema: ${schemaName}`);
  validateNode(instance, schema, '', schema, coverage);
  return coverage;
}

export function selfTestSchemaEngine() {
  const coverage = new Set();

  validateSchemaInstance(
    { id: 'alpha', nested: { count: 1 } },
    {
      type: 'object',
      required: ['id', 'nested'],
      properties: {
        id: { type: 'string', enum: ['alpha', 'beta'] },
        nested: {
          type: 'object',
          required: ['count'],
          properties: { count: { type: 'integer', minimum: 0, const: 1 } },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    'self-object',
    coverage,
  );

  try {
    validateSchemaInstance('x', { type: 'string', maximum: 1 }, 'self-unsupported');
    fail('SCHEMA_SELF_TEST_FAILED', '', 'unsupported schema keyword was accepted');
  } catch (error) {
    if (error.code !== 'SCHEMA_DEFINITION_ERROR') throw error;
  }

  validateSchemaInstance(
    ['x', 'y'],
    {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: { type: 'string', pattern: '^[xy]$' },
    },
    'self-array',
    coverage,
  );

  validateSchemaInstance(
    { kind: 'a' },
    {
      oneOf: [
        { $ref: '#/$defs/a' },
        { $ref: '#/$defs/b' },
      ],
      $defs: {
        a: {
          type: 'object',
          required: ['kind'],
          properties: { kind: { const: 'a' } },
          additionalProperties: false,
        },
        b: {
          type: 'object',
          required: ['kind'],
          properties: { kind: { const: 'b' } },
          additionalProperties: false,
        },
      },
    },
    'self-oneof',
    coverage,
  );

  if (coverage.size !== SUPPORTED_SCHEMA_KEYWORDS.length || SUPPORTED_SCHEMA_KEYWORDS.some((keyword) => !coverage.has(keyword))) {
    fail('SCHEMA_SELF_TEST_FAILED', '', 'schema engine did not exercise the supported keyword set', { coverage: [...coverage].sort() });
  }

  return [...coverage].sort();
}
