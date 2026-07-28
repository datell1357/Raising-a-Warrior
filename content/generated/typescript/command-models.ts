// generator: 20260727T000000Z-task3
// source-hash: 50d81fc2acb0c98ef1666aabab54eafbd2ddef235159eeddcdf8ceb1dc364688
// source: content/contracts/command.schema.json

import type { CanonicalDecimalString, ContentVersion, FixedInt64String } from './content-models';

export const generatedCommandGeneratorVersion = "20260727T000000Z-task3" as const;
export const generatedCommandSourceHash = "50d81fc2acb0c98ef1666aabab54eafbd2ddef235159eeddcdf8ceb1dc364688" as const;
export const generatedCommandDefinitionSource = 'content/contracts/command.schema.json' as const;
export const generatedCommandDomainErrors = ["VersionConflict","ContentOutdated","InsufficientCurrency","NotEligible","LimitReached","InvalidReceipt","ExpiredToken","IdempotencyConflict","AlreadyProcessed","TemporarilyUnavailable"] as const;

export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };
export type StateVersion = Brand<string, 'StateVersion'>;
export type CommandId = Brand<string, 'CommandId'>;
/** IdempotencyConflict reports reuse of a commandId with a different authenticated actor, operation, or canonical request hash. AlreadyProcessed is reserved for a new command whose semantic entitlement key was already consumed by an earlier command. */
export type DomainError = typeof generatedCommandDomainErrors[number];
export type CommandCurrencyId = "BrassCoin" | "MoonShard" | "StarSeal" | "MetalFragment";
export type NoopCommandKind = "noop";
export interface CommandCurrencyAmount { readonly currencyId: CommandCurrencyId; readonly amount: CanonicalDecimalString; }
export interface NoopCommandPayload { readonly kind: "noop"; }
export interface NoopResultPayload { readonly ok: boolean; }
/** A commandId is idempotent within the authenticated actor and operation. An exact retry with the same actor, operation, and canonical request hash returns the original response; a different actor, operation, or request hash using the same commandId returns IdempotencyConflict. */
export interface CommandEnvelope { readonly commandId: CommandId; readonly expectedStateVersion: StateVersion; readonly clientBuild: string; readonly contentVersion: ContentVersion; readonly payload: NoopCommandPayload; }
export interface CommandResult { readonly commandId: CommandId; readonly stateVersion: StateVersion; readonly serverTime: FixedInt64String; readonly walletDelta: ReadonlyArray<CommandCurrencyAmount>; readonly payload: NoopResultPayload; readonly snapshotRequired: boolean; }
export interface CommandError { readonly commandId: CommandId; readonly error: DomainError; readonly message: string; }
