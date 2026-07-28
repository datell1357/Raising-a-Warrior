function documentation(value) {
  return value ? `  /// <summary>${value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</summary>\n` : '';
}

function classDeclaration(model) {
  const parameters = model.fields.map((field) => `${field.cs} ${field.parameterName}`).join(', ');
  const assignments = model.fields.map((field) => `      ${field.propertyName} = ${field.parameterName};`).join('\n');
  const properties = model.fields.map((field) => `    public ${field.cs} ${field.propertyName} { get; }`).join('\n');
  return `${documentation(model.description)}  public sealed class ${model.name}
  {
    public ${model.name}(${parameters})
    {
${assignments}
    }
    ${properties}
  }`;
}

function enumParser(entry) {
  const cases = entry.values.map((value, index) => `        case ${JSON.stringify(value)}: return ${entry.enumName}.${entry.members[index]};`).join('\n');
  return `    private static ${entry.enumName} Parse${entry.enumName}(JsonValue value, string path)
    {
      switch (RequireString(value, path))
      {
${cases}
        default: throw InvalidEnum(path, "${entry.enumName}");
      }
    }`;
}

function readExpression(field, value = 'value', path = 'path') {
  if (field.parser === 'string') return `RequireString(${value}, ${path})`;
  if (field.parser === 'boolean') return `RequireBoolean(${value}, ${path})`;
  if (field.parser === 'unsigned') return `ParseCanonicalDecimal(${value}, ${path})`;
  if (field.parser === 'signed') return `ParseFixedInt64(${value}, ${path})`;
  if (field.parser === 'enum') return `Parse${field.enumName}(${value}, ${path})`;
  if (field.parser === 'object') return `Parse${field.cs}(${value}, ${path})`;
  if (field.parser === 'array') return `ParseList(${value}, ${path}, Parse${field.item.cs})`;
  if (field.parser === 'reference') {
    if (field.definition === 'contentVersion') return `new ContentVersion(RequireString(${value}, ${path}))`;
    if (field.scalar.parser === 'unsigned') return `Parse${field.cs}(${value}, ${path})`;
    return `new ${field.cs}(RequireString(${value}, ${path}))`;
  }
  throw new Error(`unsupported mapper field ${field.jsonName}`);
}

function objectParser(model) {
  const fields = model.fields.map((field) => `        ${readExpression(field, `reader.Take("${field.jsonName}")`, `reader.Path("${field.jsonName}")`)}`).join(',\n');
  return `    public static ${model.name} Parse${model.name}(string json)
    {
      return MapObject(Parse(json), string.Empty, reader => new ${model.name}(
${fields}));
    }`;
}

function nestedObjectParser(model) {
  const fields = model.fields.map((field) => `        ${readExpression(field, `reader.Take("${field.jsonName}")`, `reader.Path("${field.jsonName}")`)}`).join(',\n');
  return `    private static ${model.name} Parse${model.name}(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new ${model.name}(
${fields}));
    }`;
}

function scalarParser(scalar) {
  if (scalar.parser !== 'unsigned') return '';
  return `    private static ${scalar.name} Parse${scalar.name}(JsonValue value, string path)
    {
      var raw = RequireString(value, path);
      if (!IsUnsignedCanonical(raw)) throw new InvalidOperationException(DisplayPath(path) + " must be a canonical state version");
      return new ${scalar.name}(raw);
    }`;
}

export function buildCommandCsharp(ir, header, sourceHash, generatorVersion) {
  const roots = ir.roots.map((root) => ir.objects.find((model) => model.definition === root.definition));
  const models = ir.objects.filter((model) => !model.external);
  const rootDefinitions = new Set(ir.roots.map((root) => root.definition));
  const nested = ir.objects.filter((model) => !rootDefinitions.has(model.definition));
  const dispatch = roots.map((root) => `      if (typeof(T) == typeof(${root.name})) return (T)(object)CommandModelMapper.Parse${root.name}(json);`).join('\n');
  return `${header}
#nullable enable
using System;
using System.Collections.Generic;
using System.Globalization;

namespace Content.Generated
{
  public static class GeneratedCommandContract
  {
    public const string GeneratorVersion = ${JSON.stringify(generatorVersion)};
    public const string SourceHash = ${JSON.stringify(sourceHash)};
    public const string DefinitionSource = "content/contracts/command.schema.json";
  }

${ir.scalarDefinitions.map((scalar) => `  public readonly struct ${scalar.name} { public ${scalar.name}(string value) { Value = value; } public string Value { get; } public override string ToString() { return Value; } }`).join('\n')}
${ir.enums.filter((entry) => entry.owned).map((entry) => `${documentation(entry.enumName === 'DomainError' ? ir.description : null)}  public enum ${entry.enumName} { ${entry.members.join(', ')} }`).join('\n')}
${models.map(classDeclaration).join('\n\n')}

  public static class CanonicalCommandJson
  {
    public static T DeserializeAndValidate<T>(string json) where T : class
    {
${dispatch}
      throw new InvalidOperationException("unsupported command contract model");
    }
  }

  internal static class CommandModelMapper
  {
${roots.map(objectParser).join('\n\n')}

${nested.map(nestedObjectParser).join('\n\n')}

    private static JsonValue Parse(string json) { if (json == null) throw new ArgumentNullException(nameof(json)); return new JsonParser(json).Parse(); }
    private static T MapObject<T>(JsonValue value, string path, Func<JsonObjectReader, T> map) { var objectValue = value as JsonObjectValue; if (objectValue == null) throw new InvalidOperationException(DisplayPath(path) + " must be an object"); var reader = new JsonObjectReader(objectValue, path); var result = map(reader); reader.Complete(); return result; }
    private static IReadOnlyList<T> ParseList<T>(JsonValue value, string path, Func<JsonValue, string, T> parseItem) { var array = value as JsonArrayValue; if (array == null) throw new InvalidOperationException(DisplayPath(path) + " must be an array"); var result = new List<T>(array.Items.Count); for (var index = 0; index < array.Items.Count; index += 1) result.Add(parseItem(array.Items[index], path + "/" + index.ToString(CultureInfo.InvariantCulture))); return result; }
    private static string RequireString(JsonValue value, string path) { var stringValue = value as JsonStringValue; if (stringValue == null) throw new InvalidOperationException(DisplayPath(path) + " must be a string"); return stringValue.Value; }
    private static bool RequireBoolean(JsonValue value, string path) { var booleanValue = value as JsonBooleanValue; if (booleanValue == null) throw new InvalidOperationException(DisplayPath(path) + " must be a boolean"); return booleanValue.Value; }
${ir.scalarDefinitions.map(scalarParser).filter(Boolean).join('\n\n')}
    private static CanonicalDecimalString ParseCanonicalDecimal(JsonValue value, string path) { var raw = RequireString(value, path); if (!IsUnsignedCanonical(raw)) throw new InvalidOperationException(DisplayPath(path) + " must be a canonical unsigned decimal string"); return new CanonicalDecimalString(raw); }
    private static FixedInt64String ParseFixedInt64(JsonValue value, string path) { var raw = RequireString(value, path); long parsed; if (!IsSignedCanonical(raw) || !long.TryParse(raw, NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out parsed)) throw new InvalidOperationException(DisplayPath(path) + " must be a signed 64-bit canonical decimal string"); return new FixedInt64String(raw); }
    private static bool IsUnsignedCanonical(string value) { if (value.Length == 0) return false; if (value[0] == '0') return value.Length == 1; for (var index = 0; index < value.Length; index += 1) if (value[index] < '0' || value[index] > '9') return false; return true; }
    private static bool IsSignedCanonical(string value) { return value.Length > 0 && (value[0] == '-' ? value.Length > 1 && IsUnsignedCanonical(value.Substring(1)) : IsUnsignedCanonical(value)); }
${ir.enums.map(enumParser).join('\n\n')}
    private static string DisplayPath(string path) { return path.Length == 0 ? "/" : path; }
    private static InvalidOperationException InvalidEnum(string path, string enumName) { return new InvalidOperationException(DisplayPath(path) + " is not a valid " + enumName); }
  }
}
`;
}
