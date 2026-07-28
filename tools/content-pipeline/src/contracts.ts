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
export type LocaleId = BrandedId<'LocaleId'>;
export type ManifestId = BrandedId<'ManifestId'>;
export type ReleaseCandidateId = BrandedId<'ReleaseCandidateId'>;

export interface CurrencyAmount {
  readonly currencyId: 'BrassCoin' | 'MoonShard' | 'StarSeal' | 'MetalFragment';
  readonly amount: FixedInt64String;
}

export interface Reward {
  readonly currencies: ReadonlyArray<CurrencyAmount>;
  readonly items: ReadonlyArray<{
    readonly definitionId: EquipmentId;
    readonly amount: number;
  }>;
  readonly skillCopies: ReadonlyArray<{
    readonly skillId: SkillId;
    readonly amount: number;
  }>;
  readonly accountExp: FixedInt64String;
}

export interface LocaleCatalog {
  readonly locale: 'ko' | 'en' | 'ja' | 'zh-CN' | 'zh-TW';
  readonly keyCount: number;
  readonly keys: ReadonlyArray<string>;
}

export interface ManifestComponent {
  readonly id: ManifestId;
  readonly bundle: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly dependencies: ReadonlyArray<string>;
  readonly minAppBuild: string;
}

export interface ReleaseCandidateComponent {
  readonly id: ReleaseCandidateId;
  readonly kind: string;
  readonly componentId: ManifestId;
  readonly sourceHash: string;
  readonly artifactHash: string;
}

export interface GameSnapshot {
  readonly snapshotId: 'launch' | 'd90';
  readonly contentVersion: ContentVersion;
  readonly offlineRewardCapSeconds: UnsignedInt64String;
}
