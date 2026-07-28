import { buildCsharpModelFile } from './csharp-model-generator.mjs';

export function buildModelFiles(snapshot, sourceHash, generatorVersion) {
  const header = `// generator: ${generatorVersion}
// source-hash: ${sourceHash}
// content-version: ${snapshot.contentVersion}
// source: content/contracts/game.schema.json
`;
  const ts = `${header}
export const generatedGeneratorVersion = ${JSON.stringify(generatorVersion)} as const;
export const generatedSourceHash = ${JSON.stringify(sourceHash)} as const;
export const generatedContentVersion = ${JSON.stringify(snapshot.contentVersion)} as const;
export const generatedSnapshotId = ${JSON.stringify(snapshot.snapshotId)} as const;
export const generatedDefinitionSource = 'content/contracts/game.schema.json' as const;

export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };
export type BrandedId<TBrand extends string> = Brand<string, TBrand>;
export type CanonicalDecimalString = Brand<string, 'CanonicalDecimalString'>;
export type FixedInt64String = Brand<string, 'FixedInt64String'>;
export type UnsignedInt64String = Brand<string, 'UnsignedInt64String'>;
export type ContentVersion = Brand<string, 'ContentVersion'>;
export type RegionId = BrandedId<'RegionId'>;
export type StageId = BrandedId<'StageId'>;
export type CellId = BrandedId<'CellId'>;
export type QuestId = BrandedId<'QuestId'>;
export type SkillId = BrandedId<'SkillId'>;
export type EquipmentId = BrandedId<'EquipmentId'>;
export type SummonPoolId = BrandedId<'SummonPoolId'>;
export type ProductId = BrandedId<'ProductId'>;
export type PromotionId = BrandedId<'PromotionId'>;
export type ManifestId = BrandedId<'ManifestId'>;
export type ReleaseCandidateId = BrandedId<'ReleaseCandidateId'>;
export type CurrencyId = 'BrassCoin' | 'MoonShard' | 'StarSeal' | 'MetalFragment';
export type SkillPhase = 'launch' | 'd90';
export type Rarity = 'Common' | 'Fine' | 'Rare' | 'Epic' | 'Astral';
export type ProductKind = 'FreeDaily' | 'RewardedAd' | 'SoftCurrency' | 'IapConsumable' | 'IapNonConsumable';
export type PromotionKind = 'launch' | 'scheduled';
export type Locale = 'ko' | 'en' | 'ja' | 'zh-CN' | 'zh-TW';

export interface CurrencyAmount { readonly currencyId: CurrencyId; readonly amount: CanonicalDecimalString; }
export interface RewardItem { readonly definitionId: EquipmentId; readonly amount: number; }
export interface SkillCopy { readonly skillId: SkillId; readonly amount: number; }
export interface Reward { readonly currencies: ReadonlyArray<CurrencyAmount>; readonly items: ReadonlyArray<RewardItem>; readonly skillCopies: ReadonlyArray<SkillCopy>; readonly accountExp: CanonicalDecimalString; }
export interface Region { readonly id: RegionId; readonly order: number; readonly stageIds: ReadonlyArray<StageId>; }
export interface Stage { readonly id: StageId; readonly regionId: RegionId; readonly order: number; readonly cellIds: ReadonlyArray<CellId>; readonly bossCellId: CellId; }
export interface Cell { readonly id: CellId; readonly regionId: RegionId; readonly stageId: StageId; readonly order: number; readonly rewardKey: string; }
export interface QuestObjective { readonly kind: 'ReachLevel' | 'ClearStage'; readonly targetId: string | null; readonly targetAmount: CanonicalDecimalString; }
export interface Quest { readonly id: QuestId; readonly group: 'main' | 'daily' | 'weekly' | 'achievement' | 'tutorial'; readonly sequence: number; readonly objective: QuestObjective; readonly reward: Reward; readonly nextQuestId: QuestId | null; }
export interface QuestGroups { readonly main: ReadonlyArray<Quest>; readonly daily: ReadonlyArray<Quest>; readonly weekly: ReadonlyArray<Quest>; readonly achievement: ReadonlyArray<Quest>; readonly tutorial: ReadonlyArray<Quest>; }
export interface SkillUnlock { readonly kind: 'Always'; }
export interface Skill { readonly id: SkillId; readonly phase: SkillPhase; readonly rarity: Rarity; readonly targetRule: string; readonly basePower: FixedInt64String; readonly powerPerLevel: FixedInt64String; readonly targetCount: number; readonly cooldownMs: number; readonly resourceCost: number; readonly learnCost: ReadonlyArray<CurrencyAmount>; readonly upgradeCostCurveId: string; readonly unlock: SkillUnlock; readonly visualKey: string; readonly localizationKey: string; }
export interface EquipmentStats { readonly attack: FixedInt64String; readonly health: FixedInt64String; }
export interface Equipment { readonly id: EquipmentId; readonly slot: string; readonly rarity: Rarity; readonly tier: number; readonly baseStats: EquipmentStats; readonly statGrowthCurveId: string; readonly fuseInputCount: number; readonly fuseOutputId: EquipmentId | null; readonly visualKey: string; readonly localizationKey: string; }
export interface SummonPoolEntry { readonly equipmentId: EquipmentId; readonly weight?: CanonicalDecimalString; }
export interface SummonPool { readonly id: SummonPoolId; readonly version: number; readonly startsAt: string; readonly endsAt: string | null; readonly costOne: ReadonlyArray<CurrencyAmount>; readonly costTen: ReadonlyArray<CurrencyAmount>; readonly entries: ReadonlyArray<SummonPoolEntry>; readonly guaranteedRarityOnTen: Rarity; readonly pityAt: number; readonly pityRarity: Rarity; readonly duplicateConversion: Readonly<Record<string, number>>; readonly validationSecret?: string; }
export interface EligibilityRule { readonly kind: 'Always'; }
export interface StoreProduct { readonly id: ProductId; readonly kind: ProductKind; readonly storeProductId: string | null; readonly priceCurrency: string | null; readonly priceAmount: CanonicalDecimalString | null; readonly reward: Reward; readonly dailyLimit: number | null; readonly startsAt: string | null; readonly endsAt: string | null; readonly eligibilityRule: EligibilityRule; }
export interface Promotion { readonly id: PromotionId; readonly kind: PromotionKind; readonly componentId: ManifestId; readonly startsAt: string; readonly endsAt: string | null; }
export interface LocaleCatalog { readonly locale: Locale; readonly keyCount: number; readonly keys: ReadonlyArray<string>; }
export interface ManifestComponent { readonly id: ManifestId; readonly bundle: string; readonly sha256: string; readonly sizeBytes: number; readonly dependencies: ReadonlyArray<string>; readonly minAppBuild: string; }
export interface ReleaseCandidateComponent { readonly id: ReleaseCandidateId; readonly kind: string; readonly componentId: ManifestId; readonly sourceHash: string; readonly artifactHash: string; }
export interface BaselineCounts { readonly launch: number; readonly scheduled: number; readonly total: number; }
export interface BaselineEquipment { readonly slots: number; readonly rarities: number; readonly tiers: number; }
export interface BaselineStore { readonly freeDaily: number; readonly rewardedAds: number; readonly currencyProducts: number; readonly starterPack: number; readonly adRemoval: number; }
export interface Baseline { readonly weeks: 64; readonly launchBaseline: string; readonly questBaseline: ReadonlyArray<number>; readonly skills: BaselineCounts; readonly equipment: BaselineEquipment; readonly store: BaselineStore; readonly promotion: BaselineCounts; readonly locales: ReadonlyArray<string>; readonly roles: ReadonlyArray<string>; readonly devices: ReadonlyArray<string>; }
export interface Ownership { readonly requirements: ReadonlyArray<string>; readonly featureCount: number; readonly specCount: number; readonly features: ReadonlyArray<string>; readonly specs: ReadonlyArray<string>; }
export interface GameSnapshot { readonly snapshotId: 'launch' | 'd90'; readonly contentVersion: ContentVersion; readonly offlineRewardCapSeconds: UnsignedInt64String; readonly baseline: Baseline; readonly regions: ReadonlyArray<Region>; readonly stages: ReadonlyArray<Stage>; readonly cells: ReadonlyArray<Cell>; readonly quests: QuestGroups; readonly skills: ReadonlyArray<Skill>; readonly equipment: ReadonlyArray<Equipment>; readonly summonPools: ReadonlyArray<SummonPool>; readonly storeProducts: ReadonlyArray<StoreProduct>; readonly promotions: ReadonlyArray<Promotion>; readonly localeCatalogs: ReadonlyArray<LocaleCatalog>; readonly manifests: ReadonlyArray<ManifestComponent>; readonly releaseCandidates: ReadonlyArray<ReleaseCandidateComponent>; readonly ownership: Ownership; }
export interface PublicOddsEntry { readonly equipmentId: EquipmentId; readonly ppm: number; }
export interface PublicOddsPool { readonly id: SummonPoolId; readonly denominator: 1000000; readonly oddsByEquipment: ReadonlyArray<PublicOddsEntry>; }
`;
  const cs = buildCsharpModelFile(header, snapshot, sourceHash, generatorVersion);
  const csProvenance = `${header}
namespace Content.Generated.Provenance.${snapshot.snapshotId === 'launch' ? 'Launch' : 'D90'} {
  public static class ModelProvenance {
    public const string GeneratorVersion = ${JSON.stringify(generatorVersion)};
    public const string SourceHash = ${JSON.stringify(sourceHash)};
    public const string ContentVersion = ${JSON.stringify(snapshot.contentVersion)};
    public const string SnapshotId = ${JSON.stringify(snapshot.snapshotId)};
  }
}
`;
  return { ts, cs, csProvenance };
}
