export class ContractError extends Error {
  constructor(code, pointer, message) {
    super(message);
    this.code = code;
    this.pointer = pointer;
  }
}

export function fail(code, pointer, message) {
  throw new ContractError(code, pointer, message);
}

export function pointer(parts) {
  return `/${parts.map((part) => String(part).replaceAll('~', '~0').replaceAll('/', '~1')).join('/')}`;
}

export function childPointer(at, key) {
  return `${at}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`;
}

export function object(value, at) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('OBJECT_REQUIRED', at, 'expected object');
  return value;
}

export function array(value, at) {
  if (!Array.isArray(value)) fail('ARRAY_REQUIRED', at, 'expected array');
  return value;
}

export function string(value, at) {
  if (typeof value !== 'string' || value.length === 0) fail('STRING_REQUIRED', at, 'expected non-empty string');
  return value;
}

export function exactKeys(value, required, at) {
  const record = object(value, at);
  for (const key of required) {
    if (!(key in record)) fail('MISSING_REQUIRED_FIELD', childPointer(at, key), `missing required property ${key}`);
  }
  for (const key of Object.keys(record)) {
    if (!required.includes(key)) fail('UNEXPECTED_PROPERTY', childPointer(at, key), `unexpected property ${key}`);
  }
  return record;
}

export function sameArray(actual, expected, at, code = 'ARRAY_MISMATCH') {
  const values = array(actual, at);
  if (values.length !== expected.length) fail(code, at, 'array length differs from canonical value');
  for (let index = 0; index < expected.length; index += 1) {
    if (values[index] !== expected[index]) fail(code, `${at}/${index}`, 'array differs from canonical value');
  }
}

export function uniqueStrings(values, at, code = 'DUPLICATE_VALUE') {
  const items = array(values, at);
  const seen = new Set();
  for (let index = 0; index < items.length; index += 1) {
    const value = string(items[index], pointer([at.slice(1), index]));
    if (seen.has(value)) fail(code, pointer([at.slice(1), index]), `duplicate value ${value}`);
    seen.add(value);
  }
  return items;
}

export function valueIn(value, allowed, at, code = 'INVALID_ENUM') {
  if (!allowed.includes(value)) fail(code, at, `unsupported value ${String(value)}`);
}
