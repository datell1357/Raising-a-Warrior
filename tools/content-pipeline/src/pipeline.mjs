import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildModelFiles } from './model-generator.mjs';
import { buildCommandModelFiles } from './command-model-generator.mjs';
import { validateNamedSchema } from './schema-engine.mjs';

export const GENERATOR_VERSION = '20260727T000000Z-task3';
export const REQUIRED_LOCALES = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW'];

const INT64_MAX = 9223372036854775807n;
const UINT64_MAX = 18446744073709551615n;
const PUBLIC_ODDS_DENOMINATOR = 1000000;

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

export function stable(value) {
  if (Array.isArray(value)) return '[' + value.map((entry) => stable(entry)).join(',') + ']';
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((key) => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function fail(code, pointer, message, extra = {}) {
  const payload = { code, pointer, message, ...extra };
  const error = new Error(message);
  error.code = code;
  error.pointer = pointer;
  error.payload = payload;
  throw error;
}

export function readJsonText(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    fail('MALFORMED_JSON', '', `invalid JSON: ${error.message}`);
  }
}

function isCanonicalDecimalString(value) {
  return typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value);
}

function isSignedCanonicalDecimalString(value) {
  return typeof value === 'string' && /^-?(0|[1-9][0-9]*)$/.test(value);
}

function assertCanonicalUnsigned(value, pointer) {
  if (!isCanonicalDecimalString(value)) fail('OFFLINE_CAP_INVALID', pointer, 'expected canonical unsigned decimal string');
  const big = BigInt(value);
  if (big > UINT64_MAX) fail('FIXED_INT64_OVERFLOW', pointer, 'unsigned int64 overflow');
  return big;
}

function assertFixedInt64(value, pointer) {
  if (!isSignedCanonicalDecimalString(value)) fail('FIXED_INT64_OVERFLOW', pointer, 'expected canonical signed decimal string');
  const big = BigInt(value);
  if (big < -INT64_MAX - 1n || big > INT64_MAX) fail('FIXED_INT64_OVERFLOW', pointer, 'fixed int64 overflow');
  return big;
}

function ensure(condition, code, pointer, message, extra = {}) {
  if (!condition) fail(code, pointer, message, extra);
}

function assertArray(value, pointer) {
  ensure(Array.isArray(value), 'SCHEMA_MISMATCH', pointer, 'expected array');
  return value;
}

function assertObject(value, pointer) {
  ensure(value && typeof value === 'object' && !Array.isArray(value), 'SCHEMA_MISMATCH', pointer, 'expected object');
  return value;
}

function countBy(list, selector) {
  const counts = new Map();
  for (const item of list) {
    const key = selector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function validateQuests(quests, pointer) {
  const groups = [
    ['main', 20],
    ['daily', 8],
    ['weekly', 6],
    ['achievement', 40],
    ['tutorial', 28],
  ];
  for (const [group, expected] of groups) {
    const arr = assertArray(quests[group], `${pointer}/${group}`);
    ensure(arr.length === expected, 'QUEST_DRIFT', `${pointer}/${group}`, `expected ${expected} quests`);
    const idSet = new Set();
    for (const [index, quest] of arr.entries()) {
      const q = assertObject(quest, `${pointer}/${group}/${index}`);
      ensure(!idSet.has(q.id), 'DUPLICATE_ID', `${pointer}/${group}/${index}/id`, 'duplicate quest id');
      idSet.add(q.id);
      ensure(typeof q.id === 'string', 'SCHEMA_MISMATCH', `${pointer}/${group}/${index}/id`, 'expected quest id string');
      ensure(q.sequence === arr[index].sequence, 'SCHEMA_MISMATCH', `${pointer}/${group}/${index}/sequence`, 'sequence mismatch');
      const amount = assertCanonicalUnsigned(q.objective.targetAmount, `${pointer}/${group}/${index}/objective/targetAmount`);
      ensure(amount >= 0n, 'SCHEMA_MISMATCH', `${pointer}/${group}/${index}/objective/targetAmount`, 'invalid quest target amount');
      if (q.nextQuestId !== null) {
        ensure(typeof q.nextQuestId === 'string', 'SCHEMA_MISMATCH', `${pointer}/${group}/${index}/nextQuestId`, 'expected nextQuestId string');
      }
    }
    const map = new Map(arr.map((quest) => [quest.id, quest]));
    let current = arr[0];
    const seen = new Set();
    while (current) {
      ensure(!seen.has(current.id), 'CYCLIC_QUEST', `${pointer}/${group}`, 'quest chain contains a cycle');
      seen.add(current.id);
      if (!current.nextQuestId) break;
      current = map.get(current.nextQuestId);
      ensure(current !== undefined, 'SCHEMA_MISMATCH', `${pointer}/${group}`, 'quest chain references unknown nextQuestId');
    }
  }
}

function validateRegions(snapshot, pointer) {
  const regions = assertArray(snapshot.regions, `${pointer}/regions`);
  const stages = assertArray(snapshot.stages, `${pointer}/stages`);
  const cells = assertArray(snapshot.cells, `${pointer}/cells`);
  const baseline = assertObject(snapshot.baseline, `${pointer}/baseline`);
  const expected = baseline.launchBaseline;
  ensure(typeof expected === 'string', 'RELATION_DRIFT_330300', `${pointer}/baseline/launchBaseline`, 'expected baseline string');
  const [regionCount, stageCount, cellCount] = expected.split('/').map((part) => Number(part));
  ensure(regions.length === regionCount, 'RELATION_DRIFT_330300', `${pointer}/regions`, `expected ${regionCount} regions`);
  ensure(stages.length === stageCount, 'RELATION_DRIFT_330300', `${pointer}/stages`, `expected ${stageCount} stages`);
  ensure(cells.length === cellCount, 'RELATION_DRIFT_330300', `${pointer}/cells`, `expected ${cellCount} cells`);
  const regionIds = new Set();
  for (const [index, region] of regions.entries()) {
    const item = assertObject(region, `${pointer}/regions/${index}`);
    ensure(!regionIds.has(item.id), 'DUPLICATE_ID', `${pointer}/regions/${index}/id`, 'duplicate region id');
    regionIds.add(item.id);
  }
  const stageIds = new Set();
  const regionStageCounts = new Map();
  for (const [index, stage] of stages.entries()) {
    const item = assertObject(stage, `${pointer}/stages/${index}`);
    ensure(!stageIds.has(item.id), 'DUPLICATE_ID', `${pointer}/stages/${index}/id`, 'duplicate stage id');
    stageIds.add(item.id);
    const count = regionStageCounts.get(item.regionId) ?? 0;
    regionStageCounts.set(item.regionId, count + 1);
    ensure(Array.isArray(item.cellIds) && item.cellIds.length === 10, 'RELATION_DRIFT_330300', `${pointer}/stages/${index}/cellIds`, 'expected 10 cells per stage');
  }
  for (const region of regions) {
    ensure((regionStageCounts.get(region.id) ?? 0) === 10, 'RELATION_DRIFT_330300', `${pointer}/regions`, 'expected 10 stages per region');
  }
  const cellIds = new Set();
  const stageCellCounts = new Map();
  for (const [index, cell] of cells.entries()) {
    const item = assertObject(cell, `${pointer}/cells/${index}`);
    ensure(!cellIds.has(item.id), 'DUPLICATE_ID', `${pointer}/cells/${index}/id`, 'duplicate cell id');
    cellIds.add(item.id);
    ensure(stageIds.has(item.stageId), 'RELATION_DRIFT_330300', `${pointer}/cells/${index}/stageId`, 'cell references unknown stage');
    const count = stageCellCounts.get(item.stageId) ?? 0;
    stageCellCounts.set(item.stageId, count + 1);
  }
  for (const stage of stages) {
    ensure((stageCellCounts.get(stage.id) ?? 0) === 10, 'RELATION_DRIFT_330300', `${pointer}/stages`, 'expected 10 cells per stage');
  }
}

function validateSkills(skills, pointer, expectedTotal) {
  const arr = assertArray(skills, pointer);
  ensure(arr.length === expectedTotal, 'SKILL_DRIFT', pointer, `expected ${expectedTotal} skills`);
  for (const [index, skill] of arr.entries()) {
    const item = assertObject(skill, `${pointer}/${index}`);
    assertFixedInt64(item.basePower, `${pointer}/${index}/basePower`);
    assertFixedInt64(item.powerPerLevel, `${pointer}/${index}/powerPerLevel`);
    ensure(Number.isInteger(item.cooldownMs) && item.cooldownMs > 0, 'SCHEMA_MISMATCH', `${pointer}/${index}/cooldownMs`, 'cooldown must be positive integer');
  }
}

function validateEquipment(equipment, pointer) {
  const arr = assertArray(equipment, pointer);
  ensure(arr.length === 60, 'EQUIPMENT_DRIFT', pointer, 'expected 60 equipment defs');
  const combos = new Set();
  for (const [index, item] of arr.entries()) {
    const eq = assertObject(item, `${pointer}/${index}`);
    const key = `${eq.slot}:${eq.rarity}:${eq.tier}`;
    combos.add(key);
    assertFixedInt64(eq.baseStats.attack, `${pointer}/${index}/baseStats/attack`);
    assertFixedInt64(eq.baseStats.health, `${pointer}/${index}/baseStats/health`);
  }
  ensure(combos.size === 60, 'EQUIPMENT_DRIFT', pointer, 'expected 3x5x4 equipment grid');
}

function validateSummonPools(pools, pointer, { client }) {
  const arr = assertArray(pools, pointer);
  for (const [index, pool] of arr.entries()) {
    const item = assertObject(pool, `${pointer}/${index}`);
    const entries = assertArray(item.entries, `${pointer}/${index}/entries`);
    if (client) {
      ensure(entries.length > 0, 'ZERO_WEIGHT_POOL', `${pointer}/${index}/entries`, 'client projection requires odds summary entries');
      for (const [entryIndex, entry] of entries.entries()) {
        const e = assertObject(entry, `${pointer}/${index}/entries/${entryIndex}`);
        ensure(!Object.prototype.hasOwnProperty.call(e, 'weight'), 'CLIENT_SERVER_WEIGHT_LEAK', `${pointer}/${index}/entries/${entryIndex}`, 'client projection exposes server weight');
      }
      ensure(!Object.prototype.hasOwnProperty.call(item, 'validationSecret'), 'CLIENT_SERVER_WEIGHT_LEAK', `${pointer}/${index}`, 'client projection exposes server secret');
      continue;
    }
    let total = 0n;
    for (const [entryIndex, entry] of entries.entries()) {
      const e = assertObject(entry, `${pointer}/${index}/entries/${entryIndex}`);
      const weight = assertCanonicalUnsigned(e.weight, `${pointer}/${index}/entries/${entryIndex}/weight`);
      total += weight;
    }
    ensure(total > 0n, 'ZERO_WEIGHT_POOL', `${pointer}/${index}/entries`, 'summon pool weight sum must be positive');
  }
}

function validateStoreProducts(products, pointer) {
  const arr = assertArray(products, pointer);
  const counts = countBy(arr, (item) => item.kind);
  ensure((counts.get('FreeDaily') ?? 0) === 1, 'STORE_DRIFT', pointer, 'expected 1 free daily product');
  ensure((counts.get('RewardedAd') ?? 0) === 2, 'STORE_DRIFT', pointer, 'expected 2 rewarded ad products');
  ensure((counts.get('SoftCurrency') ?? 0) === 4, 'STORE_DRIFT', pointer, 'expected 4 currency products');
  ensure((counts.get('IapConsumable') ?? 0) === 1, 'STORE_DRIFT', pointer, 'expected 1 starter pack');
  ensure((counts.get('IapNonConsumable') ?? 0) === 1, 'STORE_DRIFT', pointer, 'expected 1 ad removal product');
  for (const [index, product] of arr.entries()) {
    const item = assertObject(product, `${pointer}/${index}`);
    for (const reward of item.reward.currencies) {
      const amount = assertFixedInt64(reward.amount, `${pointer}/${index}/reward/currencies`);
      ensure(amount >= 0n, 'NEGATIVE_COST', `${pointer}/${index}/reward/currencies`, 'reward currency amount must be non-negative');
    }
    if (item.priceAmount !== null) {
      const price = assertFixedInt64(item.priceAmount, `${pointer}/${index}/priceAmount`);
      ensure(price >= 0n, 'NEGATIVE_COST', `${pointer}/${index}/priceAmount`, 'price amount must be non-negative');
    }
  }
}

function validatePromotions(promotions, pointer) {
  const arr = assertArray(promotions, pointer);
  const counts = countBy(arr, (item) => item.kind);
  ensure(arr.length === 6, 'PROMOTION_DRIFT', pointer, 'expected 6 promotions');
  ensure((counts.get('launch') ?? 0) === 5, 'PROMOTION_DRIFT', pointer, 'expected 5 launch promotions');
  ensure((counts.get('scheduled') ?? 0) === 1, 'PROMOTION_DRIFT', pointer, 'expected 1 scheduled promotion');
}

function validateLocaleCatalogs(localeCatalogs, pointer) {
  const arr = assertArray(localeCatalogs, pointer);
  ensure(arr.length === 5, 'LOCALE_DRIFT', pointer, 'expected 5 locale catalogs');
  const locales = new Set();
  for (const [index, locale] of arr.entries()) {
    const item = assertObject(locale, `${pointer}/${index}`);
    ensure(REQUIRED_LOCALES.includes(item.locale), 'LOCALE_DRIFT', `${pointer}/${index}/locale`, 'unexpected locale');
    ensure(!locales.has(item.locale), 'DUPLICATE_ID', `${pointer}/${index}/locale`, 'duplicate locale');
    locales.add(item.locale);
    ensure(item.keyCount === item.keys.length, 'LOCALE_DRIFT', `${pointer}/${index}/keyCount`, 'keyCount mismatch');
  }
}

function validateOwnership(ownership, pointer) {
  const item = assertObject(ownership, pointer);
  ensure(item.featureCount === 18, 'OWNERSHIP_DRIFT_18_55', `${pointer}/featureCount`, 'expected 18 features');
  ensure(item.specCount === 55, 'OWNERSHIP_DRIFT_18_55', `${pointer}/specCount`, 'expected 55 specs');
}

function validateManifests(manifests, pointer) {
  const arr = assertArray(manifests, pointer);
  for (const [index, manifest] of arr.entries()) {
    const item = assertObject(manifest, `${pointer}/${index}`);
    ensure(typeof item.sha256 === 'string' && /^[a-f0-9]{64}$/.test(item.sha256), 'SCHEMA_MISMATCH', `${pointer}/${index}/sha256`, 'invalid sha256');
  }
}

function validateReleaseCandidates(releaseCandidates, pointer) {
  const arr = assertArray(releaseCandidates, pointer);
  for (const [index, candidate] of arr.entries()) {
    const item = assertObject(candidate, `${pointer}/${index}`);
    ensure(typeof item.sourceHash === 'string' && /^[a-f0-9]{64}$/.test(item.sourceHash), 'SCHEMA_MISMATCH', `${pointer}/${index}/sourceHash`, 'invalid sourceHash');
    ensure(typeof item.artifactHash === 'string' && /^[a-f0-9]{64}$/.test(item.artifactHash), 'SCHEMA_MISMATCH', `${pointer}/${index}/artifactHash`, 'invalid artifactHash');
  }
}

function buildClientProjection(snapshot) {
  return {
    snapshotId: snapshot.snapshotId,
    contentVersion: snapshot.contentVersion,
    offlineRewardCapSeconds: snapshot.offlineRewardCapSeconds,
    baseline: snapshot.baseline,
    regions: snapshot.regions,
    stages: snapshot.stages,
    cells: snapshot.cells,
    quests: snapshot.quests,
    skills: snapshot.skills,
    equipment: snapshot.equipment,
    summonPools: snapshot.summonPools.map((pool) => ({
      id: pool.id,
      version: pool.version,
      startsAt: pool.startsAt,
      endsAt: pool.endsAt,
      costOne: pool.costOne,
      costTen: pool.costTen,
      guaranteedRarityOnTen: pool.guaranteedRarityOnTen,
      pityAt: pool.pityAt,
      pityRarity: pool.pityRarity,
      duplicateConversion: pool.duplicateConversion,
      entries: pool.entries.map((entry) => ({ equipmentId: entry.equipmentId })),
    })),
    storeProducts: snapshot.storeProducts,
    promotions: snapshot.promotions,
    localeCatalogs: snapshot.localeCatalogs,
    manifests: snapshot.manifests,
    releaseCandidates: snapshot.releaseCandidates,
    ownership: snapshot.ownership,
  };
}

function buildServerProjection(snapshot) {
  return snapshot;
}

export function validatePublicOddsProjection(pools) {
  const list = assertArray(pools, '/publicOdds');
  for (const [poolIndex, pool] of list.entries()) {
    const item = assertObject(pool, `/publicOdds/${poolIndex}`);
    ensure(item.denominator === PUBLIC_ODDS_DENOMINATOR, 'PUBLIC_ODDS_NORMALIZATION', `/publicOdds/${poolIndex}/denominator`, 'public odds denominator must be 1000000');
    ensure(!Object.prototype.hasOwnProperty.call(item, 'totalWeight'), 'CLIENT_SERVER_WEIGHT_LEAK', `/publicOdds/${poolIndex}`, 'public odds expose raw server weight');
    const entries = assertArray(item.oddsByEquipment, `/publicOdds/${poolIndex}/oddsByEquipment`);
    const total = entries.reduce((sum, entry, entryIndex) => {
      const odds = assertObject(entry, `/publicOdds/${poolIndex}/oddsByEquipment/${entryIndex}`);
      ensure(!Object.prototype.hasOwnProperty.call(odds, 'weight'), 'CLIENT_SERVER_WEIGHT_LEAK', `/publicOdds/${poolIndex}/oddsByEquipment/${entryIndex}`, 'public odds expose raw server weight');
      ensure(Number.isInteger(odds.ppm) && odds.ppm >= 0, 'PUBLIC_ODDS_NORMALIZATION', `/publicOdds/${poolIndex}/oddsByEquipment/${entryIndex}/ppm`, 'public odds ppm must be a non-negative integer');
      return sum + odds.ppm;
    }, 0);
    ensure(total === item.denominator, 'PUBLIC_ODDS_NORMALIZATION', `/publicOdds/${poolIndex}/oddsByEquipment`, 'public odds must sum exactly to the denominator');
  }
  return list;
}

export function buildPublicOddsProjection(snapshot) {
  return snapshot.summonPools.map((pool) => {
    const totalWeight = pool.entries.reduce((sum, entry) => sum + BigInt(entry.weight), 0n);
    const scaled = pool.entries.map((entry) => {
      const numerator = BigInt(entry.weight) * BigInt(PUBLIC_ODDS_DENOMINATOR);
      return {
        equipmentId: entry.equipmentId,
        ppm: Number(numerator / totalWeight),
        remainder: numerator % totalWeight,
      };
    });
    let remaining = PUBLIC_ODDS_DENOMINATOR - scaled.reduce((sum, entry) => sum + entry.ppm, 0);
    scaled.sort((left, right) => {
      if (left.remainder !== right.remainder) return left.remainder > right.remainder ? -1 : 1;
      return left.equipmentId.localeCompare(right.equipmentId);
    });
    for (let index = 0; index < remaining; index += 1) scaled[index].ppm += 1;
    const oddsByEquipment = scaled
      .sort((left, right) => left.equipmentId.localeCompare(right.equipmentId))
      .map(({ equipmentId, ppm }) => ({ equipmentId, ppm }));
    return {
      id: pool.id,
      denominator: PUBLIC_ODDS_DENOMINATOR,
      oddsByEquipment,
    };
  });
}

export function hashArtifact(value) {
  return sha256(stable(value));
}

export function loadSnapshot(filePath) {
  return readFile(filePath, 'utf8').then(readJsonText);
}

export function validateSnapshot(snapshot, { client = false, schemas = null } = {}) {
  const root = assertObject(snapshot, '');
  if (schemas) validateNamedSchema(root, 'game.schema.json', schemas);
  ensure(typeof root.contentVersion === 'string', 'SCHEMA_MISMATCH', '/contentVersion', 'expected contentVersion string');
  ensure(root.offlineRewardCapSeconds !== undefined, 'OFFLINE_CAP_MISSING', '/offlineRewardCapSeconds', 'missing offlineRewardCapSeconds');
  const cap = assertCanonicalUnsigned(root.offlineRewardCapSeconds, '/offlineRewardCapSeconds');
  validateRegions(root, '');
  validateQuests(root.quests, '/quests');
  validateSkills(root.skills, '/skills', root.snapshotId === 'launch' ? 18 : 24);
  validateEquipment(root.equipment, '/equipment');
  validateSummonPools(root.summonPools, '/summonPools', { client });
  validateStoreProducts(root.storeProducts, '/storeProducts');
  validatePromotions(root.promotions, '/promotions');
  validateLocaleCatalogs(root.localeCatalogs, '/localeCatalogs');
  validateManifests(root.manifests, '/manifests');
  validateReleaseCandidates(root.releaseCandidates, '/releaseCandidates');
  validateOwnership(root.ownership, '/ownership');
  return root;
}

export async function generateArtifacts(snapshot, rootDir, schemas = null) {
  const commandSchema = schemas?.['command.schema.json'];
  if (!commandSchema) fail('SCHEMA_VALIDATION_ERROR', '', 'command.schema.json is required for model generation');
  const sourceHash = sha256(stable(snapshot));
  const commandSourceHash = sha256(stable(commandSchema));
  const projection = {
    client: buildClientProjection(snapshot),
    server: buildServerProjection(snapshot),
    publicOdds: buildPublicOddsProjection(snapshot),
  };
  const projectionHashes = {
    client: hashArtifact(projection.client),
    server: hashArtifact(projection.server),
    publicOdds: hashArtifact(projection.publicOdds),
  };
  validatePublicOddsProjection(projection.publicOdds);
  if (schemas) {
    validateNamedSchema(projection.client, 'game.schema.json', schemas);
    validateNamedSchema(projection.server, 'game.schema.json', schemas);
  }
  const files = buildModelFiles(snapshot, sourceHash, GENERATOR_VERSION);
  const commandFiles = buildCommandModelFiles(commandSchema, commandSourceHash, GENERATOR_VERSION);
  const tsPath = resolve(rootDir, `content/generated/typescript/${snapshot.snapshotId}-models.ts`);
  const csPath = resolve(rootDir, `content/generated/csharp/${snapshot.snapshotId}-models.cs`);
  const sharedTsPath = resolve(rootDir, 'content/generated/typescript/content-models.ts');
  const sharedCsPath = resolve(rootDir, 'content/generated/csharp/ContentModels.cs');
  const commandTsPath = resolve(rootDir, 'content/generated/typescript/command-models.ts');
  const commandCsPath = resolve(rootDir, 'content/generated/csharp/CommandModels.cs');
  await mkdir(dirname(tsPath), { recursive: true });
  await mkdir(dirname(csPath), { recursive: true });
  const existingTs = await readFile(tsPath, 'utf8').catch(() => null);
  const existingCs = await readFile(csPath, 'utf8').catch(() => null);
  const tempTs = `${tsPath}.tmp`;
  const tempCs = `${csPath}.tmp`;
  await writeFile(tempTs, files.ts, 'utf8');
  await writeFile(tempCs, files.csProvenance, 'utf8');
  await rename(tempTs, tsPath);
  await rename(tempCs, csPath);
  if (snapshot.snapshotId === 'd90') {
    await writeFile(sharedTsPath, files.ts, 'utf8');
    await writeFile(sharedCsPath, files.cs, 'utf8');
    await writeFile(commandTsPath, commandFiles.ts, 'utf8');
    await writeFile(commandCsPath, commandFiles.cs, 'utf8');
  }
  return {
    sourceHash,
    commandSourceHash,
    projection,
    projectionHashes,
    modelHashes: {
      typescript: sha256(files.ts),
      csharp: sha256(files.csProvenance),
      sharedCsharp: sha256(files.cs),
      commandTypescript: sha256(commandFiles.ts),
      commandCsharp: sha256(commandFiles.cs),
      priorTypescript: existingTs ? sha256(existingTs) : null,
      priorCsharp: existingCs ? sha256(existingCs) : null,
    },
  };
}

export function assertGeneratedModelMatches(language, expected, actual) {
  ensure(actual === expected, 'GENERATED_MODEL_DRIFT', `/generated/${language}`, `${language} model drift`);
}

export function compareGeneratedModels(snapshot, rootDir, schemas) {
  const commandSchema = schemas?.['command.schema.json'];
  if (!commandSchema) fail('SCHEMA_VALIDATION_ERROR', '', 'command.schema.json is required for model comparison');
  const sourceHash = sha256(stable(snapshot));
  const files = buildModelFiles(snapshot, sourceHash, GENERATOR_VERSION);
  const commandFiles = buildCommandModelFiles(commandSchema, sha256(stable(commandSchema)), GENERATOR_VERSION);
  const tsPath = resolve(rootDir, `content/generated/typescript/${snapshot.snapshotId}-models.ts`);
  const csPath = resolve(rootDir, `content/generated/csharp/${snapshot.snapshotId}-models.cs`);
  const sharedPaths = snapshot.snapshotId === 'd90'
    ? [
      resolve(rootDir, 'content/generated/typescript/content-models.ts'),
      resolve(rootDir, 'content/generated/csharp/ContentModels.cs'),
      resolve(rootDir, 'content/generated/typescript/command-models.ts'),
      resolve(rootDir, 'content/generated/csharp/CommandModels.cs'),
    ]
    : [];
  return Promise.all([
    readFile(tsPath, 'utf8').catch(() => null),
    readFile(csPath, 'utf8').catch(() => null),
    ...sharedPaths.map((path) => readFile(path, 'utf8').catch(() => null)),
  ]).then(([ts, cs, sharedTs, sharedCs, commandTs, commandCs]) => {
    assertGeneratedModelMatches('typescript', files.ts, ts);
    assertGeneratedModelMatches('csharp', files.csProvenance, cs);
    if (snapshot.snapshotId === 'd90') {
      assertGeneratedModelMatches('shared-typescript', files.ts, sharedTs);
      assertGeneratedModelMatches('shared-csharp', files.cs, sharedCs);
      assertGeneratedModelMatches('command-typescript', commandFiles.ts, commandTs);
      assertGeneratedModelMatches('command-csharp', commandFiles.cs, commandCs);
    }
    return { sourceHash, files };
  });
}

export function buildReport(cases) {
  return cases.map((item) => ({
    name: item.name,
    classname: 'content-pipeline',
    time: item.time ?? 0,
    failure: item.failure ?? null,
  }));
}

export function junitXml(testCases) {
  const escaped = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  const failures = testCases.filter((item) => item.failure);
  const body = testCases.map((item) => {
    const failure = item.failure ? `
      <failure message="${escaped(item.failure.message)}">${escaped(JSON.stringify(item.failure))}</failure>` : '';
    return `    <testcase name="${escaped(item.name)}" classname="content-pipeline" time="${item.time ?? 0}">${failure}
    </testcase>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="content-pipeline" tests="${testCases.length}" failures="${failures.length}" errors="0" skipped="0">
${body}
</testsuite>
`;
}
