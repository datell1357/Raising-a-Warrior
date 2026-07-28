import { buildCsharpParser } from './csharp-parser-template.mjs';

const BRANDED_STRUCTS = [
  'CanonicalDecimalString',
  'FixedInt64String',
  'UnsignedInt64String',
  'ContentVersion',
  'RegionId',
  'StageId',
  'CellId',
  'QuestId',
  'SkillId',
  'EquipmentId',
  'SummonPoolId',
  'ProductId',
  'PromotionId',
  'ManifestId',
  'ReleaseCandidateId',
];

const ENUMS = [
  ['SnapshotId', ['Launch', 'D90']],
  ['CurrencyId', ['BrassCoin', 'MoonShard', 'StarSeal', 'MetalFragment']],
  ['QuestKind', ['ReachLevel', 'ClearStage']],
  ['QuestGroup', ['Main', 'Daily', 'Weekly', 'Achievement', 'Tutorial']],
  ['SkillPhase', ['Launch', 'D90']],
  ['Rarity', ['Common', 'Fine', 'Rare', 'Epic', 'Astral']],
  ['ProductKind', ['FreeDaily', 'RewardedAd', 'SoftCurrency', 'IapConsumable', 'IapNonConsumable']],
  ['PromotionKind', ['Launch', 'Scheduled']],
  ['Locale', ['Ko', 'En', 'Ja', 'ZhCn', 'ZhTw']],
  ['SkillUnlockKind', ['Always']],
  ['EligibilityKind', ['Always']],
];

const CLASSES = [
  ['CurrencyAmount', [['CurrencyId', 'CurrencyId'], ['CanonicalDecimalString', 'Amount']]],
  ['RewardItem', [['EquipmentId', 'DefinitionId'], ['int', 'Amount']]],
  ['SkillCopy', [['SkillId', 'SkillId'], ['int', 'Amount']]],
  ['Reward', [['IReadOnlyList<CurrencyAmount>', 'Currencies'], ['IReadOnlyList<RewardItem>', 'Items'], ['IReadOnlyList<SkillCopy>', 'SkillCopies'], ['CanonicalDecimalString', 'AccountExp']]],
  ['Region', [['RegionId', 'Id'], ['int', 'Order'], ['IReadOnlyList<StageId>', 'StageIds']]],
  ['Stage', [['StageId', 'Id'], ['RegionId', 'RegionId'], ['int', 'Order'], ['IReadOnlyList<CellId>', 'CellIds'], ['CellId', 'BossCellId']]],
  ['Cell', [['CellId', 'Id'], ['RegionId', 'RegionId'], ['StageId', 'StageId'], ['int', 'Order'], ['string', 'RewardKey']]],
  ['QuestObjective', [['QuestKind', 'Kind'], ['string?', 'TargetId'], ['CanonicalDecimalString', 'TargetAmount']]],
  ['Quest', [['QuestId', 'Id'], ['QuestGroup', 'Group'], ['int', 'Sequence'], ['QuestObjective', 'Objective'], ['Reward', 'Reward'], ['QuestId?', 'NextQuestId']]],
  ['QuestGroups', [['IReadOnlyList<Quest>', 'Main'], ['IReadOnlyList<Quest>', 'Daily'], ['IReadOnlyList<Quest>', 'Weekly'], ['IReadOnlyList<Quest>', 'Achievement'], ['IReadOnlyList<Quest>', 'Tutorial']]],
  ['SkillUnlock', [['SkillUnlockKind', 'Kind']]],
  ['Skill', [['SkillId', 'Id'], ['SkillPhase', 'Phase'], ['Rarity', 'Rarity'], ['string', 'TargetRule'], ['FixedInt64String', 'BasePower'], ['FixedInt64String', 'PowerPerLevel'], ['int', 'TargetCount'], ['int', 'CooldownMs'], ['int', 'ResourceCost'], ['IReadOnlyList<CurrencyAmount>', 'LearnCost'], ['string', 'UpgradeCostCurveId'], ['SkillUnlock', 'Unlock'], ['string', 'VisualKey'], ['string', 'LocalizationKey']]],
  ['EquipmentStats', [['FixedInt64String', 'Attack'], ['FixedInt64String', 'Health']]],
  ['Equipment', [['EquipmentId', 'Id'], ['string', 'Slot'], ['Rarity', 'Rarity'], ['int', 'Tier'], ['EquipmentStats', 'BaseStats'], ['string', 'StatGrowthCurveId'], ['int', 'FuseInputCount'], ['EquipmentId?', 'FuseOutputId'], ['string', 'VisualKey'], ['string', 'LocalizationKey']]],
  ['SummonPoolEntry', [['EquipmentId', 'EquipmentId'], ['CanonicalDecimalString?', 'Weight']]],
  ['SummonPool', [['SummonPoolId', 'Id'], ['int', 'Version'], ['string', 'StartsAt'], ['string?', 'EndsAt'], ['IReadOnlyList<CurrencyAmount>', 'CostOne'], ['IReadOnlyList<CurrencyAmount>', 'CostTen'], ['IReadOnlyList<SummonPoolEntry>', 'Entries'], ['Rarity', 'GuaranteedRarityOnTen'], ['int', 'PityAt'], ['Rarity', 'PityRarity'], ['IReadOnlyDictionary<string, int>', 'DuplicateConversion'], ['string?', 'ValidationSecret']]],
  ['EligibilityRule', [['EligibilityKind', 'Kind']]],
  ['StoreProduct', [['ProductId', 'Id'], ['ProductKind', 'Kind'], ['string?', 'StoreProductId'], ['string?', 'PriceCurrency'], ['CanonicalDecimalString?', 'PriceAmount'], ['Reward', 'Reward'], ['int?', 'DailyLimit'], ['string?', 'StartsAt'], ['string?', 'EndsAt'], ['EligibilityRule', 'EligibilityRule']]],
  ['Promotion', [['PromotionId', 'Id'], ['PromotionKind', 'Kind'], ['ManifestId', 'ComponentId'], ['string', 'StartsAt'], ['string?', 'EndsAt']]],
  ['LocaleCatalog', [['Locale', 'Locale'], ['int', 'KeyCount'], ['IReadOnlyList<string>', 'Keys']]],
  ['ManifestComponent', [['ManifestId', 'Id'], ['string', 'Bundle'], ['string', 'Sha256'], ['int', 'SizeBytes'], ['IReadOnlyList<string>', 'Dependencies'], ['string', 'MinAppBuild']]],
  ['ReleaseCandidateComponent', [['ReleaseCandidateId', 'Id'], ['string', 'Kind'], ['ManifestId', 'ComponentId'], ['string', 'SourceHash'], ['string', 'ArtifactHash']]],
  ['BaselineCounts', [['int', 'Launch'], ['int', 'Scheduled'], ['int', 'Total']]],
  ['BaselineEquipment', [['int', 'Slots'], ['int', 'Rarities'], ['int', 'Tiers']]],
  ['BaselineStore', [['int', 'FreeDaily'], ['int', 'RewardedAds'], ['int', 'CurrencyProducts'], ['int', 'StarterPack'], ['int', 'AdRemoval']]],
  ['Baseline', [['int', 'Weeks'], ['string', 'LaunchBaseline'], ['IReadOnlyList<int>', 'QuestBaseline'], ['BaselineCounts', 'Skills'], ['BaselineEquipment', 'Equipment'], ['BaselineStore', 'Store'], ['BaselineCounts', 'Promotion'], ['IReadOnlyList<string>', 'Locales'], ['IReadOnlyList<string>', 'Roles'], ['IReadOnlyList<string>', 'Devices']]],
  ['Ownership', [['IReadOnlyList<string>', 'Requirements'], ['int', 'FeatureCount'], ['int', 'SpecCount'], ['IReadOnlyList<string>', 'Features'], ['IReadOnlyList<string>', 'Specs']]],
  ['GameSnapshot', [['SnapshotId', 'SnapshotId'], ['ContentVersion', 'ContentVersion'], ['UnsignedInt64String', 'OfflineRewardCapSeconds'], ['Baseline', 'Baseline'], ['IReadOnlyList<Region>', 'Regions'], ['IReadOnlyList<Stage>', 'Stages'], ['IReadOnlyList<Cell>', 'Cells'], ['QuestGroups', 'Quests'], ['IReadOnlyList<Skill>', 'Skills'], ['IReadOnlyList<Equipment>', 'Equipment'], ['IReadOnlyList<SummonPool>', 'SummonPools'], ['IReadOnlyList<StoreProduct>', 'StoreProducts'], ['IReadOnlyList<Promotion>', 'Promotions'], ['IReadOnlyList<LocaleCatalog>', 'LocaleCatalogs'], ['IReadOnlyList<ManifestComponent>', 'Manifests'], ['IReadOnlyList<ReleaseCandidateComponent>', 'ReleaseCandidates'], ['Ownership', 'Ownership']]],
  ['PublicOddsEntry', [['EquipmentId', 'EquipmentId'], ['int', 'Ppm']]],
  ['PublicOddsPool', [['SummonPoolId', 'Id'], ['int', 'Denominator'], ['IReadOnlyList<PublicOddsEntry>', 'OddsByEquipment']]],
];

function lowerFirst(value) {
  return value[0].toLowerCase() + value.slice(1);
}

function emitBrandedStruct(name) {
  return `  public readonly struct ${name}
  {
    public ${name}(string value) { Value = value; }
    public string Value { get; }
    public override string ToString() { return Value; }
  }
`;
}

function emitEnum([name, values]) {
  return `  public enum ${name} { ${values.join(', ')} }
`;
}

function emitClass([name, fields]) {
  const parameters = fields.map(([type, field]) => `${type} ${lowerFirst(field)}`).join(', ');
  const assignments = fields.map(([, field]) => `      ${field} = ${lowerFirst(field)};`).join('\n');
  const properties = fields.map(([type, field]) => `    public ${type} ${field} { get; }`).join('\n');
  return `  public sealed class ${name}
  {
    public ${name}(${parameters})
    {
${assignments}
    }

${properties}
  }
`;
}

export function buildCsharpModelFile(header, snapshot, sourceHash, generatorVersion) {
  const branded = BRANDED_STRUCTS.map(emitBrandedStruct).join('\n');
  const enums = ENUMS.map(emitEnum).join('');
  const classes = CLASSES.map(emitClass).join('\n');
  return `${header}
#nullable enable
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace Content.Generated
{
  public static class GeneratedContentProvenance
  {
    public const string GeneratorVersion = ${JSON.stringify(generatorVersion)};
    public const string SourceHash = ${JSON.stringify(sourceHash)};
    public const string ContentVersion = ${JSON.stringify(snapshot.contentVersion)};
    public const string SnapshotId = ${JSON.stringify(snapshot.snapshotId)};
    public const string DefinitionSource = "content/contracts/game.schema.json";
  }

${branded}
${enums}
${classes}
${buildCsharpParser()}
}
`;
}
