// generator: 20260727T000000Z-task3
// source-hash: 50d81fc2acb0c98ef1666aabab54eafbd2ddef235159eeddcdf8ceb1dc364688
// source: content/contracts/command.schema.json

#nullable enable
using System;
using System.Collections.Generic;
using System.Globalization;

namespace Content.Generated
{
  public static class GeneratedCommandContract
  {
    public const string GeneratorVersion = "20260727T000000Z-task3";
    public const string SourceHash = "50d81fc2acb0c98ef1666aabab54eafbd2ddef235159eeddcdf8ceb1dc364688";
    public const string DefinitionSource = "content/contracts/command.schema.json";
  }

  public readonly struct StateVersion { public StateVersion(string value) { Value = value; } public string Value { get; } public override string ToString() { return Value; } }
  public readonly struct CommandId { public CommandId(string value) { Value = value; } public string Value { get; } public override string ToString() { return Value; } }
  public enum CommandCurrencyId { BrassCoin, MoonShard, StarSeal, MetalFragment }
  public enum NoopCommandKind { Noop }
  /// <summary>IdempotencyConflict reports reuse of a commandId with a different authenticated actor, operation, or canonical request hash. AlreadyProcessed is reserved for a new command whose semantic entitlement key was already consumed by an earlier command.</summary>
  public enum DomainError { VersionConflict, ContentOutdated, InsufficientCurrency, NotEligible, LimitReached, InvalidReceipt, ExpiredToken, IdempotencyConflict, AlreadyProcessed, TemporarilyUnavailable }
  public sealed class CommandCurrencyAmount
  {
    public CommandCurrencyAmount(CommandCurrencyId currencyId, CanonicalDecimalString amount)
    {
      CurrencyId = currencyId;
      Amount = amount;
    }
        public CommandCurrencyId CurrencyId { get; }
    public CanonicalDecimalString Amount { get; }
  }

  public sealed class NoopCommandPayload
  {
    public NoopCommandPayload(NoopCommandKind kind)
    {
      Kind = kind;
    }
        public NoopCommandKind Kind { get; }
  }

  public sealed class NoopResultPayload
  {
    public NoopResultPayload(bool ok)
    {
      Ok = ok;
    }
        public bool Ok { get; }
  }

  /// <summary>A commandId is idempotent within the authenticated actor and operation. An exact retry with the same actor, operation, and canonical request hash returns the original response; a different actor, operation, or request hash using the same commandId returns IdempotencyConflict.</summary>
  public sealed class CommandEnvelope
  {
    public CommandEnvelope(CommandId commandId, StateVersion expectedStateVersion, string clientBuild, ContentVersion contentVersion, NoopCommandPayload payload)
    {
      CommandId = commandId;
      ExpectedStateVersion = expectedStateVersion;
      ClientBuild = clientBuild;
      ContentVersion = contentVersion;
      Payload = payload;
    }
        public CommandId CommandId { get; }
    public StateVersion ExpectedStateVersion { get; }
    public string ClientBuild { get; }
    public ContentVersion ContentVersion { get; }
    public NoopCommandPayload Payload { get; }
  }

  public sealed class CommandResult
  {
    public CommandResult(CommandId commandId, StateVersion stateVersion, FixedInt64String serverTime, IReadOnlyList<CommandCurrencyAmount> walletDelta, NoopResultPayload payload, bool snapshotRequired)
    {
      CommandId = commandId;
      StateVersion = stateVersion;
      ServerTime = serverTime;
      WalletDelta = walletDelta;
      Payload = payload;
      SnapshotRequired = snapshotRequired;
    }
        public CommandId CommandId { get; }
    public StateVersion StateVersion { get; }
    public FixedInt64String ServerTime { get; }
    public IReadOnlyList<CommandCurrencyAmount> WalletDelta { get; }
    public NoopResultPayload Payload { get; }
    public bool SnapshotRequired { get; }
  }

  public sealed class CommandError
  {
    public CommandError(CommandId commandId, DomainError error, string message)
    {
      CommandId = commandId;
      Error = error;
      Message = message;
    }
        public CommandId CommandId { get; }
    public DomainError Error { get; }
    public string Message { get; }
  }

  public static class CanonicalCommandJson
  {
    public static T DeserializeAndValidate<T>(string json) where T : class
    {
      if (typeof(T) == typeof(CommandEnvelope)) return (T)(object)CommandModelMapper.ParseCommandEnvelope(json);
      if (typeof(T) == typeof(CommandResult)) return (T)(object)CommandModelMapper.ParseCommandResult(json);
      if (typeof(T) == typeof(CommandError)) return (T)(object)CommandModelMapper.ParseCommandError(json);
      throw new InvalidOperationException("unsupported command contract model");
    }
  }

  internal static class CommandModelMapper
  {
    public static CommandEnvelope ParseCommandEnvelope(string json)
    {
      return MapObject(Parse(json), string.Empty, reader => new CommandEnvelope(
        new CommandId(RequireString(reader.Take("commandId"), reader.Path("commandId"))),
        ParseStateVersion(reader.Take("expectedStateVersion"), reader.Path("expectedStateVersion")),
        RequireString(reader.Take("clientBuild"), reader.Path("clientBuild")),
        new ContentVersion(RequireString(reader.Take("contentVersion"), reader.Path("contentVersion"))),
        ParseNoopCommandPayload(reader.Take("payload"), reader.Path("payload"))));
    }

    public static CommandResult ParseCommandResult(string json)
    {
      return MapObject(Parse(json), string.Empty, reader => new CommandResult(
        new CommandId(RequireString(reader.Take("commandId"), reader.Path("commandId"))),
        ParseStateVersion(reader.Take("stateVersion"), reader.Path("stateVersion")),
        ParseFixedInt64(reader.Take("serverTime"), reader.Path("serverTime")),
        ParseList(reader.Take("walletDelta"), reader.Path("walletDelta"), ParseCommandCurrencyAmount),
        ParseNoopResultPayload(reader.Take("payload"), reader.Path("payload")),
        RequireBoolean(reader.Take("snapshotRequired"), reader.Path("snapshotRequired"))));
    }

    public static CommandError ParseCommandError(string json)
    {
      return MapObject(Parse(json), string.Empty, reader => new CommandError(
        new CommandId(RequireString(reader.Take("commandId"), reader.Path("commandId"))),
        ParseDomainError(reader.Take("error"), reader.Path("error")),
        RequireString(reader.Take("message"), reader.Path("message"))));
    }

    private static CommandCurrencyAmount ParseCommandCurrencyAmount(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new CommandCurrencyAmount(
        ParseCommandCurrencyId(reader.Take("currencyId"), reader.Path("currencyId")),
        ParseCanonicalDecimal(reader.Take("amount"), reader.Path("amount"))));
    }

    private static NoopCommandPayload ParseNoopCommandPayload(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new NoopCommandPayload(
        ParseNoopCommandKind(reader.Take("kind"), reader.Path("kind"))));
    }

    private static NoopResultPayload ParseNoopResultPayload(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new NoopResultPayload(
        RequireBoolean(reader.Take("ok"), reader.Path("ok"))));
    }

    private static JsonValue Parse(string json) { if (json == null) throw new ArgumentNullException(nameof(json)); return new JsonParser(json).Parse(); }
    private static T MapObject<T>(JsonValue value, string path, Func<JsonObjectReader, T> map) { var objectValue = value as JsonObjectValue; if (objectValue == null) throw new InvalidOperationException(DisplayPath(path) + " must be an object"); var reader = new JsonObjectReader(objectValue, path); var result = map(reader); reader.Complete(); return result; }
    private static IReadOnlyList<T> ParseList<T>(JsonValue value, string path, Func<JsonValue, string, T> parseItem) { var array = value as JsonArrayValue; if (array == null) throw new InvalidOperationException(DisplayPath(path) + " must be an array"); var result = new List<T>(array.Items.Count); for (var index = 0; index < array.Items.Count; index += 1) result.Add(parseItem(array.Items[index], path + "/" + index.ToString(CultureInfo.InvariantCulture))); return result; }
    private static string RequireString(JsonValue value, string path) { var stringValue = value as JsonStringValue; if (stringValue == null) throw new InvalidOperationException(DisplayPath(path) + " must be a string"); return stringValue.Value; }
    private static bool RequireBoolean(JsonValue value, string path) { var booleanValue = value as JsonBooleanValue; if (booleanValue == null) throw new InvalidOperationException(DisplayPath(path) + " must be a boolean"); return booleanValue.Value; }
    private static StateVersion ParseStateVersion(JsonValue value, string path)
    {
      var raw = RequireString(value, path);
      if (!IsUnsignedCanonical(raw)) throw new InvalidOperationException(DisplayPath(path) + " must be a canonical state version");
      return new StateVersion(raw);
    }
    private static CanonicalDecimalString ParseCanonicalDecimal(JsonValue value, string path) { var raw = RequireString(value, path); if (!IsUnsignedCanonical(raw)) throw new InvalidOperationException(DisplayPath(path) + " must be a canonical unsigned decimal string"); return new CanonicalDecimalString(raw); }
    private static FixedInt64String ParseFixedInt64(JsonValue value, string path) { var raw = RequireString(value, path); long parsed; if (!IsSignedCanonical(raw) || !long.TryParse(raw, NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out parsed)) throw new InvalidOperationException(DisplayPath(path) + " must be a signed 64-bit canonical decimal string"); return new FixedInt64String(raw); }
    private static bool IsUnsignedCanonical(string value) { if (value.Length == 0) return false; if (value[0] == '0') return value.Length == 1; for (var index = 0; index < value.Length; index += 1) if (value[index] < '0' || value[index] > '9') return false; return true; }
    private static bool IsSignedCanonical(string value) { return value.Length > 0 && (value[0] == '-' ? value.Length > 1 && IsUnsignedCanonical(value.Substring(1)) : IsUnsignedCanonical(value)); }
    private static CommandCurrencyId ParseCommandCurrencyId(JsonValue value, string path)
    {
      switch (RequireString(value, path))
      {
        case "BrassCoin": return CommandCurrencyId.BrassCoin;
        case "MoonShard": return CommandCurrencyId.MoonShard;
        case "StarSeal": return CommandCurrencyId.StarSeal;
        case "MetalFragment": return CommandCurrencyId.MetalFragment;
        default: throw InvalidEnum(path, "CommandCurrencyId");
      }
    }

    private static NoopCommandKind ParseNoopCommandKind(JsonValue value, string path)
    {
      switch (RequireString(value, path))
      {
        case "noop": return NoopCommandKind.Noop;
        default: throw InvalidEnum(path, "NoopCommandKind");
      }
    }

    private static DomainError ParseDomainError(JsonValue value, string path)
    {
      switch (RequireString(value, path))
      {
        case "VersionConflict": return DomainError.VersionConflict;
        case "ContentOutdated": return DomainError.ContentOutdated;
        case "InsufficientCurrency": return DomainError.InsufficientCurrency;
        case "NotEligible": return DomainError.NotEligible;
        case "LimitReached": return DomainError.LimitReached;
        case "InvalidReceipt": return DomainError.InvalidReceipt;
        case "ExpiredToken": return DomainError.ExpiredToken;
        case "IdempotencyConflict": return DomainError.IdempotencyConflict;
        case "AlreadyProcessed": return DomainError.AlreadyProcessed;
        case "TemporarilyUnavailable": return DomainError.TemporarilyUnavailable;
        default: throw InvalidEnum(path, "DomainError");
      }
    }
    private static string DisplayPath(string path) { return path.Length == 0 ? "/" : path; }
    private static InvalidOperationException InvalidEnum(string path, string enumName) { return new InvalidOperationException(DisplayPath(path) + " is not a valid " + enumName); }
  }
}
