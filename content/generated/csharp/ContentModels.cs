// generator: 20260727T000000Z-task3
// source-hash: 8342f1f11721a481a94a838cd92bb559df83374309b47522c2b58cd3b8b19692
// content-version: 20260727T000000Z-task3-content
// source: content/contracts/game.schema.json

#nullable enable
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace Content.Generated
{
  public static class GeneratedContentProvenance
  {
    public const string GeneratorVersion = "20260727T000000Z-task3";
    public const string SourceHash = "8342f1f11721a481a94a838cd92bb559df83374309b47522c2b58cd3b8b19692";
    public const string ContentVersion = "20260727T000000Z-task3-content";
    public const string SnapshotId = "d90";
    public const string DefinitionSource = "content/contracts/game.schema.json";
  }

  public readonly struct CanonicalDecimalString
  {
    public CanonicalDecimalString(string value) { Value = value; }
    public string Value { get; }
    public override string ToString() { return Value; }
  }

  public readonly struct FixedInt64String
  {
    public FixedInt64String(string value) { Value = value; }
    public string Value { get; }
    public override string ToString() { return Value; }
  }

  public readonly struct UnsignedInt64String
  {
    public UnsignedInt64String(string value) { Value = value; }
    public string Value { get; }
    public override string ToString() { return Value; }
  }

  public readonly struct ContentVersion
  {
    public ContentVersion(string value) { Value = value; }
    public string Value { get; }
    public override string ToString() { return Value; }
  }

  public readonly struct RegionId
  {
    public RegionId(string value) { Value = value; }
    public string Value { get; }
    public override string ToString() { return Value; }
  }

  public readonly struct StageId
  {
    public StageId(string value) { Value = value; }
    public string Value { get; }
    public override string ToString() { return Value; }
  }

  public readonly struct CellId
  {
    public CellId(string value) { Value = value; }
    public string Value { get; }
    public override string ToString() { return Value; }
  }

  public readonly struct QuestId
  {
    public QuestId(string value) { Value = value; }
    public string Value { get; }
    public override string ToString() { return Value; }
  }

  public readonly struct SkillId
  {
    public SkillId(string value) { Value = value; }
    public string Value { get; }
    public override string ToString() { return Value; }
  }

  public readonly struct EquipmentId
  {
    public EquipmentId(string value) { Value = value; }
    public string Value { get; }
    public override string ToString() { return Value; }
  }

  public readonly struct SummonPoolId
  {
    public SummonPoolId(string value) { Value = value; }
    public string Value { get; }
    public override string ToString() { return Value; }
  }

  public readonly struct ProductId
  {
    public ProductId(string value) { Value = value; }
    public string Value { get; }
    public override string ToString() { return Value; }
  }

  public readonly struct PromotionId
  {
    public PromotionId(string value) { Value = value; }
    public string Value { get; }
    public override string ToString() { return Value; }
  }

  public readonly struct ManifestId
  {
    public ManifestId(string value) { Value = value; }
    public string Value { get; }
    public override string ToString() { return Value; }
  }

  public readonly struct ReleaseCandidateId
  {
    public ReleaseCandidateId(string value) { Value = value; }
    public string Value { get; }
    public override string ToString() { return Value; }
  }

  public enum SnapshotId { Launch, D90 }
  public enum CurrencyId { BrassCoin, MoonShard, StarSeal, MetalFragment }
  public enum QuestKind { ReachLevel, ClearStage }
  public enum QuestGroup { Main, Daily, Weekly, Achievement, Tutorial }
  public enum SkillPhase { Launch, D90 }
  public enum Rarity { Common, Fine, Rare, Epic, Astral }
  public enum ProductKind { FreeDaily, RewardedAd, SoftCurrency, IapConsumable, IapNonConsumable }
  public enum PromotionKind { Launch, Scheduled }
  public enum Locale { Ko, En, Ja, ZhCn, ZhTw }
  public enum SkillUnlockKind { Always }
  public enum EligibilityKind { Always }

  public sealed class CurrencyAmount
  {
    public CurrencyAmount(CurrencyId currencyId, CanonicalDecimalString amount)
    {
      CurrencyId = currencyId;
      Amount = amount;
    }

    public CurrencyId CurrencyId { get; }
    public CanonicalDecimalString Amount { get; }
  }

  public sealed class RewardItem
  {
    public RewardItem(EquipmentId definitionId, int amount)
    {
      DefinitionId = definitionId;
      Amount = amount;
    }

    public EquipmentId DefinitionId { get; }
    public int Amount { get; }
  }

  public sealed class SkillCopy
  {
    public SkillCopy(SkillId skillId, int amount)
    {
      SkillId = skillId;
      Amount = amount;
    }

    public SkillId SkillId { get; }
    public int Amount { get; }
  }

  public sealed class Reward
  {
    public Reward(IReadOnlyList<CurrencyAmount> currencies, IReadOnlyList<RewardItem> items, IReadOnlyList<SkillCopy> skillCopies, CanonicalDecimalString accountExp)
    {
      Currencies = currencies;
      Items = items;
      SkillCopies = skillCopies;
      AccountExp = accountExp;
    }

    public IReadOnlyList<CurrencyAmount> Currencies { get; }
    public IReadOnlyList<RewardItem> Items { get; }
    public IReadOnlyList<SkillCopy> SkillCopies { get; }
    public CanonicalDecimalString AccountExp { get; }
  }

  public sealed class Region
  {
    public Region(RegionId id, int order, IReadOnlyList<StageId> stageIds)
    {
      Id = id;
      Order = order;
      StageIds = stageIds;
    }

    public RegionId Id { get; }
    public int Order { get; }
    public IReadOnlyList<StageId> StageIds { get; }
  }

  public sealed class Stage
  {
    public Stage(StageId id, RegionId regionId, int order, IReadOnlyList<CellId> cellIds, CellId bossCellId)
    {
      Id = id;
      RegionId = regionId;
      Order = order;
      CellIds = cellIds;
      BossCellId = bossCellId;
    }

    public StageId Id { get; }
    public RegionId RegionId { get; }
    public int Order { get; }
    public IReadOnlyList<CellId> CellIds { get; }
    public CellId BossCellId { get; }
  }

  public sealed class Cell
  {
    public Cell(CellId id, RegionId regionId, StageId stageId, int order, string rewardKey)
    {
      Id = id;
      RegionId = regionId;
      StageId = stageId;
      Order = order;
      RewardKey = rewardKey;
    }

    public CellId Id { get; }
    public RegionId RegionId { get; }
    public StageId StageId { get; }
    public int Order { get; }
    public string RewardKey { get; }
  }

  public sealed class QuestObjective
  {
    public QuestObjective(QuestKind kind, string? targetId, CanonicalDecimalString targetAmount)
    {
      Kind = kind;
      TargetId = targetId;
      TargetAmount = targetAmount;
    }

    public QuestKind Kind { get; }
    public string? TargetId { get; }
    public CanonicalDecimalString TargetAmount { get; }
  }

  public sealed class Quest
  {
    public Quest(QuestId id, QuestGroup group, int sequence, QuestObjective objective, Reward reward, QuestId? nextQuestId)
    {
      Id = id;
      Group = group;
      Sequence = sequence;
      Objective = objective;
      Reward = reward;
      NextQuestId = nextQuestId;
    }

    public QuestId Id { get; }
    public QuestGroup Group { get; }
    public int Sequence { get; }
    public QuestObjective Objective { get; }
    public Reward Reward { get; }
    public QuestId? NextQuestId { get; }
  }

  public sealed class QuestGroups
  {
    public QuestGroups(IReadOnlyList<Quest> main, IReadOnlyList<Quest> daily, IReadOnlyList<Quest> weekly, IReadOnlyList<Quest> achievement, IReadOnlyList<Quest> tutorial)
    {
      Main = main;
      Daily = daily;
      Weekly = weekly;
      Achievement = achievement;
      Tutorial = tutorial;
    }

    public IReadOnlyList<Quest> Main { get; }
    public IReadOnlyList<Quest> Daily { get; }
    public IReadOnlyList<Quest> Weekly { get; }
    public IReadOnlyList<Quest> Achievement { get; }
    public IReadOnlyList<Quest> Tutorial { get; }
  }

  public sealed class SkillUnlock
  {
    public SkillUnlock(SkillUnlockKind kind)
    {
      Kind = kind;
    }

    public SkillUnlockKind Kind { get; }
  }

  public sealed class Skill
  {
    public Skill(SkillId id, SkillPhase phase, Rarity rarity, string targetRule, FixedInt64String basePower, FixedInt64String powerPerLevel, int targetCount, int cooldownMs, int resourceCost, IReadOnlyList<CurrencyAmount> learnCost, string upgradeCostCurveId, SkillUnlock unlock, string visualKey, string localizationKey)
    {
      Id = id;
      Phase = phase;
      Rarity = rarity;
      TargetRule = targetRule;
      BasePower = basePower;
      PowerPerLevel = powerPerLevel;
      TargetCount = targetCount;
      CooldownMs = cooldownMs;
      ResourceCost = resourceCost;
      LearnCost = learnCost;
      UpgradeCostCurveId = upgradeCostCurveId;
      Unlock = unlock;
      VisualKey = visualKey;
      LocalizationKey = localizationKey;
    }

    public SkillId Id { get; }
    public SkillPhase Phase { get; }
    public Rarity Rarity { get; }
    public string TargetRule { get; }
    public FixedInt64String BasePower { get; }
    public FixedInt64String PowerPerLevel { get; }
    public int TargetCount { get; }
    public int CooldownMs { get; }
    public int ResourceCost { get; }
    public IReadOnlyList<CurrencyAmount> LearnCost { get; }
    public string UpgradeCostCurveId { get; }
    public SkillUnlock Unlock { get; }
    public string VisualKey { get; }
    public string LocalizationKey { get; }
  }

  public sealed class EquipmentStats
  {
    public EquipmentStats(FixedInt64String attack, FixedInt64String health)
    {
      Attack = attack;
      Health = health;
    }

    public FixedInt64String Attack { get; }
    public FixedInt64String Health { get; }
  }

  public sealed class Equipment
  {
    public Equipment(EquipmentId id, string slot, Rarity rarity, int tier, EquipmentStats baseStats, string statGrowthCurveId, int fuseInputCount, EquipmentId? fuseOutputId, string visualKey, string localizationKey)
    {
      Id = id;
      Slot = slot;
      Rarity = rarity;
      Tier = tier;
      BaseStats = baseStats;
      StatGrowthCurveId = statGrowthCurveId;
      FuseInputCount = fuseInputCount;
      FuseOutputId = fuseOutputId;
      VisualKey = visualKey;
      LocalizationKey = localizationKey;
    }

    public EquipmentId Id { get; }
    public string Slot { get; }
    public Rarity Rarity { get; }
    public int Tier { get; }
    public EquipmentStats BaseStats { get; }
    public string StatGrowthCurveId { get; }
    public int FuseInputCount { get; }
    public EquipmentId? FuseOutputId { get; }
    public string VisualKey { get; }
    public string LocalizationKey { get; }
  }

  public sealed class SummonPoolEntry
  {
    public SummonPoolEntry(EquipmentId equipmentId, CanonicalDecimalString? weight)
    {
      EquipmentId = equipmentId;
      Weight = weight;
    }

    public EquipmentId EquipmentId { get; }
    public CanonicalDecimalString? Weight { get; }
  }

  public sealed class SummonPool
  {
    public SummonPool(SummonPoolId id, int version, string startsAt, string? endsAt, IReadOnlyList<CurrencyAmount> costOne, IReadOnlyList<CurrencyAmount> costTen, IReadOnlyList<SummonPoolEntry> entries, Rarity guaranteedRarityOnTen, int pityAt, Rarity pityRarity, IReadOnlyDictionary<string, int> duplicateConversion, string? validationSecret)
    {
      Id = id;
      Version = version;
      StartsAt = startsAt;
      EndsAt = endsAt;
      CostOne = costOne;
      CostTen = costTen;
      Entries = entries;
      GuaranteedRarityOnTen = guaranteedRarityOnTen;
      PityAt = pityAt;
      PityRarity = pityRarity;
      DuplicateConversion = duplicateConversion;
      ValidationSecret = validationSecret;
    }

    public SummonPoolId Id { get; }
    public int Version { get; }
    public string StartsAt { get; }
    public string? EndsAt { get; }
    public IReadOnlyList<CurrencyAmount> CostOne { get; }
    public IReadOnlyList<CurrencyAmount> CostTen { get; }
    public IReadOnlyList<SummonPoolEntry> Entries { get; }
    public Rarity GuaranteedRarityOnTen { get; }
    public int PityAt { get; }
    public Rarity PityRarity { get; }
    public IReadOnlyDictionary<string, int> DuplicateConversion { get; }
    public string? ValidationSecret { get; }
  }

  public sealed class EligibilityRule
  {
    public EligibilityRule(EligibilityKind kind)
    {
      Kind = kind;
    }

    public EligibilityKind Kind { get; }
  }

  public sealed class StoreProduct
  {
    public StoreProduct(ProductId id, ProductKind kind, string? storeProductId, string? priceCurrency, CanonicalDecimalString? priceAmount, Reward reward, int? dailyLimit, string? startsAt, string? endsAt, EligibilityRule eligibilityRule)
    {
      Id = id;
      Kind = kind;
      StoreProductId = storeProductId;
      PriceCurrency = priceCurrency;
      PriceAmount = priceAmount;
      Reward = reward;
      DailyLimit = dailyLimit;
      StartsAt = startsAt;
      EndsAt = endsAt;
      EligibilityRule = eligibilityRule;
    }

    public ProductId Id { get; }
    public ProductKind Kind { get; }
    public string? StoreProductId { get; }
    public string? PriceCurrency { get; }
    public CanonicalDecimalString? PriceAmount { get; }
    public Reward Reward { get; }
    public int? DailyLimit { get; }
    public string? StartsAt { get; }
    public string? EndsAt { get; }
    public EligibilityRule EligibilityRule { get; }
  }

  public sealed class Promotion
  {
    public Promotion(PromotionId id, PromotionKind kind, ManifestId componentId, string startsAt, string? endsAt)
    {
      Id = id;
      Kind = kind;
      ComponentId = componentId;
      StartsAt = startsAt;
      EndsAt = endsAt;
    }

    public PromotionId Id { get; }
    public PromotionKind Kind { get; }
    public ManifestId ComponentId { get; }
    public string StartsAt { get; }
    public string? EndsAt { get; }
  }

  public sealed class LocaleCatalog
  {
    public LocaleCatalog(Locale locale, int keyCount, IReadOnlyList<string> keys)
    {
      Locale = locale;
      KeyCount = keyCount;
      Keys = keys;
    }

    public Locale Locale { get; }
    public int KeyCount { get; }
    public IReadOnlyList<string> Keys { get; }
  }

  public sealed class ManifestComponent
  {
    public ManifestComponent(ManifestId id, string bundle, string sha256, int sizeBytes, IReadOnlyList<string> dependencies, string minAppBuild)
    {
      Id = id;
      Bundle = bundle;
      Sha256 = sha256;
      SizeBytes = sizeBytes;
      Dependencies = dependencies;
      MinAppBuild = minAppBuild;
    }

    public ManifestId Id { get; }
    public string Bundle { get; }
    public string Sha256 { get; }
    public int SizeBytes { get; }
    public IReadOnlyList<string> Dependencies { get; }
    public string MinAppBuild { get; }
  }

  public sealed class ReleaseCandidateComponent
  {
    public ReleaseCandidateComponent(ReleaseCandidateId id, string kind, ManifestId componentId, string sourceHash, string artifactHash)
    {
      Id = id;
      Kind = kind;
      ComponentId = componentId;
      SourceHash = sourceHash;
      ArtifactHash = artifactHash;
    }

    public ReleaseCandidateId Id { get; }
    public string Kind { get; }
    public ManifestId ComponentId { get; }
    public string SourceHash { get; }
    public string ArtifactHash { get; }
  }

  public sealed class BaselineCounts
  {
    public BaselineCounts(int launch, int scheduled, int total)
    {
      Launch = launch;
      Scheduled = scheduled;
      Total = total;
    }

    public int Launch { get; }
    public int Scheduled { get; }
    public int Total { get; }
  }

  public sealed class BaselineEquipment
  {
    public BaselineEquipment(int slots, int rarities, int tiers)
    {
      Slots = slots;
      Rarities = rarities;
      Tiers = tiers;
    }

    public int Slots { get; }
    public int Rarities { get; }
    public int Tiers { get; }
  }

  public sealed class BaselineStore
  {
    public BaselineStore(int freeDaily, int rewardedAds, int currencyProducts, int starterPack, int adRemoval)
    {
      FreeDaily = freeDaily;
      RewardedAds = rewardedAds;
      CurrencyProducts = currencyProducts;
      StarterPack = starterPack;
      AdRemoval = adRemoval;
    }

    public int FreeDaily { get; }
    public int RewardedAds { get; }
    public int CurrencyProducts { get; }
    public int StarterPack { get; }
    public int AdRemoval { get; }
  }

  public sealed class Baseline
  {
    public Baseline(int weeks, string launchBaseline, IReadOnlyList<int> questBaseline, BaselineCounts skills, BaselineEquipment equipment, BaselineStore store, BaselineCounts promotion, IReadOnlyList<string> locales, IReadOnlyList<string> roles, IReadOnlyList<string> devices)
    {
      Weeks = weeks;
      LaunchBaseline = launchBaseline;
      QuestBaseline = questBaseline;
      Skills = skills;
      Equipment = equipment;
      Store = store;
      Promotion = promotion;
      Locales = locales;
      Roles = roles;
      Devices = devices;
    }

    public int Weeks { get; }
    public string LaunchBaseline { get; }
    public IReadOnlyList<int> QuestBaseline { get; }
    public BaselineCounts Skills { get; }
    public BaselineEquipment Equipment { get; }
    public BaselineStore Store { get; }
    public BaselineCounts Promotion { get; }
    public IReadOnlyList<string> Locales { get; }
    public IReadOnlyList<string> Roles { get; }
    public IReadOnlyList<string> Devices { get; }
  }

  public sealed class Ownership
  {
    public Ownership(IReadOnlyList<string> requirements, int featureCount, int specCount, IReadOnlyList<string> features, IReadOnlyList<string> specs)
    {
      Requirements = requirements;
      FeatureCount = featureCount;
      SpecCount = specCount;
      Features = features;
      Specs = specs;
    }

    public IReadOnlyList<string> Requirements { get; }
    public int FeatureCount { get; }
    public int SpecCount { get; }
    public IReadOnlyList<string> Features { get; }
    public IReadOnlyList<string> Specs { get; }
  }

  public sealed class GameSnapshot
  {
    public GameSnapshot(SnapshotId snapshotId, ContentVersion contentVersion, UnsignedInt64String offlineRewardCapSeconds, Baseline baseline, IReadOnlyList<Region> regions, IReadOnlyList<Stage> stages, IReadOnlyList<Cell> cells, QuestGroups quests, IReadOnlyList<Skill> skills, IReadOnlyList<Equipment> equipment, IReadOnlyList<SummonPool> summonPools, IReadOnlyList<StoreProduct> storeProducts, IReadOnlyList<Promotion> promotions, IReadOnlyList<LocaleCatalog> localeCatalogs, IReadOnlyList<ManifestComponent> manifests, IReadOnlyList<ReleaseCandidateComponent> releaseCandidates, Ownership ownership)
    {
      SnapshotId = snapshotId;
      ContentVersion = contentVersion;
      OfflineRewardCapSeconds = offlineRewardCapSeconds;
      Baseline = baseline;
      Regions = regions;
      Stages = stages;
      Cells = cells;
      Quests = quests;
      Skills = skills;
      Equipment = equipment;
      SummonPools = summonPools;
      StoreProducts = storeProducts;
      Promotions = promotions;
      LocaleCatalogs = localeCatalogs;
      Manifests = manifests;
      ReleaseCandidates = releaseCandidates;
      Ownership = ownership;
    }

    public SnapshotId SnapshotId { get; }
    public ContentVersion ContentVersion { get; }
    public UnsignedInt64String OfflineRewardCapSeconds { get; }
    public Baseline Baseline { get; }
    public IReadOnlyList<Region> Regions { get; }
    public IReadOnlyList<Stage> Stages { get; }
    public IReadOnlyList<Cell> Cells { get; }
    public QuestGroups Quests { get; }
    public IReadOnlyList<Skill> Skills { get; }
    public IReadOnlyList<Equipment> Equipment { get; }
    public IReadOnlyList<SummonPool> SummonPools { get; }
    public IReadOnlyList<StoreProduct> StoreProducts { get; }
    public IReadOnlyList<Promotion> Promotions { get; }
    public IReadOnlyList<LocaleCatalog> LocaleCatalogs { get; }
    public IReadOnlyList<ManifestComponent> Manifests { get; }
    public IReadOnlyList<ReleaseCandidateComponent> ReleaseCandidates { get; }
    public Ownership Ownership { get; }
  }

  public sealed class PublicOddsEntry
  {
    public PublicOddsEntry(EquipmentId equipmentId, int ppm)
    {
      EquipmentId = equipmentId;
      Ppm = ppm;
    }

    public EquipmentId EquipmentId { get; }
    public int Ppm { get; }
  }

  public sealed class PublicOddsPool
  {
    public PublicOddsPool(SummonPoolId id, int denominator, IReadOnlyList<PublicOddsEntry> oddsByEquipment)
    {
      Id = id;
      Denominator = denominator;
      OddsByEquipment = oddsByEquipment;
    }

    public SummonPoolId Id { get; }
    public int Denominator { get; }
    public IReadOnlyList<PublicOddsEntry> OddsByEquipment { get; }
  }

  internal abstract class JsonValue
  {
  }

  internal sealed class JsonObjectValue : JsonValue
  {
    public JsonObjectValue(Dictionary<string, JsonValue> members) { Members = members; }
    public Dictionary<string, JsonValue> Members { get; }
  }

  internal sealed class JsonArrayValue : JsonValue
  {
    public JsonArrayValue(List<JsonValue> items) { Items = items; }
    public List<JsonValue> Items { get; }
  }

  internal sealed class JsonStringValue : JsonValue
  {
    public JsonStringValue(string value) { Value = value; }
    public string Value { get; }
  }

  internal sealed class JsonNumberValue : JsonValue
  {
    public JsonNumberValue(string value) { Value = value; }
    public string Value { get; }
  }

  internal sealed class JsonBooleanValue : JsonValue
  {
    public JsonBooleanValue(bool value) { Value = value; }
    public bool Value { get; }
  }

  internal sealed class JsonNullValue : JsonValue
  {
    public static readonly JsonNullValue Instance = new JsonNullValue();
    private JsonNullValue() { }
  }

  internal sealed class JsonParser
  {
    private readonly string text;
    private int index;

    public JsonParser(string text)
    {
      this.text = text;
    }

    public JsonValue Parse()
    {
      SkipWhitespace();
      if (index == text.Length) throw Error("expected JSON value");
      var value = ParseValue();
      SkipWhitespace();
      if (index != text.Length) throw Error("unexpected trailing content");
      return value;
    }

    private JsonValue ParseValue()
    {
      if (index == text.Length) throw Error("expected JSON value");
      switch (text[index])
      {
        case '{': return ParseObject();
        case '[': return ParseArray();
        case '"': return new JsonStringValue(ParseString());
        case 't': ReadLiteral("true"); return new JsonBooleanValue(true);
        case 'f': ReadLiteral("false"); return new JsonBooleanValue(false);
        case 'n': ReadLiteral("null"); return JsonNullValue.Instance;
        default:
          if (text[index] == '-' || IsDigit(text[index])) return ParseNumber();
          throw Error("unexpected token");
      }
    }

    private JsonObjectValue ParseObject()
    {
      index += 1;
      SkipWhitespace();
      var members = new Dictionary<string, JsonValue>(StringComparer.Ordinal);
      if (Take('}')) return new JsonObjectValue(members);
      while (true)
      {
        if (index == text.Length || text[index] != '"') throw Error("expected object property name");
        var name = ParseString();
        SkipWhitespace();
        Require(':');
        SkipWhitespace();
        var value = ParseValue();
        if (members.ContainsKey(name)) throw Error("duplicate object property " + name);
        members.Add(name, value);
        SkipWhitespace();
        if (Take('}')) return new JsonObjectValue(members);
        Require(',');
        SkipWhitespace();
      }
    }

    private JsonArrayValue ParseArray()
    {
      index += 1;
      SkipWhitespace();
      var items = new List<JsonValue>();
      if (Take(']')) return new JsonArrayValue(items);
      while (true)
      {
        items.Add(ParseValue());
        SkipWhitespace();
        if (Take(']')) return new JsonArrayValue(items);
        Require(',');
        SkipWhitespace();
      }
    }

    private string ParseString()
    {
      Require('"');
      var builder = new StringBuilder();
      while (index < text.Length)
      {
        var character = text[index++];
        if (character == '"') return builder.ToString();
        if (character < ' ') throw Error("unescaped control character in string");
        if (character != '\\')
        {
          builder.Append(character);
          continue;
        }

        if (index == text.Length) throw Error("unterminated string escape");
        var escaped = text[index++];
        switch (escaped)
        {
          case '"': builder.Append('"'); break;
          case '\\': builder.Append('\\'); break;
          case '/': builder.Append('/'); break;
          case 'b': builder.Append('\b'); break;
          case 'f': builder.Append('\f'); break;
          case 'n': builder.Append('\n'); break;
          case 'r': builder.Append('\r'); break;
          case 't': builder.Append('\t'); break;
          case 'u': builder.Append(ReadUnicodeEscape()); break;
          default: throw Error("invalid string escape");
        }
      }
      throw Error("unterminated string");
    }

    private char ReadUnicodeEscape()
    {
      if (index + 4 > text.Length) throw Error("incomplete unicode escape");
      var value = 0;
      for (var offset = 0; offset < 4; offset += 1)
      {
        value = (value * 16) + HexValue(text[index++]);
      }
      return (char)value;
    }

    private JsonNumberValue ParseNumber()
    {
      var start = index;
      Take('-');
      if (index == text.Length) throw Error("incomplete number");
      if (Take('0'))
      {
        if (index < text.Length && IsDigit(text[index])) throw Error("leading zero in number");
      }
      else
      {
        if (text[index] < '1' || text[index] > '9') throw Error("invalid number");
        while (index < text.Length && IsDigit(text[index])) index += 1;
      }
      if (Take('.'))
      {
        var fractionStart = index;
        while (index < text.Length && IsDigit(text[index])) index += 1;
        if (fractionStart == index) throw Error("incomplete number fraction");
      }
      if (index < text.Length && (text[index] == 'e' || text[index] == 'E'))
      {
        index += 1;
        if (index < text.Length && (text[index] == '+' || text[index] == '-')) index += 1;
        var exponentStart = index;
        while (index < text.Length && IsDigit(text[index])) index += 1;
        if (exponentStart == index) throw Error("incomplete number exponent");
      }
      return new JsonNumberValue(text.Substring(start, index - start));
    }

    private void ReadLiteral(string literal)
    {
      if (index + literal.Length > text.Length || string.CompareOrdinal(text, index, literal, 0, literal.Length) != 0)
      {
        throw Error("invalid literal");
      }
      index += literal.Length;
    }

    private void SkipWhitespace()
    {
      while (index < text.Length)
      {
        var character = text[index];
        if (character != ' ' && character != '\t' && character != '\r' && character != '\n') return;
        index += 1;
      }
    }

    private bool Take(char expected)
    {
      if (index == text.Length || text[index] != expected) return false;
      index += 1;
      return true;
    }

    private void Require(char expected)
    {
      if (!Take(expected)) throw Error("expected '" + expected + "'");
    }

    private InvalidOperationException Error(string message)
    {
      return new InvalidOperationException(message + " at JSON offset " + index.ToString(CultureInfo.InvariantCulture));
    }

    private static bool IsDigit(char character)
    {
      return character >= '0' && character <= '9';
    }

    private static int HexValue(char character)
    {
      if (character >= '0' && character <= '9') return character - '0';
      if (character >= 'a' && character <= 'f') return character - 'a' + 10;
      if (character >= 'A' && character <= 'F') return character - 'A' + 10;
      throw new InvalidOperationException("invalid unicode escape");
    }
  }

  internal sealed class JsonObjectReader
  {
    private readonly JsonObjectValue value;
    private readonly HashSet<string> consumed = new HashSet<string>(StringComparer.Ordinal);
    private readonly string path;

    public JsonObjectReader(JsonObjectValue value, string path)
    {
      this.value = value;
      this.path = path;
    }

    public JsonValue Take(string name)
    {
      JsonValue member;
      if (!value.Members.TryGetValue(name, out member))
      {
        throw new InvalidOperationException(Path(name) + " is required");
      }
      consumed.Add(name);
      return member;
    }

    public bool TryTake(string name, out JsonValue member)
    {
      if (!value.Members.TryGetValue(name, out member)) return false;
      consumed.Add(name);
      return true;
    }

    public string Path(string name)
    {
      return path + "/" + name;
    }

    public void Complete()
    {
      foreach (var name in value.Members.Keys)
      {
        if (!consumed.Contains(name)) throw new InvalidOperationException(Path(name) + " is not allowed");
      }
    }
  }

  public static class CanonicalJson
  {
    public static T DeserializeAndValidate<T>(string json) where T : class
    {
      if (typeof(T) != typeof(GameSnapshot))
      {
        throw new InvalidOperationException("only GameSnapshot is supported");
      }
      var snapshot = GameSnapshotMapper.Parse(json);
      return (T)(object)snapshot;
    }
  }

  internal static class GameSnapshotMapper
  {
    public static GameSnapshot Parse(string json)
    {
      if (json == null) throw new ArgumentNullException(nameof(json));
      return ParseSnapshot(new JsonParser(json).Parse(), string.Empty);
    }

    private static GameSnapshot ParseSnapshot(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new GameSnapshot(
        ParseSnapshotId(reader.Take("snapshotId"), reader.Path("snapshotId")),
        ParseContentVersion(reader.Take("contentVersion"), reader.Path("contentVersion")),
        ParseUnsignedInt64(reader.Take("offlineRewardCapSeconds"), reader.Path("offlineRewardCapSeconds")),
        ParseBaseline(reader.Take("baseline"), reader.Path("baseline")),
        ParseList(reader.Take("regions"), reader.Path("regions"), ParseRegion),
        ParseList(reader.Take("stages"), reader.Path("stages"), ParseStage),
        ParseList(reader.Take("cells"), reader.Path("cells"), ParseCell),
        ParseQuestGroups(reader.Take("quests"), reader.Path("quests")),
        ParseList(reader.Take("skills"), reader.Path("skills"), ParseSkill),
        ParseList(reader.Take("equipment"), reader.Path("equipment"), ParseEquipment),
        ParseList(reader.Take("summonPools"), reader.Path("summonPools"), ParseSummonPool),
        ParseList(reader.Take("storeProducts"), reader.Path("storeProducts"), ParseStoreProduct),
        ParseList(reader.Take("promotions"), reader.Path("promotions"), ParsePromotion),
        ParseList(reader.Take("localeCatalogs"), reader.Path("localeCatalogs"), ParseLocaleCatalog),
        ParseList(reader.Take("manifests"), reader.Path("manifests"), ParseManifest),
        ParseList(reader.Take("releaseCandidates"), reader.Path("releaseCandidates"), ParseReleaseCandidate),
        ParseOwnership(reader.Take("ownership"), reader.Path("ownership"))));
    }

    private static Baseline ParseBaseline(JsonValue value, string path)
    {
      return MapObject(value, path, reader =>
      {
        var weeks = RequireInt(reader.Take("weeks"), reader.Path("weeks"), 0);
        if (weeks != 64) throw new InvalidOperationException(reader.Path("weeks") + " must equal 64");
        var questBaseline = ParseList(reader.Take("questBaseline"), reader.Path("questBaseline"), RequireInt);
        if (questBaseline.Count != 5) throw new InvalidOperationException(reader.Path("questBaseline") + " must contain 5 values");
        return new Baseline(
          weeks,
          RequireString(reader.Take("launchBaseline"), reader.Path("launchBaseline")),
          questBaseline,
          ParseBaselineCounts(reader.Take("skills"), reader.Path("skills")),
          ParseBaselineEquipment(reader.Take("equipment"), reader.Path("equipment")),
          ParseBaselineStore(reader.Take("store"), reader.Path("store")),
          ParseBaselineCounts(reader.Take("promotion"), reader.Path("promotion")),
          ParseList(reader.Take("locales"), reader.Path("locales"), RequireString),
          ParseList(reader.Take("roles"), reader.Path("roles"), RequireString),
          ParseList(reader.Take("devices"), reader.Path("devices"), RequireString));
      });
    }

    private static BaselineCounts ParseBaselineCounts(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new BaselineCounts(
        RequireInt(reader.Take("launch"), reader.Path("launch"), 0),
        RequireInt(reader.Take("scheduled"), reader.Path("scheduled"), 0),
        RequireInt(reader.Take("total"), reader.Path("total"), 0)));
    }

    private static BaselineEquipment ParseBaselineEquipment(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new BaselineEquipment(
        RequireInt(reader.Take("slots"), reader.Path("slots"), 0),
        RequireInt(reader.Take("rarities"), reader.Path("rarities"), 0),
        RequireInt(reader.Take("tiers"), reader.Path("tiers"), 0)));
    }

    private static BaselineStore ParseBaselineStore(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new BaselineStore(
        RequireInt(reader.Take("freeDaily"), reader.Path("freeDaily"), 0),
        RequireInt(reader.Take("rewardedAds"), reader.Path("rewardedAds"), 0),
        RequireInt(reader.Take("currencyProducts"), reader.Path("currencyProducts"), 0),
        RequireInt(reader.Take("starterPack"), reader.Path("starterPack"), 0),
        RequireInt(reader.Take("adRemoval"), reader.Path("adRemoval"), 0)));
    }

    private static Region ParseRegion(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new Region(
        new RegionId(RequireString(reader.Take("id"), reader.Path("id"))),
        RequireInt(reader.Take("order"), reader.Path("order"), 1),
        ParseList(reader.Take("stageIds"), reader.Path("stageIds"), (item, itemPath) => new StageId(RequireString(item, itemPath)))));
    }

    private static Stage ParseStage(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new Stage(
        new StageId(RequireString(reader.Take("id"), reader.Path("id"))),
        new RegionId(RequireString(reader.Take("regionId"), reader.Path("regionId"))),
        RequireInt(reader.Take("order"), reader.Path("order"), 1),
        ParseList(reader.Take("cellIds"), reader.Path("cellIds"), (item, itemPath) => new CellId(RequireString(item, itemPath))),
        new CellId(RequireString(reader.Take("bossCellId"), reader.Path("bossCellId")))));
    }

    private static Cell ParseCell(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new Cell(
        new CellId(RequireString(reader.Take("id"), reader.Path("id"))),
        new RegionId(RequireString(reader.Take("regionId"), reader.Path("regionId"))),
        new StageId(RequireString(reader.Take("stageId"), reader.Path("stageId"))),
        RequireInt(reader.Take("order"), reader.Path("order"), 1),
        RequireString(reader.Take("rewardKey"), reader.Path("rewardKey"))));
    }

    private static QuestGroups ParseQuestGroups(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new QuestGroups(
        ParseList(reader.Take("main"), reader.Path("main"), ParseQuest),
        ParseList(reader.Take("daily"), reader.Path("daily"), ParseQuest),
        ParseList(reader.Take("weekly"), reader.Path("weekly"), ParseQuest),
        ParseList(reader.Take("achievement"), reader.Path("achievement"), ParseQuest),
        ParseList(reader.Take("tutorial"), reader.Path("tutorial"), ParseQuest)));
    }

    private static Quest ParseQuest(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new Quest(
        new QuestId(RequireString(reader.Take("id"), reader.Path("id"))),
        ParseQuestGroup(reader.Take("group"), reader.Path("group")),
        RequireInt(reader.Take("sequence"), reader.Path("sequence"), 0),
        ParseQuestObjective(reader.Take("objective"), reader.Path("objective")),
        ParseReward(reader.Take("reward"), reader.Path("reward")),
        ParseNullableQuestId(reader.Take("nextQuestId"), reader.Path("nextQuestId"))));
    }

    private static QuestObjective ParseQuestObjective(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new QuestObjective(
        ParseQuestKind(reader.Take("kind"), reader.Path("kind")),
        RequireNullableString(reader.Take("targetId"), reader.Path("targetId")),
        ParseCanonicalDecimal(reader.Take("targetAmount"), reader.Path("targetAmount"))));
    }

    private static Reward ParseReward(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new Reward(
        ParseList(reader.Take("currencies"), reader.Path("currencies"), ParseCurrencyAmount),
        ParseList(reader.Take("items"), reader.Path("items"), ParseRewardItem),
        ParseList(reader.Take("skillCopies"), reader.Path("skillCopies"), ParseSkillCopy),
        ParseCanonicalDecimal(reader.Take("accountExp"), reader.Path("accountExp"))));
    }

    private static CurrencyAmount ParseCurrencyAmount(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new CurrencyAmount(
        ParseCurrencyId(reader.Take("currencyId"), reader.Path("currencyId")),
        ParseCanonicalDecimal(reader.Take("amount"), reader.Path("amount"))));
    }

    private static RewardItem ParseRewardItem(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new RewardItem(
        new EquipmentId(RequireString(reader.Take("definitionId"), reader.Path("definitionId"))),
        RequireInt(reader.Take("amount"), reader.Path("amount"), 0)));
    }

    private static SkillCopy ParseSkillCopy(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new SkillCopy(
        new SkillId(RequireString(reader.Take("skillId"), reader.Path("skillId"))),
        RequireInt(reader.Take("amount"), reader.Path("amount"), 0)));
    }

    private static Skill ParseSkill(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new Skill(
        new SkillId(RequireString(reader.Take("id"), reader.Path("id"))),
        ParseSkillPhase(reader.Take("phase"), reader.Path("phase")),
        ParseRarity(reader.Take("rarity"), reader.Path("rarity")),
        RequireString(reader.Take("targetRule"), reader.Path("targetRule")),
        ParseFixedInt64(reader.Take("basePower"), reader.Path("basePower")),
        ParseFixedInt64(reader.Take("powerPerLevel"), reader.Path("powerPerLevel")),
        RequireInt(reader.Take("targetCount"), reader.Path("targetCount"), 1),
        RequireInt(reader.Take("cooldownMs"), reader.Path("cooldownMs"), 1),
        RequireInt(reader.Take("resourceCost"), reader.Path("resourceCost"), 0),
        ParseList(reader.Take("learnCost"), reader.Path("learnCost"), ParseCurrencyAmount),
        RequireString(reader.Take("upgradeCostCurveId"), reader.Path("upgradeCostCurveId")),
        ParseSkillUnlock(reader.Take("unlock"), reader.Path("unlock")),
        RequireString(reader.Take("visualKey"), reader.Path("visualKey")),
        RequireString(reader.Take("localizationKey"), reader.Path("localizationKey"))));
    }

    private static SkillUnlock ParseSkillUnlock(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new SkillUnlock(
        ParseSkillUnlockKind(reader.Take("kind"), reader.Path("kind"))));
    }

    private static Equipment ParseEquipment(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new Equipment(
        new EquipmentId(RequireString(reader.Take("id"), reader.Path("id"))),
        RequireString(reader.Take("slot"), reader.Path("slot")),
        ParseRarity(reader.Take("rarity"), reader.Path("rarity")),
        RequireInt(reader.Take("tier"), reader.Path("tier"), 1),
        ParseEquipmentStats(reader.Take("baseStats"), reader.Path("baseStats")),
        RequireString(reader.Take("statGrowthCurveId"), reader.Path("statGrowthCurveId")),
        RequireInt(reader.Take("fuseInputCount"), reader.Path("fuseInputCount"), 0),
        ParseNullableEquipmentId(reader.Take("fuseOutputId"), reader.Path("fuseOutputId")),
        RequireString(reader.Take("visualKey"), reader.Path("visualKey")),
        RequireString(reader.Take("localizationKey"), reader.Path("localizationKey"))));
    }

    private static EquipmentStats ParseEquipmentStats(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new EquipmentStats(
        ParseFixedInt64(reader.Take("attack"), reader.Path("attack")),
        ParseFixedInt64(reader.Take("health"), reader.Path("health"))));
    }

    private static SummonPool ParseSummonPool(JsonValue value, string path)
    {
      return MapObject(value, path, reader =>
      {
        JsonValue validationSecret;
        var parsedSecret = reader.TryTake("validationSecret", out validationSecret)
          ? RequireString(validationSecret, reader.Path("validationSecret"))
          : (string?)null;
        return new SummonPool(
          new SummonPoolId(RequireString(reader.Take("id"), reader.Path("id"))),
          RequireInt(reader.Take("version"), reader.Path("version"), 0),
          RequireString(reader.Take("startsAt"), reader.Path("startsAt")),
          RequireNullableString(reader.Take("endsAt"), reader.Path("endsAt")),
          ParseList(reader.Take("costOne"), reader.Path("costOne"), ParseCurrencyAmount),
          ParseList(reader.Take("costTen"), reader.Path("costTen"), ParseCurrencyAmount),
          ParseList(reader.Take("entries"), reader.Path("entries"), ParseSummonPoolEntry),
          ParseRarity(reader.Take("guaranteedRarityOnTen"), reader.Path("guaranteedRarityOnTen")),
          RequireInt(reader.Take("pityAt"), reader.Path("pityAt"), 0),
          ParseRarity(reader.Take("pityRarity"), reader.Path("pityRarity")),
          ParseIntDictionary(reader.Take("duplicateConversion"), reader.Path("duplicateConversion")),
          parsedSecret);
      });
    }

    private static SummonPoolEntry ParseSummonPoolEntry(JsonValue value, string path)
    {
      return MapObject(value, path, reader =>
      {
        JsonValue weight;
        var parsedWeight = reader.TryTake("weight", out weight)
          ? ParseCanonicalDecimal(weight, reader.Path("weight"))
          : (CanonicalDecimalString?)null;
        return new SummonPoolEntry(
          new EquipmentId(RequireString(reader.Take("equipmentId"), reader.Path("equipmentId"))),
          parsedWeight);
      });
    }

    private static StoreProduct ParseStoreProduct(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new StoreProduct(
        new ProductId(RequireString(reader.Take("id"), reader.Path("id"))),
        ParseProductKind(reader.Take("kind"), reader.Path("kind")),
        RequireNullableString(reader.Take("storeProductId"), reader.Path("storeProductId")),
        RequireNullableString(reader.Take("priceCurrency"), reader.Path("priceCurrency")),
        ParseNullableCanonicalDecimal(reader.Take("priceAmount"), reader.Path("priceAmount")),
        ParseReward(reader.Take("reward"), reader.Path("reward")),
        RequireNullableInt(reader.Take("dailyLimit"), reader.Path("dailyLimit"), 0),
        RequireNullableString(reader.Take("startsAt"), reader.Path("startsAt")),
        RequireNullableString(reader.Take("endsAt"), reader.Path("endsAt")),
        ParseEligibilityRule(reader.Take("eligibilityRule"), reader.Path("eligibilityRule"))));
    }

    private static EligibilityRule ParseEligibilityRule(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new EligibilityRule(
        ParseEligibilityKind(reader.Take("kind"), reader.Path("kind"))));
    }

    private static Promotion ParsePromotion(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new Promotion(
        new PromotionId(RequireString(reader.Take("id"), reader.Path("id"))),
        ParsePromotionKind(reader.Take("kind"), reader.Path("kind")),
        new ManifestId(RequireString(reader.Take("componentId"), reader.Path("componentId"))),
        RequireString(reader.Take("startsAt"), reader.Path("startsAt")),
        RequireNullableString(reader.Take("endsAt"), reader.Path("endsAt"))));
    }

    private static LocaleCatalog ParseLocaleCatalog(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new LocaleCatalog(
        ParseLocale(reader.Take("locale"), reader.Path("locale")),
        RequireInt(reader.Take("keyCount"), reader.Path("keyCount"), 0),
        ParseList(reader.Take("keys"), reader.Path("keys"), RequireString)));
    }

    private static ManifestComponent ParseManifest(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new ManifestComponent(
        new ManifestId(RequireString(reader.Take("id"), reader.Path("id"))),
        RequireString(reader.Take("bundle"), reader.Path("bundle")),
        RequireHash(reader.Take("sha256"), reader.Path("sha256")),
        RequireInt(reader.Take("sizeBytes"), reader.Path("sizeBytes"), 0),
        ParseList(reader.Take("dependencies"), reader.Path("dependencies"), RequireString),
        RequireString(reader.Take("minAppBuild"), reader.Path("minAppBuild"))));
    }

    private static ReleaseCandidateComponent ParseReleaseCandidate(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new ReleaseCandidateComponent(
        new ReleaseCandidateId(RequireString(reader.Take("id"), reader.Path("id"))),
        RequireString(reader.Take("kind"), reader.Path("kind")),
        new ManifestId(RequireString(reader.Take("componentId"), reader.Path("componentId"))),
        RequireHash(reader.Take("sourceHash"), reader.Path("sourceHash")),
        RequireHash(reader.Take("artifactHash"), reader.Path("artifactHash"))));
    }

    private static Ownership ParseOwnership(JsonValue value, string path)
    {
      return MapObject(value, path, reader => new Ownership(
        ParseList(reader.Take("requirements"), reader.Path("requirements"), RequireString),
        RequireInt(reader.Take("featureCount"), reader.Path("featureCount"), 0),
        RequireInt(reader.Take("specCount"), reader.Path("specCount"), 0),
        ParseList(reader.Take("features"), reader.Path("features"), RequireString),
        ParseList(reader.Take("specs"), reader.Path("specs"), RequireString)));
    }

    private static T MapObject<T>(JsonValue value, string path, Func<JsonObjectReader, T> map)
    {
      var objectValue = value as JsonObjectValue;
      if (objectValue == null) throw new InvalidOperationException(DisplayPath(path) + " must be an object");
      var reader = new JsonObjectReader(objectValue, path);
      var result = map(reader);
      reader.Complete();
      return result;
    }

    private static IReadOnlyList<T> ParseList<T>(JsonValue value, string path, Func<JsonValue, string, T> parseItem)
    {
      var array = value as JsonArrayValue;
      if (array == null) throw new InvalidOperationException(DisplayPath(path) + " must be an array");
      var result = new List<T>(array.Items.Count);
      for (var index = 0; index < array.Items.Count; index += 1)
      {
        result.Add(parseItem(array.Items[index], path + "/" + index.ToString(CultureInfo.InvariantCulture)));
      }
      return result;
    }

    private static IReadOnlyDictionary<string, int> ParseIntDictionary(JsonValue value, string path)
    {
      var objectValue = value as JsonObjectValue;
      if (objectValue == null) throw new InvalidOperationException(DisplayPath(path) + " must be an object");
      var result = new Dictionary<string, int>(StringComparer.Ordinal);
      foreach (var pair in objectValue.Members)
      {
        result.Add(pair.Key, RequireInt(pair.Value, path + "/" + pair.Key));
      }
      return result;
    }

    private static string RequireString(JsonValue value, string path)
    {
      var stringValue = value as JsonStringValue;
      if (stringValue == null) throw new InvalidOperationException(DisplayPath(path) + " must be a string");
      return stringValue.Value;
    }

    private static string? RequireNullableString(JsonValue value, string path)
    {
      return value is JsonNullValue ? (string?)null : RequireString(value, path);
    }

    private static bool RequireBoolean(JsonValue value, string path)
    {
      var booleanValue = value as JsonBooleanValue;
      if (booleanValue == null) throw new InvalidOperationException(DisplayPath(path) + " must be a boolean");
      return booleanValue.Value;
    }

    private static int RequireInt(JsonValue value, string path)
    {
      var number = value as JsonNumberValue;
      int parsed;
      if (number == null || !int.TryParse(number.Value, NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out parsed))
      {
        throw new InvalidOperationException(DisplayPath(path) + " must be an integer");
      }
      return parsed;
    }

    private static int RequireInt(JsonValue value, string path, int minimum)
    {
      var parsed = RequireInt(value, path);
      if (parsed < minimum) throw new InvalidOperationException(DisplayPath(path) + " must be at least " + minimum.ToString(CultureInfo.InvariantCulture));
      return parsed;
    }

    private static int? RequireNullableInt(JsonValue value, string path, int minimum)
    {
      return value is JsonNullValue ? (int?)null : RequireInt(value, path, minimum);
    }

    private static CanonicalDecimalString ParseCanonicalDecimal(JsonValue value, string path)
    {
      var raw = RequireString(value, path);
      if (!IsUnsignedCanonical(raw)) throw new InvalidOperationException(DisplayPath(path) + " must be a canonical unsigned decimal string");
      return new CanonicalDecimalString(raw);
    }

    private static CanonicalDecimalString? ParseNullableCanonicalDecimal(JsonValue value, string path)
    {
      return value is JsonNullValue ? (CanonicalDecimalString?)null : ParseCanonicalDecimal(value, path);
    }

    private static FixedInt64String ParseFixedInt64(JsonValue value, string path)
    {
      var raw = RequireString(value, path);
      long parsed;
      if (!IsSignedCanonical(raw) || !long.TryParse(raw, NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out parsed))
      {
        throw new InvalidOperationException(DisplayPath(path) + " must be a signed 64-bit canonical decimal string");
      }
      return new FixedInt64String(raw);
    }

    private static UnsignedInt64String ParseUnsignedInt64(JsonValue value, string path)
    {
      var raw = RequireString(value, path);
      ulong parsed;
      if (!IsUnsignedCanonical(raw) || !ulong.TryParse(raw, NumberStyles.None, CultureInfo.InvariantCulture, out parsed))
      {
        throw new InvalidOperationException(DisplayPath(path) + " must be an unsigned 64-bit canonical decimal string");
      }
      return new UnsignedInt64String(raw);
    }

    private static ContentVersion ParseContentVersion(JsonValue value, string path)
    {
      var raw = RequireString(value, path);
      if (raw.Length == 0) throw new InvalidOperationException(DisplayPath(path) + " must not be empty");
      for (var index = 0; index < raw.Length; index += 1)
      {
        var character = raw[index];
        var valid = character >= 'A' && character <= 'Z'
          || character >= 'a' && character <= 'z'
          || character >= '0' && character <= '9'
          || character == '.' || character == '_' || character == ':' || character == '-';
        if (!valid) throw new InvalidOperationException(DisplayPath(path) + " contains an invalid character");
      }
      return new ContentVersion(raw);
    }

    private static string RequireHash(JsonValue value, string path)
    {
      var raw = RequireString(value, path);
      if (raw.Length != 64) throw new InvalidOperationException(DisplayPath(path) + " must be a lowercase SHA-256 hash");
      for (var index = 0; index < raw.Length; index += 1)
      {
        var character = raw[index];
        if (!((character >= '0' && character <= '9') || (character >= 'a' && character <= 'f')))
        {
          throw new InvalidOperationException(DisplayPath(path) + " must be a lowercase SHA-256 hash");
        }
      }
      return raw;
    }

    private static QuestId? ParseNullableQuestId(JsonValue value, string path)
    {
      return value is JsonNullValue ? (QuestId?)null : new QuestId(RequireString(value, path));
    }

    private static EquipmentId? ParseNullableEquipmentId(JsonValue value, string path)
    {
      return value is JsonNullValue ? (EquipmentId?)null : new EquipmentId(RequireString(value, path));
    }

    private static bool IsUnsignedCanonical(string value)
    {
      if (value.Length == 0) return false;
      if (value[0] == '0') return value.Length == 1;
      for (var index = 0; index < value.Length; index += 1)
      {
        if (value[index] < '0' || value[index] > '9') return false;
      }
      return true;
    }

    private static bool IsSignedCanonical(string value)
    {
      if (value.Length == 0) return false;
      return value[0] == '-' ? value.Length > 1 && IsUnsignedCanonical(value.Substring(1)) : IsUnsignedCanonical(value);
    }

    private static string DisplayPath(string path)
    {
      return path.Length == 0 ? "/" : path;
    }

    private static SnapshotId ParseSnapshotId(JsonValue value, string path)
    {
      switch (RequireString(value, path))
      {
        case "launch": return SnapshotId.Launch;
        case "d90": return SnapshotId.D90;
        default: throw InvalidEnum(path, "SnapshotId");
      }
    }

    private static CurrencyId ParseCurrencyId(JsonValue value, string path)
    {
      switch (RequireString(value, path))
      {
        case "BrassCoin": return CurrencyId.BrassCoin;
        case "MoonShard": return CurrencyId.MoonShard;
        case "StarSeal": return CurrencyId.StarSeal;
        case "MetalFragment": return CurrencyId.MetalFragment;
        default: throw InvalidEnum(path, "CurrencyId");
      }
    }

    private static QuestKind ParseQuestKind(JsonValue value, string path)
    {
      switch (RequireString(value, path))
      {
        case "ReachLevel": return QuestKind.ReachLevel;
        case "ClearStage": return QuestKind.ClearStage;
        default: throw InvalidEnum(path, "QuestKind");
      }
    }

    private static QuestGroup ParseQuestGroup(JsonValue value, string path)
    {
      switch (RequireString(value, path))
      {
        case "main": return QuestGroup.Main;
        case "daily": return QuestGroup.Daily;
        case "weekly": return QuestGroup.Weekly;
        case "achievement": return QuestGroup.Achievement;
        case "tutorial": return QuestGroup.Tutorial;
        default: throw InvalidEnum(path, "QuestGroup");
      }
    }

    private static SkillPhase ParseSkillPhase(JsonValue value, string path)
    {
      switch (RequireString(value, path))
      {
        case "launch": return SkillPhase.Launch;
        case "d90": return SkillPhase.D90;
        default: throw InvalidEnum(path, "SkillPhase");
      }
    }

    private static Rarity ParseRarity(JsonValue value, string path)
    {
      switch (RequireString(value, path))
      {
        case "Common": return Rarity.Common;
        case "Fine": return Rarity.Fine;
        case "Rare": return Rarity.Rare;
        case "Epic": return Rarity.Epic;
        case "Astral": return Rarity.Astral;
        default: throw InvalidEnum(path, "Rarity");
      }
    }

    private static ProductKind ParseProductKind(JsonValue value, string path)
    {
      switch (RequireString(value, path))
      {
        case "FreeDaily": return ProductKind.FreeDaily;
        case "RewardedAd": return ProductKind.RewardedAd;
        case "SoftCurrency": return ProductKind.SoftCurrency;
        case "IapConsumable": return ProductKind.IapConsumable;
        case "IapNonConsumable": return ProductKind.IapNonConsumable;
        default: throw InvalidEnum(path, "ProductKind");
      }
    }

    private static PromotionKind ParsePromotionKind(JsonValue value, string path)
    {
      switch (RequireString(value, path))
      {
        case "launch": return PromotionKind.Launch;
        case "scheduled": return PromotionKind.Scheduled;
        default: throw InvalidEnum(path, "PromotionKind");
      }
    }

    private static Locale ParseLocale(JsonValue value, string path)
    {
      switch (RequireString(value, path))
      {
        case "ko": return Locale.Ko;
        case "en": return Locale.En;
        case "ja": return Locale.Ja;
        case "zh-CN": return Locale.ZhCn;
        case "zh-TW": return Locale.ZhTw;
        default: throw InvalidEnum(path, "Locale");
      }
    }

    private static SkillUnlockKind ParseSkillUnlockKind(JsonValue value, string path)
    {
      if (RequireString(value, path) == "Always") return SkillUnlockKind.Always;
      throw InvalidEnum(path, "SkillUnlockKind");
    }

    private static EligibilityKind ParseEligibilityKind(JsonValue value, string path)
    {
      if (RequireString(value, path) == "Always") return EligibilityKind.Always;
      throw InvalidEnum(path, "EligibilityKind");
    }

    private static InvalidOperationException InvalidEnum(string path, string enumName)
    {
      return new InvalidOperationException(DisplayPath(path) + " is not a valid " + enumName);
    }
  }
}
