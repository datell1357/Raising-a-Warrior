function documentation(value) {
  return value ? `/** ${value.replace(/\*\//g, '* /')} */\n` : '';
}

function interfaceDeclaration(model) {
  const fields = model.fields.map((field) => `readonly ${field.jsonName}: ${field.ts};`).join(' ');
  return `${documentation(model.description)}export interface ${model.name} { ${fields} }`;
}

export function buildCommandTypescript(ir, header, sourceHash, generatorVersion) {
  const scalars = ir.scalarDefinitions.map((scalar) => `export type ${scalar.name} = Brand<string, '${scalar.name}'>;`).join('\n');
  const enums = ir.enums.filter((entry) => entry.owned);
  const enumDeclarations = enums.map((entry) => `export type ${entry.enumName} = ${entry.ts};`).join('\n');
  const objects = ir.objects.filter((entry) => !entry.external).map(interfaceDeclaration).join('\n');
  return `${header}
import type { CanonicalDecimalString, ContentVersion, FixedInt64String } from './content-models';

export const generatedCommandGeneratorVersion = ${JSON.stringify(generatorVersion)} as const;
export const generatedCommandSourceHash = ${JSON.stringify(sourceHash)} as const;
export const generatedCommandDefinitionSource = 'content/contracts/command.schema.json' as const;
export const generatedCommandDomainErrors = ${JSON.stringify(ir.enums.find((entry) => entry.enumName === 'DomainError')?.values ?? [])} as const;

export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };
${scalars}
${documentation(ir.description)}export type DomainError = typeof generatedCommandDomainErrors[number];
${enumDeclarations.split('\n').filter((entry) => !entry.startsWith('export type DomainError')).join('\n')}
${objects}
`;
}
