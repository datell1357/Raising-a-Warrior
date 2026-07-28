import { buildCommandModelFiles } from './command-model-generator.mjs';

export const A14_FRAMEWORK_TYPES = ['InvalidOperationException', 'ArgumentNullException', 'IReadOnlyList', 'List', 'Func', 'CultureInfo', 'NumberStyles'];

export function runA14FrameworkTypeProbes(schema, hash, version) {
  return A14_FRAMEWORK_TYPES.map((typeName) => {
    const candidate = JSON.parse(JSON.stringify(schema));
    const field = typeName[0].toLowerCase() + typeName.slice(1);
    candidate.$defs.resultPayload.properties[field] = { type: 'string', enum: ['x'] };
    candidate.$defs.resultPayload.required.push(field);
    try { buildCommandModelFiles(candidate, hash, version); } catch (error) {
      if (error.code === 'UNSUPPORTED_COMMAND_SCHEMA' && error.reason === `generated type collision ${typeName}`) return { name: `${typeName}-collision`, code: error.code, reason: error.reason };
      throw error;
    }
    throw new Error(`framework type collision accepted: ${typeName}`);
  });
}
