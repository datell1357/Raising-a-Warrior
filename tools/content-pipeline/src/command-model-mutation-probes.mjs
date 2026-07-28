import { buildCommandModelFiles } from './command-model-generator.mjs';

const MUTATIONS = [
  {
    name: 'envelope-client-build-to-request-build',
    definition: 'commandEnvelope',
    typeName: 'CommandEnvelope',
    from: 'clientBuild',
    to: 'requestBuild',
    typescriptDeclaration: 'readonly requestBuild: string;',
    csharpConstructor: 'string requestBuild',
    csharpProperty: 'public string RequestBuild { get; }',
    csharpMapperRead: 'RequireString(reader.Take("requestBuild"), reader.Path("requestBuild"))',
  },
  {
    name: 'result-snapshot-required-to-requires-snapshot',
    definition: 'commandResult',
    typeName: 'CommandResult',
    from: 'snapshotRequired',
    to: 'requiresSnapshot',
    typescriptDeclaration: 'readonly requiresSnapshot: boolean;',
    csharpConstructor: 'bool requiresSnapshot',
    csharpProperty: 'public bool RequiresSnapshot { get; }',
    csharpMapperRead: 'RequireBoolean(reader.Take("requiresSnapshot"), reader.Path("requiresSnapshot"))',
  },
  {
    name: 'error-message-to-detail',
    definition: 'commandError',
    typeName: 'CommandError',
    from: 'message',
    to: 'detail',
    typescriptDeclaration: 'readonly detail: string;',
    csharpConstructor: 'string detail',
    csharpProperty: 'public string Detail { get; }',
    csharpMapperRead: 'RequireString(reader.Take("detail"), reader.Path("detail"))',
  },
];

function fail(name, language, expected) {
  throw new Error(`command schema mutation ${name} did not update ${language}: ${expected}`);
}

function mutateSchema(commandSchema, mutation) {
  const schema = JSON.parse(JSON.stringify(commandSchema));
  const definition = schema.$defs?.[mutation.definition];
  if (!definition?.properties?.[mutation.from] || !Array.isArray(definition.required)) {
    throw new Error(`mutation target is unsupported: ${mutation.definition}.${mutation.from}`);
  }
  definition.properties[mutation.to] = definition.properties[mutation.from];
  delete definition.properties[mutation.from];
  definition.required = definition.required.map((field) => field === mutation.from ? mutation.to : field);
  return schema;
}

function assertContains(source, name, language, expected) {
  if (!source.includes(expected)) fail(name, language, expected);
}

function assertAbsent(source, name, language, unexpected) {
  if (source.includes(unexpected)) fail(name, language, `must not contain ${unexpected}`);
}

function sourceBlock(source, name, language, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) fail(name, language, `missing ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) fail(name, language, `missing terminator ${endMarker}`);
  return source.slice(start, end + endMarker.length);
}

function typescriptInterfaceBlock(source, mutation) {
  return sourceBlock(source, mutation.name, 'TypeScript interface', `export interface ${mutation.typeName} {`, '\n');
}

function csharpClassBlock(source, mutation) {
  return sourceBlock(source, mutation.name, 'C# class', `  public sealed class ${mutation.typeName}\n`, '\n  }');
}

function csharpRootParserBlock(source, mutation) {
  return sourceBlock(source, mutation.name, 'C# root parser', `    public static ${mutation.typeName} Parse${mutation.typeName}(string json)`, '\n    }');
}

export function runCommandModelMutationProbes(commandSchema, sourceHash, generatorVersion) {
  return MUTATIONS.map((mutation) => {
    const files = buildCommandModelFiles(mutateSchema(commandSchema, mutation), sourceHash, generatorVersion);
    const typescriptInterface = typescriptInterfaceBlock(files.ts, mutation);
    const csharpClass = csharpClassBlock(files.cs, mutation);
    const csharpRootParser = csharpRootParserBlock(files.cs, mutation);
    const csharpType = mutation.csharpConstructor.split(' ')[0];
    assertContains(typescriptInterface, mutation.name, 'TypeScript declaration', mutation.typescriptDeclaration);
    assertAbsent(typescriptInterface, mutation.name, 'TypeScript declaration', `readonly ${mutation.from}:`);
    assertContains(csharpClass, mutation.name, 'C# constructor', mutation.csharpConstructor);
    assertAbsent(csharpClass, mutation.name, 'C# constructor', `${csharpType} ${mutation.from}`);
    assertContains(csharpClass, mutation.name, 'C# property', mutation.csharpProperty);
    assertAbsent(csharpClass, mutation.name, 'C# property', `public ${mutation.csharpProperty.split(' ')[1]} ${mutation.from[0].toUpperCase() + mutation.from.slice(1)} { get; }`);
    assertContains(csharpRootParser, mutation.name, 'C# mapper read', mutation.csharpMapperRead);
    assertAbsent(csharpRootParser, mutation.name, 'C# mapper read', `reader.Take("${mutation.from}")`);
    return {
      name: mutation.name,
      definition: mutation.definition,
      field: { from: mutation.from, to: mutation.to },
      checks: ['typescript-declaration', 'typescript-replaced-field-absent', 'csharp-constructor', 'csharp-constructor-replaced-field-absent', 'csharp-property', 'csharp-property-replaced-field-absent', 'csharp-mapper-read', 'csharp-mapper-replaced-field-absent'],
    };
  });
}

function cloneSchema(commandSchema) {
  return JSON.parse(JSON.stringify(commandSchema));
}

function renameField(schema, definitionName, from, to) {
  const definition = schema.$defs[definitionName];
  definition.properties[to] = definition.properties[from];
  delete definition.properties[from];
  definition.required = definition.required.map((field) => field === from ? to : field);
}

function removeField(schema, definitionName, field) {
  const definition = schema.$defs[definitionName];
  delete definition.properties[field];
  definition.required = definition.required.filter((required) => required !== field);
}

function assertProbe(name, condition, detail) {
  if (!condition) fail(name, 'adversarial probe', detail);
}

function commandBlock(files, typeName, parserName) {
  const rootMarker = `    public static ${typeName} ${parserName}(string json)`;
  const parser = files.cs.includes(rootMarker)
    ? sourceBlock(files.cs, typeName, 'C# parser', rootMarker, '\n    }')
    : sourceBlock(files.cs, typeName, 'C# parser', `    private static ${typeName} ${parserName}(JsonValue value, string path)`, '\n    }');
  return {
    ts: typescriptInterfaceBlock(files.ts, { name: typeName, typeName }),
    cs: csharpClassBlock(files.cs, { name: typeName, typeName }),
    parser,
  };
}

export function runCommandModelAdversarialProbes(commandSchema, sourceHash, generatorVersion) {
  const probes = [];
  const payload = cloneSchema(commandSchema);
  payload.$defs.commandPayload.properties.action = { const: 'ping' };
  delete payload.$defs.commandPayload.properties.kind;
  payload.$defs.commandPayload.required = ['action'];
  const payloadFiles = buildCommandModelFiles(payload, sourceHash, generatorVersion);
  const payloadBlock = commandBlock(payloadFiles, 'PingCommandPayload', 'ParsePingCommandPayload');
  assertProbe('payload-field-and-const', payloadBlock.ts.includes('readonly action: "ping";') && !payloadBlock.ts.includes('readonly kind:'), 'payload TypeScript replacement');
  assertProbe('payload-field-and-const', payloadBlock.cs.includes('PingCommandAction action') && !payloadBlock.cs.includes(' Kind { get; }'), 'payload C# replacement');
  assertProbe('payload-field-and-const', payloadBlock.parser.includes('reader.Take("action")') && !payloadBlock.parser.includes('reader.Take("kind")'), 'payload mapper replacement');
  probes.push({ name: 'payload-field-and-const', checks: ['typescript-scoped-replacement', 'csharp-scoped-replacement', 'mapper-scoped-replacement'] });

  const resultPayload = cloneSchema(commandSchema);
  renameField(resultPayload, 'resultPayload', 'ok', 'accepted');
  const resultFiles = buildCommandModelFiles(resultPayload, sourceHash, generatorVersion);
  const resultBlock = commandBlock(resultFiles, 'NoopResultPayload', 'ParseNoopResultPayload');
  assertProbe('result-payload-field', resultBlock.ts.includes('readonly accepted: boolean;') && !resultBlock.ts.includes('readonly ok:'), 'result TypeScript replacement');
  assertProbe('result-payload-field', resultBlock.cs.includes('bool accepted') && !resultBlock.cs.includes('bool ok'), 'result C# replacement');
  assertProbe('result-payload-field', resultBlock.parser.includes('reader.Take("accepted")') && !resultBlock.parser.includes('reader.Take("ok")'), 'result mapper replacement');
  probes.push({ name: 'result-payload-field', checks: ['typescript-scoped-replacement', 'csharp-scoped-replacement', 'mapper-scoped-replacement'] });

  const currency = cloneSchema(commandSchema);
  renameField(currency, 'currencyAmount', 'amount', 'quantity');
  currency.$defs.currencyAmount.properties.currencyId.enum.push('SunToken');
  const currencyFiles = buildCommandModelFiles(currency, sourceHash, generatorVersion);
  const currencyBlock = commandBlock(currencyFiles, 'CommandCurrencyAmount', 'ParseCommandCurrencyAmount');
  assertProbe('currency-field-and-enum', currencyBlock.ts.includes('readonly quantity: CanonicalDecimalString;') && !currencyBlock.ts.includes('readonly amount:'), 'currency TypeScript field replacement');
  assertProbe('currency-field-and-enum', currencyFiles.ts.includes('CommandCurrencyId') && currencyFiles.ts.includes('"SunToken"'), 'currency TypeScript enum');
  assertProbe('currency-field-and-enum', currencyBlock.cs.includes('CanonicalDecimalString quantity') && !currencyBlock.cs.includes('CanonicalDecimalString amount'), 'currency C# field replacement');
  assertProbe('currency-field-and-enum', currencyFiles.cs.includes('public enum CommandCurrencyId') && currencyFiles.cs.includes('SunToken'), 'currency C# enum');
  assertProbe('currency-field-and-enum', currencyBlock.parser.includes('reader.Take("quantity")') && !currencyBlock.parser.includes('reader.Take("amount")'), 'currency mapper replacement');
  probes.push({ name: 'currency-field-and-enum', checks: ['typescript-scoped-replacement', 'typescript-enum', 'csharp-scoped-replacement', 'csharp-enum', 'mapper-scoped-replacement'] });

  const domainError = cloneSchema(commandSchema);
  domainError.$defs.domainError.enum.push('Maintenance');
  const domainFiles = buildCommandModelFiles(domainError, sourceHash, generatorVersion);
  assertProbe('domain-error-enum', domainFiles.ts.includes('"Maintenance"') && domainFiles.cs.includes('DomainError.Maintenance'), 'domain error enum propagation');
  probes.push({ name: 'domain-error-enum', checks: ['typescript-enum', 'csharp-enum', 'csharp-mapper-enum'] });

  const removal = cloneSchema(commandSchema);
  removeField(removal, 'commandEnvelope', 'clientBuild');
  const removalFiles = buildCommandModelFiles(removal, sourceHash, generatorVersion);
  const removalBlock = commandBlock(removalFiles, 'CommandEnvelope', 'ParseCommandEnvelope');
  assertProbe('field-removal', !removalBlock.ts.includes('clientBuild') && !removalBlock.cs.includes('ClientBuild') && !removalBlock.parser.includes('clientBuild'), 'field removal propagation');
  probes.push({ name: 'field-removal', checks: ['typescript-scoped-absence', 'csharp-scoped-absence', 'mapper-scoped-absence'] });

  const unsupported = cloneSchema(commandSchema);
  unsupported.$defs.commandEnvelope.properties.clientBuild = { $ref: '#/$defs/contentVersion', type: 'string' };
  try {
    buildCommandModelFiles(unsupported, sourceHash, generatorVersion);
    fail('unsupported-shape-rejection', 'schema rejection', '$ref sibling was accepted');
  } catch (error) {
    if (!String(error.message).includes('$ref siblings')) throw error;
  }
  const unsupportedArray = cloneSchema(commandSchema);
  unsupportedArray.$defs.commandResult.properties.walletDelta.items = { type: 'string' };
  try {
    buildCommandModelFiles(unsupportedArray, sourceHash, generatorVersion);
    fail('unsupported-shape-rejection', 'schema rejection', 'array-of-string was accepted');
  } catch (error) {
    if (!String(error.message).includes('array shape')) throw error;
  }
  probes.push({ name: 'unsupported-shape-rejection', checks: ['ref-sibling-rejected', 'array-string-rejected'] });
  return probes;
}
