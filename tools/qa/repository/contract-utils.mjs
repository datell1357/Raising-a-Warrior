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
