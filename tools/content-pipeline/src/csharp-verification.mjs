import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const CSHARP_TEST_DIR = '/var/folders/9w/thp6pq292t327z1q3r5vg9m00000gn/T/opencode/a14-csharp-roundtrip';

export const CSHARP_INVALID_CASES = [
  ['empty-document', 'GameSnapshot'],
  ['missing-required-field', 'GameSnapshot'],
  ['wrong-field-type', 'GameSnapshot'],
  ['numeric-enum', 'GameSnapshot'],
  ['numeric-command-enum', 'CommandEnvelope'],
  ['cross-enum-snapshot-id', 'GameSnapshot'],
  ['cross-enum-quest-kind', 'GameSnapshot'],
  ['cross-enum-quest-group', 'GameSnapshot'],
  ['cross-enum-skill-phase', 'GameSnapshot'],
  ['cross-enum-rarity', 'GameSnapshot'],
  ['cross-enum-currency-id', 'GameSnapshot'],
  ['cross-enum-product-kind', 'GameSnapshot'],
  ['cross-enum-promotion-kind', 'GameSnapshot'],
  ['cross-enum-locale', 'GameSnapshot'],
  ['cross-enum-domain-error', 'CommandError'],
  ['cross-enum-unlock-kind', 'GameSnapshot'],
  ['cross-enum-noop-kind', 'CommandEnvelope'],
  ['result-snapshot-required-wrong-type', 'CommandResult'],
  ['empty-content-version', 'GameSnapshot'],
  ['unexpected-field', 'GameSnapshot'],
].map(([name, target]) => ({ name, target }));

export const CSHARP_EXPECTED_ROUTES = [
  ['empty-document', 'GameSnapshot', 'CanonicalJson'], ['missing-required-field', 'GameSnapshot', 'CanonicalJson'], ['wrong-field-type', 'GameSnapshot', 'CanonicalJson'], ['numeric-enum', 'GameSnapshot', 'CanonicalJson'], ['numeric-command-enum', 'CommandEnvelope', 'CanonicalCommandJson'], ['cross-enum-snapshot-id', 'GameSnapshot', 'CanonicalJson'], ['cross-enum-quest-kind', 'GameSnapshot', 'CanonicalJson'], ['cross-enum-quest-group', 'GameSnapshot', 'CanonicalJson'], ['cross-enum-skill-phase', 'GameSnapshot', 'CanonicalJson'], ['cross-enum-rarity', 'GameSnapshot', 'CanonicalJson'], ['cross-enum-currency-id', 'GameSnapshot', 'CanonicalJson'], ['cross-enum-product-kind', 'GameSnapshot', 'CanonicalJson'], ['cross-enum-promotion-kind', 'GameSnapshot', 'CanonicalJson'], ['cross-enum-locale', 'GameSnapshot', 'CanonicalJson'], ['cross-enum-domain-error', 'CommandError', 'CanonicalCommandJson'], ['cross-enum-unlock-kind', 'GameSnapshot', 'CanonicalJson'], ['cross-enum-noop-kind', 'CommandEnvelope', 'CanonicalCommandJson'], ['result-snapshot-required-wrong-type', 'CommandResult', 'CanonicalCommandJson'], ['empty-content-version', 'GameSnapshot', 'CanonicalJson'], ['unexpected-field', 'GameSnapshot', 'CanonicalJson'],
].map(([name, target, parser]) => ({ name, target, parser }));

export function parserRoutesMatch(expected, actual) {
  return expected.length === actual.length && expected.every((route, index) => route.name === actual[index].name && route.target === actual[index].target && route.parser === actual[index].parser);
}

function libraryProject(root) {
  const generated = resolve(root, 'content/generated/csharp');
  return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.1</TargetFramework>
    <LangVersion>9.0</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>disable</ImplicitUsings>
    <EnableDefaultCompileItems>false</EnableDefaultCompileItems>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  </PropertyGroup>
  <ItemGroup>
    <Compile Include="${resolve(generated, 'ContentModels.cs')}" Link="ContentModels.cs" />
    <Compile Include="${resolve(generated, 'CommandModels.cs')}" Link="CommandModels.cs" />
    <Compile Include="${resolve(generated, 'launch-models.cs')}" Link="launch-models.cs" />
    <Compile Include="${resolve(generated, 'd90-models.cs')}" Link="d90-models.cs" />
  </ItemGroup>
</Project>
`;
}

function hostProject() {
  return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <LangVersion>9.0</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>disable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="../GeneratedModels/GeneratedModels.csproj" />
  </ItemGroup>
</Project>
`;
}

function hostProgram() {
  return `using System;
using System.Collections.Generic;
using System.IO;
using Content.Generated;

internal static class Program
{
    private sealed class InvalidCase
    {
        public InvalidCase(string name, string json) : this(name, json, "GameSnapshot")
        {
        }

        public InvalidCase(string name, string json, string target)
        {
            Name = name;
            Json = json;
            Target = target;
        }

        public string Name { get; }
        public string Json { get; }
        public string Target { get; }
    }

    private sealed class SelectedParser
    {
        public SelectedParser(string name, Func<string, object> parse) { Name = name; Parse = parse; }
        public string Name { get; }
        public Func<string, object> Parse { get; }
    }

    private static int Main(string[] args)
    {
        if (args.Length != 5)
        {
            throw new InvalidOperationException("expected launch, d90, command envelope, command result, and command error fixture paths");
        }

        var launchJson = File.ReadAllText(args[0]);
        var d90Json = File.ReadAllText(args[1]);
        var launch = CanonicalJson.DeserializeAndValidate<GameSnapshot>(launchJson);
        var d90 = CanonicalJson.DeserializeAndValidate<GameSnapshot>(d90Json);
        var commandEnvelopeJson = File.ReadAllText(args[2]);
        var commandResultJson = File.ReadAllText(args[3]);
        var commandErrorJson = File.ReadAllText(args[4]);
        var commandEnvelope = CanonicalCommandJson.DeserializeAndValidate<CommandEnvelope>(commandEnvelopeJson);
        var commandResult = CanonicalCommandJson.DeserializeAndValidate<CommandResult>(commandResultJson);
        var commandError = CanonicalCommandJson.DeserializeAndValidate<CommandError>(commandErrorJson);

        AssertLaunch(launch);
        AssertD90(d90);
        AssertCommands(commandEnvelope, commandResult, commandError);
        AssertParserWitness(SelectInvalidParser(new InvalidCase("witness-game", string.Empty, "GameSnapshot")), launchJson, "GameSnapshot");
        AssertParserWitness(SelectInvalidParser(new InvalidCase("witness-envelope", string.Empty, "CommandEnvelope")), commandEnvelopeJson, "CommandEnvelope");
        AssertParserWitness(SelectInvalidParser(new InvalidCase("witness-result", string.Empty, "CommandResult")), commandResultJson, "CommandResult");
        AssertParserWitness(SelectInvalidParser(new InvalidCase("witness-error", string.Empty, "CommandError")), commandErrorJson, "CommandError");
        AssertWrongDelegateControl(commandEnvelopeJson);
        AssertUnknownInvalidTargetFails();

        foreach (var invalidCase in BuildInvalidCases(launchJson, commandEnvelopeJson, commandResultJson, commandErrorJson))
        {
            ExpectInvalid(invalidCase);
        }

        Console.WriteLine(
            "MODEL launch regions=" + launch.Regions.Count
            + " stages=" + launch.Stages.Count
            + " cells=" + launch.Cells.Count
            + " skills=" + launch.Skills.Count
            + " firstRegion=" + launch.Regions[0].Id.Value
            + " firstSkill=" + launch.Skills[0].Id.Value
            + " cap=" + launch.OfflineRewardCapSeconds.Value);
        Console.WriteLine(
            "MODEL d90 regions=" + d90.Regions.Count
            + " stages=" + d90.Stages.Count
            + " cells=" + d90.Cells.Count
            + " skills=" + d90.Skills.Count
            + " lastSkill=" + d90.Skills[d90.Skills.Count - 1].Id.Value
            + " cap=" + d90.OfflineRewardCapSeconds.Value);
        Console.WriteLine(
            "COMMAND envelope=" + commandEnvelope.CommandId.Value
            + " kind=" + commandEnvelope.Payload.Kind
            + " resultWallet=" + commandResult.WalletDelta.Count
            + " error=" + commandError.Error
            + " domainErrors=" + Enum.GetNames(typeof(DomainError)).Length);
        Console.WriteLine("CSharpRoundtrip PASS");
        return 0;
    }

    private static void AssertLaunch(GameSnapshot snapshot)
    {
        Assert(snapshot.SnapshotId == SnapshotId.Launch, "launch snapshot id");
        Assert(snapshot.ContentVersion.Value == "20260727T000000Z-task3-content", "launch content version");
        Assert(snapshot.OfflineRewardCapSeconds.Value == "1", "launch cap");
        Assert(snapshot.Baseline.Weeks == 64 && snapshot.Baseline.LaunchBaseline == "3/30/300", "launch baseline");
        Assert(snapshot.Regions.Count == 3 && snapshot.Regions[0].Id.Value == "RG-01", "launch regions");
        Assert(snapshot.Stages.Count == 30 && snapshot.Stages[0].BossCellId.Value == "CL-0010", "launch stages");
        Assert(snapshot.Cells.Count == 300 && snapshot.Cells[0].RewardKey == "reward.cell.0001", "launch cells");
        Assert(snapshot.Quests.Main.Count == 20 && snapshot.Quests.Daily.Count == 8, "launch quests");
        Assert(snapshot.Quests.Main[0].Objective.Kind == QuestKind.ReachLevel, "launch quest objective");
        Assert(snapshot.Skills.Count == 18 && snapshot.Skills[0].Id.Value == "SK-001", "launch skills");
        Assert(snapshot.Skills[0].LearnCost[0].CurrencyId == CurrencyId.BrassCoin, "launch skill cost");
        Assert(snapshot.Equipment.Count == 60 && snapshot.Equipment[0].BaseStats.Attack.Value == "1000", "launch equipment");
        Assert(snapshot.SummonPools.Count == 1 && snapshot.SummonPools[0].Entries.Count == 10, "launch summon pool");
        Assert(snapshot.SummonPools[0].DuplicateConversion["Astral"] == 5, "launch duplicate conversion");
        Assert(snapshot.StoreProducts.Count == 9 && snapshot.StoreProducts[0].Kind == ProductKind.FreeDaily, "launch store");
        Assert(snapshot.Promotions.Count == 6 && snapshot.Promotions[0].Kind == PromotionKind.Launch, "launch promotions");
        Assert(snapshot.LocaleCatalogs.Count == 5 && snapshot.LocaleCatalogs[0].Locale == Locale.Ko, "launch locales");
        Assert(snapshot.Manifests.Count == 6 && snapshot.Manifests[0].Id.Value == "MAN-launch-01", "launch manifests");
        Assert(snapshot.ReleaseCandidates.Count == 6 && snapshot.ReleaseCandidates[0].Kind == "schemas", "launch candidates");
        Assert(snapshot.Ownership.FeatureCount == 18 && snapshot.Ownership.SpecCount == 55, "launch ownership");
    }

    private static void AssertD90(GameSnapshot snapshot)
    {
        Assert(snapshot.SnapshotId == SnapshotId.D90, "d90 snapshot id");
        Assert(snapshot.OfflineRewardCapSeconds.Value == "2", "d90 cap");
        Assert(snapshot.Baseline.LaunchBaseline == "6/60/600", "d90 baseline");
        Assert(snapshot.Regions.Count == 6 && snapshot.Stages.Count == 60 && snapshot.Cells.Count == 600, "d90 world counts");
        Assert(snapshot.Skills.Count == 24, "d90 skill count");
        var lastSkill = snapshot.Skills[snapshot.Skills.Count - 1];
        Assert(lastSkill.Id.Value == "SK-024" && lastSkill.Phase == SkillPhase.D90, "d90 last skill");
        Assert(snapshot.Manifests[0].Id.Value == "MAN-d90-01", "d90 manifest");
        Assert(snapshot.ReleaseCandidates[0].Id.Value == "RC-d90-01", "d90 release candidate");
    }

    private static void AssertCommands(CommandEnvelope envelope, CommandResult result, CommandError error)
    {
        Assert(envelope.CommandId.Value == "cmd-001", "command envelope id");
        Assert(envelope.ExpectedStateVersion.Value == "1", "command envelope state version");
        Assert(envelope.Payload.Kind == NoopCommandKind.Noop, "command envelope noop kind");
        Assert(result.CommandId.Value == "cmd-001" && result.Payload.Ok, "command result payload");
        Assert(result.WalletDelta.Count == 1 && result.WalletDelta[0].Amount.Value == "1", "command result wallet");
        Assert(error.CommandId.Value == "cmd-001" && error.Error == DomainError.IdempotencyConflict, "command error idempotency conflict");
        var expectedErrors = "VersionConflict,ContentOutdated,InsufficientCurrency,NotEligible,LimitReached,InvalidReceipt,ExpiredToken,IdempotencyConflict,AlreadyProcessed,TemporarilyUnavailable";
        Assert(string.Join(",", Enum.GetNames(typeof(DomainError))) == expectedErrors, "command domain error synchronization");
    }

    private static IReadOnlyList<InvalidCase> BuildInvalidCases(string launchJson, string commandEnvelopeJson, string commandResultJson, string commandErrorJson)
    {
        return new List<InvalidCase>
        {
            new InvalidCase("empty-document", string.Empty),
            new InvalidCase("missing-required-field", ReplaceOnce(launchJson, "  \\"offlineRewardCapSeconds\\": \\"1\\",\\n", string.Empty)),
            new InvalidCase("wrong-field-type", ReplaceOnce(launchJson, "  \\"regions\\": [", "  \\"regions\\": \\"wrong\\", \\"discardedRegions\\": [")),
            new InvalidCase("numeric-enum", ReplaceOnce(launchJson, "\\"phase\\": \\"launch\\"", "\\"phase\\": 1")),
            new InvalidCase("numeric-command-enum", ReplaceOnce(commandEnvelopeJson, "\\"kind\\": \\"noop\\"", "\\"kind\\": 1"), "CommandEnvelope"),
            new InvalidCase("cross-enum-snapshot-id", ReplaceOnce(launchJson, "\\"snapshotId\\": \\"launch\\"", "\\"snapshotId\\": \\"Common\\"")),
            new InvalidCase("cross-enum-quest-kind", ReplaceOnce(launchJson, "\\"kind\\": \\"ReachLevel\\"", "\\"kind\\": \\"launch\\"")),
            new InvalidCase("cross-enum-quest-group", ReplaceOnce(launchJson, "\\"group\\": \\"main\\"", "\\"group\\": \\"launch\\"")),
            new InvalidCase("cross-enum-skill-phase", ReplaceOnce(launchJson, "\\"phase\\": \\"launch\\"", "\\"phase\\": \\"Common\\"")),
            new InvalidCase("cross-enum-rarity", ReplaceOnce(launchJson, "\\"rarity\\": \\"Common\\"", "\\"rarity\\": \\"launch\\"")),
            new InvalidCase("cross-enum-currency-id", ReplaceOnce(launchJson, "\\"currencyId\\": \\"BrassCoin\\"", "\\"currencyId\\": \\"Rare\\"")),
            new InvalidCase("cross-enum-product-kind", ReplaceOnce(launchJson, "\\"kind\\": \\"FreeDaily\\"", "\\"kind\\": \\"scheduled\\"")),
            new InvalidCase("cross-enum-promotion-kind", ReplaceOnce(launchJson, "\\"kind\\": \\"launch\\"", "\\"kind\\": \\"FreeDaily\\"")),
            new InvalidCase("cross-enum-locale", ReplaceOnce(launchJson, "\\"locale\\": \\"ko\\"", "\\"locale\\": \\"launch\\"")),
            new InvalidCase("cross-enum-domain-error", ReplaceOnce(commandErrorJson, "\\"error\\": \\"IdempotencyConflict\\"", "\\"error\\": \\"Common\\""), "CommandError"),
            new InvalidCase("cross-enum-unlock-kind", ReplaceOnce(launchJson, "\\"kind\\": \\"Always\\"", "\\"kind\\": \\"noop\\"")),
            new InvalidCase("cross-enum-noop-kind", ReplaceOnce(commandEnvelopeJson, "\\"kind\\": \\"noop\\"", "\\"kind\\": \\"launch\\""), "CommandEnvelope"),
            new InvalidCase("result-snapshot-required-wrong-type", ReplaceOnce(commandResultJson, "\\"snapshotRequired\\": false", "\\"snapshotRequired\\": \\"wrong\\""), "CommandResult"),
            new InvalidCase("empty-content-version", ReplaceOnce(launchJson, "\\"contentVersion\\": \\"20260727T000000Z-task3-content\\"", "\\"contentVersion\\": \\"\\"")),
            new InvalidCase("unexpected-field", ReplaceOnce(launchJson, "\\"snapshotId\\": \\"launch\\",", "\\"snapshotId\\": \\"launch\\", \\"extra\\": true,")),
        };
    }

    private static string ReplaceOnce(string source, string oldValue, string newValue)
    {
        var index = source.IndexOf(oldValue, StringComparison.Ordinal);
        if (index < 0)
        {
            throw new InvalidOperationException("fixture mutation target not found: " + oldValue);
        }

        return source.Substring(0, index) + newValue + source.Substring(index + oldValue.Length);
    }

    private static void AssertUnknownInvalidTargetFails()
    {
        try
        {
            ExpectInvalid(new InvalidCase("unknown-target", string.Empty, "Unknown"));
        }
        catch (InvalidOperationException error)
        {
            Assert(error.Message == "unknown invalid-case target: Unknown", "unknown invalid target");
            Console.WriteLine("INVALID_TARGET_DISPATCH PASS");
            return;
        }

        throw new InvalidOperationException("unknown invalid target was accepted");
    }

    private static void AssertParserWitness(SelectedParser selected, string json, string target)
    {
        var value = selected.Parse(json);
        if (target == "GameSnapshot") Assert(value is GameSnapshot && ((GameSnapshot)value).SnapshotId == SnapshotId.Launch, "game witness");
        else if (target == "CommandEnvelope") Assert(value is CommandEnvelope && ((CommandEnvelope)value).CommandId.Value == "cmd-001", "envelope witness");
        else if (target == "CommandResult") Assert(value is CommandResult && ((CommandResult)value).Payload.Ok, "result witness");
        else if (target == "CommandError") Assert(value is CommandError && ((CommandError)value).Error == DomainError.IdempotencyConflict, "error witness");
        else throw new InvalidOperationException("unknown witness target");
        Console.WriteLine("WITNESS target=" + target + " parser=" + selected.Name + " type=" + value.GetType().Name + " PASS");
    }

    private static void AssertWrongDelegateControl(string envelopeJson)
    {
        var wrong = new SelectedParser("CanonicalCommandJson", json => CanonicalCommandJson.DeserializeAndValidate<CommandError>(json));
        try { wrong.Parse(envelopeJson); } catch (InvalidOperationException) { Console.WriteLine("WRONG_DELEGATE PASS"); return; }
        throw new InvalidOperationException("wrong delegate accepted envelope");
    }

    private static SelectedParser SelectInvalidParser(InvalidCase invalidCase)
    {
        if (invalidCase.Target == "GameSnapshot") return new SelectedParser("CanonicalJson", json => CanonicalJson.DeserializeAndValidate<GameSnapshot>(json));
        if (invalidCase.Target == "CommandEnvelope") return new SelectedParser("CanonicalCommandJson", json => CanonicalCommandJson.DeserializeAndValidate<CommandEnvelope>(json));
        if (invalidCase.Target == "CommandResult") return new SelectedParser("CanonicalCommandJson", json => CanonicalCommandJson.DeserializeAndValidate<CommandResult>(json));
        if (invalidCase.Target == "CommandError") return new SelectedParser("CanonicalCommandJson", json => CanonicalCommandJson.DeserializeAndValidate<CommandError>(json));
        throw new InvalidOperationException("unknown invalid-case target: " + invalidCase.Target);
    }

    private static void ExpectInvalid(InvalidCase invalidCase)
    {
        var selected = SelectInvalidParser(invalidCase);
        try
        {
            selected.Parse(invalidCase.Json);
        }
        catch (InvalidOperationException)
        {
            Console.WriteLine("INVALID " + invalidCase.Name + " target=" + invalidCase.Target + " parser=" + selected.Name + " PASS");
            return;
        }

        throw new InvalidOperationException("invalid input accepted: " + invalidCase.Name);
    }

    private static void Assert(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException("assertion failed: " + message);
        }
    }
}
`;
}

export async function runCsharpVerification(options) {
  const libraryDir = resolve(CSHARP_TEST_DIR, 'GeneratedModels');
  const hostDir = resolve(CSHARP_TEST_DIR, 'Host');
  await mkdir(libraryDir, { recursive: true });
  await mkdir(hostDir, { recursive: true });
  await writeFile(resolve(libraryDir, 'GeneratedModels.csproj'), libraryProject(options.root), 'utf8');
  await writeFile(resolve(hostDir, 'Host.csproj'), hostProject(), 'utf8');
  await writeFile(resolve(hostDir, 'Program.cs'), hostProgram(), 'utf8');

  const libraryCompile = options.runCommand(
    'csharp-netstandard2.1-library-compile',
    'dotnet',
    ['build', resolve(libraryDir, 'GeneratedModels.csproj'), '--configuration', 'Release'],
  );
  if (libraryCompile.exit_code !== 0) return { libraryCompile, hostRun: null, parserRoutes: [], invalidTargetDispatch: false };

  const hostRun = options.runCommand(
    'csharp-runnable-host-roundtrip-invalid-matrix',
    'dotnet',
    [
      'run',
      '--project',
      resolve(hostDir, 'Host.csproj'),
      '--configuration',
      'Release',
      '--',
      resolve(options.fixtureDir, 'canonical-launch.json'),
      resolve(options.fixtureDir, 'canonical-d90.json'),
      resolve(options.fixtureDir, 'schema-valid/command-envelope.json'),
      resolve(options.fixtureDir, 'schema-valid/command-result.json'),
      resolve(options.fixtureDir, 'schema-valid/command-error.json'),
    ],
  );
  const parserRoutes = hostRun.stdout.split('\n')
    .filter((line) => line.startsWith('INVALID '))
    .map((line) => {
      const match = /^INVALID (.+) target=(GameSnapshot|CommandEnvelope|CommandResult|CommandError) parser=(CanonicalJson|CanonicalCommandJson) PASS$/.exec(line);
      if (!match) throw new Error(`invalid parser-route output: ${line}`);
      return { name: match[1], target: match[2], parser: match[3] };
    });
  const witnesses = hostRun.stdout.split('\n').filter((line) => line.startsWith('WITNESS ')).map((line) => {
    const match = /^WITNESS target=(GameSnapshot|CommandEnvelope|CommandResult|CommandError) parser=(CanonicalJson|CanonicalCommandJson) type=(GameSnapshot|CommandEnvelope|CommandResult|CommandError) PASS$/.exec(line);
    if (!match) throw new Error(`invalid witness output: ${line}`);
    return { target: match[1], parser: match[2], runtime: match[3] };
  });
  return { libraryCompile, hostRun, parserRoutes, witnesses, wrongDelegateControl: hostRun.stdout.includes('WRONG_DELEGATE PASS'), invalidTargetDispatch: hostRun.stdout.includes('INVALID_TARGET_DISPATCH PASS') };
}
