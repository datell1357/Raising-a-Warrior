#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const CONTRACT_PATH = resolve(process.cwd(), 'docs/production/scope-contract.json');

function fail(message, pointer = '') {
  const suffix = pointer ? ` at ${pointer}` : '';
  console.error(`FAIL${suffix}: ${message}`);
  process.exit(1);
}

function gitFail(code, pointer, message, extra = {}) {
  console.error(JSON.stringify({ code, pointer, message, ...extra }));
  process.exit(1);
}

function runGit(args) {
  return spawnSync('git', args, { cwd: process.cwd(), encoding: 'utf8' });
}

function failGitCommand(result, pointer, message) {
  if (result.error) {
    if (result.error.code === 'ENOENT') {
      gitFail('GIT_BOOTSTRAP_GIT_ABSENT', '/git/bootstrap/gitExecutable', 'git executable not found');
    }
    gitFail('GIT_BOOTSTRAP_INVALID_COMMAND', pointer, result.error.message);
  }
  if (result.status !== 0) {
    gitFail('GIT_BOOTSTRAP_INVALID_COMMAND', pointer, message, { stderr: result.stderr.trim() });
  }
}

function validateGitBootstrap() {
  const workTree = runGit(['rev-parse', '--is-inside-work-tree']);
  if (workTree.error) {
    if (workTree.error.code === 'ENOENT') {
      gitFail('GIT_BOOTSTRAP_GIT_ABSENT', '/git/bootstrap/gitExecutable', 'git executable not found');
    }
    gitFail('GIT_BOOTSTRAP_INVALID_COMMAND', '/git/bootstrap/command', workTree.error.message);
  }
  if (workTree.status !== 0) {
    gitFail('GIT_BOOTSTRAP_OUTSIDE_WORK_TREE', '/git/bootstrap/inWorkTree', 'current working directory is not inside a Git work tree', { stderr: workTree.stderr.trim() });
  }
  if (workTree.stdout.trim() !== 'true') {
    gitFail('GIT_BOOTSTRAP_INVALID_COMMAND', '/git/bootstrap/inWorkTree', 'unexpected git work tree response', { actual: workTree.stdout.trim() });
  }

  const rootCommits = runGit(['rev-list', '--max-parents=0', '--all']);
  failGitCommand(rootCommits, '/git/bootstrap/rootCommits', 'unable to determine root commits');

  const roots = rootCommits.stdout.trim().split('\n').filter(Boolean);
  if (roots.length > 1) {
    gitFail('GIT_BOOTSTRAP_MULTIPLE_ROOT_COMMITS', '/git/bootstrap/rootCommits', `expected at most one root commit, got ${roots.length}`, { actual: roots.length });
  }
  if (roots.length === 1) {
    const rootTree = runGit(['ls-tree', '-r', '--name-only', roots[0]]);
    failGitCommand(rootTree, '/git/bootstrap/rootCommit/tree', 'unable to inspect root commit tree');
    const paths = rootTree.stdout.trim().split('\n').filter(Boolean);
    if (paths.length > 0) {
      gitFail('GIT_BOOTSTRAP_NONEMPTY_ROOT_TREE', '/git/bootstrap/rootCommit/tree', 'expected empty root tree with no paths', { actual: paths });
    }
  }
}

function pointerFor(parts) {
  return '/' + parts.map((part) => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}

function expect(cond, message, pointer) {
  if (!cond) fail(message, pointer);
}

function asObject(value, pointer) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('expected object', pointer);
  return value;
}

function asArray(value, pointer) {
  if (!Array.isArray(value)) fail('expected array', pointer);
  return value;
}

function checkExactArray(actual, expected, pointer, label) {
  const arr = asArray(actual, pointer);
  expect(arr.length === expected.length, `${label} length mismatch: expected ${expected.length}, got ${arr.length}`, pointer);
  for (let i = 0; i < expected.length; i += 1) {
    if (arr[i] !== expected[i]) {
      fail(`${label} mismatch: expected ${JSON.stringify(expected[i])}, got ${JSON.stringify(arr[i])}`, pointerFor([pointer.replace(/^\//, ''), i]));
    }
  }
}

function checkSet(actual, expected, pointer, label) {
  const arr = asArray(actual, pointer);
  const sortedActual = [...arr].sort();
  const sortedExpected = [...expected].sort();
  expect(sortedActual.length === sortedExpected.length, `${label} length mismatch: expected ${sortedExpected.length}, got ${sortedActual.length}`, pointer);
  for (let i = 0; i < sortedExpected.length; i += 1) {
    if (sortedActual[i] !== sortedExpected[i]) {
      fail(`${label} mismatch: expected ${JSON.stringify(sortedExpected[i])}, got ${JSON.stringify(sortedActual[i])}`, pointerFor([pointer.replace(/^\//, ''), i]));
    }
  }
}

async function main() {
  validateGitBootstrap();

  const source = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : CONTRACT_PATH;
  let parsed;
  try {
    const text = await readFile(source, 'utf8');
    parsed = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) fail(`invalid JSON: ${error.message}`);
    fail(error.message);
  }

  const root = asObject(parsed, '');
  const product = asObject(root.product, '/product');
  expect(product.horizonWeeks === 64, 'expected 64-week horizon', '/product/horizonWeeks');
  expect(product.launchBaseline === '3/30/300', 'expected launch 3/30/300', '/product/launchBaseline');
  expect(product.d90Baseline === '6/60/600', 'expected D90 6/60/600', '/product/d90Baseline');
  checkExactArray(product.questBaseline, [20, 8, 6, 40, 28], '/product/questBaseline', 'quest baseline');
  expect(product.skillBaseline?.launch === 18, 'expected 18 launch skills', '/product/skillBaseline/launch');
  expect(product.skillBaseline?.scheduled === 6, 'expected 6 scheduled skills', '/product/skillBaseline/scheduled');
  expect(product.equipmentBaseline?.slots === 3, 'expected 3 equipment slots', '/product/equipmentBaseline/slots');
  expect(product.equipmentBaseline?.rarities === 5, 'expected 5 equipment rarities', '/product/equipmentBaseline/rarities');
  expect(product.equipmentBaseline?.tiers === 4, 'expected 4 equipment tiers', '/product/equipmentBaseline/tiers');
  expect(product.summonBaseline?.single === true, 'expected single draw support', '/product/summonBaseline/single');
  expect(product.summonBaseline?.tenDraw === true, 'expected ten-draw support', '/product/summonBaseline/tenDraw');
  expect(product.summonBaseline?.tenDrawGuarantee === true, 'expected ten-draw guarantee', '/product/summonBaseline/tenDrawGuarantee');
  expect(product.summonBaseline?.sixtyDrawPity === true, 'expected sixty-draw pity', '/product/summonBaseline/sixtyDrawPity');
  expect(product.storeBaseline?.freeDaily === 1, 'expected 1 free daily store item', '/product/storeBaseline/freeDaily');
  expect(product.storeBaseline?.rewardedAds === 2, 'expected 2 rewarded ads', '/product/storeBaseline/rewardedAds');
  expect(product.storeBaseline?.currencyProducts === 4, 'expected 4 currency products', '/product/storeBaseline/currencyProducts');
  expect(product.storeBaseline?.starterPack === 1, 'expected 1 starter pack', '/product/storeBaseline/starterPack');
  expect(product.storeBaseline?.adRemoval === 1, 'expected 1 ad-removal product', '/product/storeBaseline/adRemoval');
  expect(product.promotionBaseline?.launch === 5, 'expected 5 launch promotions', '/product/promotionBaseline/launch');
  expect(product.promotionBaseline?.scheduled === 1, 'expected 1 scheduled promotion', '/product/promotionBaseline/scheduled');
  checkExactArray(product.locales, ['ko', 'en', 'ja', 'zh-CN', 'zh-TW'], '/product/locales', 'locales');
  expect(product.accessibilityMinimumDp === 48, 'expected 48dp accessibility floor', '/product/accessibilityMinimumDp');
  checkExactArray(product.roles, ['player', 'operator', 'customer-support'], '/product/roles', 'roles');
  checkExactArray(product.devices, ['Android', 'Web'], '/product/devices', 'devices');
  expect(product.w48FeatureFreeze === true, 'expected W48 feature freeze', '/product/w48FeatureFreeze');
  expect(product.w64Semantics === 'launch-ready plus fully built/localized/QA-approved D30/D60/D90 artifacts; actual D30/D60/D90 operations are post-launch', 'expected W64 semantics', '/product/w64Semantics');
  expect(product.webBoundary === 'Web is limited to account deletion, support, operations and never gameplay', 'expected Web boundary', '/product/webBoundary');
  expect(product.seasonPass?.playerFacing === false, 'expected no player-facing season pass', '/product/seasonPass/playerFacing');
  expect(product.seasonPass?.sku === false, 'expected no player-facing season pass SKU', '/product/seasonPass/sku');
  expect(product.seasonPass?.purchase === false, 'expected no player-facing season pass purchase', '/product/seasonPass/purchase');
  expect(product.seasonPass?.progression === false, 'expected no player-facing season pass progression', '/product/seasonPass/progression');
  expect(product.seasonPass?.rewards === false, 'expected no player-facing season pass rewards', '/product/seasonPass/rewards');
  expect(product.seasonPass?.operatorGateOnly === 'NS-SEASON-GATE', 'expected NS-SEASON-GATE operator gate', '/product/seasonPass/operatorGateOnly');
  const owners = asObject(product.externalRiskOwners, '/product/externalRiskOwners');
  for (const key of ['product', 'artLead', 'translationLQA', 'backend', 'operationsLegal']) {
    expect(owners[key] === 'unknown/unassigned', `expected unknown/unassigned owner for ${key}`, pointerFor(['product', 'externalRiskOwners', key]));
  }

  const requirementCatalog = asArray(root.requirements, '/requirements');
  expect(requirementCatalog.length === 6, 'expected 6 requirements', '/requirements');
  const expectedRequirements = [
    ['R-IIHNMM', ['F-THXTSZ', 'F-ACWSGP']],
    ['R-FXPTCH', ['F-PBSUSF', 'F-HWZUUP']],
    ['R-PCGQUK', ['F-GXOCUU', 'F-WCYUBV', 'F-MPWRJX', 'F-QBEEMX', 'F-KZWEOI']],
    ['R-GBZSDW', ['F-DXKNLU', 'F-HMVZDT']],
    ['R-QYFYBC', ['F-TIQUNR', 'F-NHEIDC', 'F-CGHLJL', 'NF-PLAYER-LIVEOPS']],
    ['NR-LOCAL-A11Y', ['NF-LOCALE', 'NF-A11Y-POWER', 'NF-RESPONSIVE-UI']],
  ];
  for (let i = 0; i < expectedRequirements.length; i += 1) {
    const [id, features] = expectedRequirements[i];
    const requirement = asObject(requirementCatalog[i], pointerFor(['requirements', i]));
    expect(requirement.id === id, `expected ${id}`, pointerFor(['requirements', i, 'id']));
    checkExactArray(requirement.features, features, pointerFor(['requirements', i, 'features']), `features for ${id}`);
  }
  checkExactArray(root.features, ['F-THXTSZ', 'F-ACWSGP', 'F-PBSUSF', 'F-HWZUUP', 'F-GXOCUU', 'F-WCYUBV', 'F-MPWRJX', 'F-QBEEMX', 'F-KZWEOI', 'F-DXKNLU', 'F-HMVZDT', 'F-TIQUNR', 'F-NHEIDC', 'F-CGHLJL', 'NF-PLAYER-LIVEOPS', 'NF-LOCALE', 'NF-A11Y-POWER', 'NF-RESPONSIVE-UI'], '/features', 'features');
  checkExactArray(root.specs, ['S-LVWHIB', 'NS-SESSION-RECONNECT', 'S-TGKDXL', 'S-RVSTQT', 'S-XJSOJJ', 'NS-WEB-DELETE', 'S-YFLBRX', 'NS-AUTO-FARM', 'S-VLJARV', 'S-LXSNDL', 'NS-DAILY-WEEKLY', 'NS-ACHIEVEMENT', 'NS-ATTENDANCE', 'S-TWOQHT', 'NS-RESEARCH', 'NS-PROMOTION', 'S-LPEJNI', 'NS-SKILL-UPGRADE', 'NS-SKILL-LOADOUT', 'NS-SKILL-AUTO', 'S-XANCZD', 'NS-EQUIP-LOCK', 'NS-EQUIP-UPGRADE', 'NS-EQUIP-FUSION', 'S-AOQYYC', 'NS-DRAW-TEN', 'NS-DRAW-ODDS', 'NS-DRAW-RECOVERY', 'S-UHNSOK', 'NS-CELL-PROGRESS', 'S-AJNKBZ', 'NS-CONTENT-ROLLBACK', 'NS-SCHEDULED-UNLOCK', 'S-IRLFRY', 'S-OJRSXR', 'NS-IAP-RECOVERY', 'NS-IAP-REFUND', 'NS-STORE-DAILY', 'S-AJLBYA', 'NS-MAIL-PUBLISH', 'NS-MAINTENANCE', 'S-AHBKUR', 'NS-ATTENDANCE-GATE', 'NS-SEASON-GATE', 'S-MXZRCE', 'S-BSTFCP', 'NS-COST-ALERT', 'NS-NOTICE-VIEW', 'NS-EVENT-PARTICIPATE', 'NS-MAIL-CLAIM', 'NS-LOCALE-SELECT', 'NS-LOCALE-RENDER', 'NS-A11Y-SETTINGS', 'NS-POWER-SAVE', 'NS-SAFEAREA-PANEL'], '/specs', 'specs');
  const ownership = asObject(root.ownership, '/ownership');
  checkExactArray(ownership.requirements, ['R-IIHNMM', 'R-FXPTCH', 'R-PCGQUK', 'R-GBZSDW', 'R-QYFYBC', 'NR-LOCAL-A11Y'], '/ownership/requirements', 'requirements');
  expect(ownership.featureCount === 18, 'expected exact 18 features', '/ownership/featureCount');
  expect(ownership.specCount === 55, 'expected exact 55 specs', '/ownership/specCount');
  const rows = asArray(ownership.planRows, '/ownership/planRows');
  expect(rows.length === 18, 'expected 18 ownership rows', '/ownership/planRows');
  const expectedRows = [
    ['T9', 'F-THXTSZ', ['S-LVWHIB', 'NS-SESSION-RECONNECT', 'S-TGKDXL']],
    ['T10', 'F-ACWSGP', ['S-RVSTQT', 'S-XJSOJJ', 'NS-WEB-DELETE']],
    ['T11', 'F-PBSUSF', ['S-YFLBRX', 'NS-AUTO-FARM']],
    ['T12', 'F-HWZUUP', ['S-VLJARV']],
    ['T13', 'F-GXOCUU', ['S-LXSNDL', 'NS-DAILY-WEEKLY', 'NS-ACHIEVEMENT', 'NS-ATTENDANCE']],
    ['T13', 'F-WCYUBV', ['S-TWOQHT', 'NS-RESEARCH', 'NS-PROMOTION']],
    ['T14', 'F-MPWRJX', ['S-LPEJNI', 'NS-SKILL-UPGRADE', 'NS-SKILL-LOADOUT', 'NS-SKILL-AUTO']],
    ['T15', 'F-QBEEMX', ['S-XANCZD', 'NS-EQUIP-LOCK', 'NS-EQUIP-UPGRADE', 'NS-EQUIP-FUSION']],
    ['T16', 'F-KZWEOI', ['S-AOQYYC', 'NS-DRAW-TEN', 'NS-DRAW-ODDS', 'NS-DRAW-RECOVERY']],
    ['T17', 'F-DXKNLU', ['S-UHNSOK', 'NS-CELL-PROGRESS']],
    ['T18', 'F-HMVZDT', ['S-AJNKBZ', 'NS-CONTENT-ROLLBACK', 'NS-SCHEDULED-UNLOCK']],
    ['T19', 'F-TIQUNR', ['S-IRLFRY', 'S-OJRSXR', 'NS-IAP-RECOVERY', 'NS-IAP-REFUND', 'NS-STORE-DAILY']],
    ['T20', 'F-NHEIDC', ['S-AJLBYA', 'NS-MAIL-PUBLISH', 'NS-MAINTENANCE', 'S-AHBKUR', 'NS-ATTENDANCE-GATE', 'NS-SEASON-GATE']],
    ['T21', 'F-CGHLJL', ['S-MXZRCE', 'S-BSTFCP', 'NS-COST-ALERT']],
    ['T22', 'NF-PLAYER-LIVEOPS', ['NS-NOTICE-VIEW', 'NS-EVENT-PARTICIPATE', 'NS-MAIL-CLAIM']],
    ['T23', 'NF-LOCALE', ['NS-LOCALE-SELECT', 'NS-LOCALE-RENDER']],
    ['T24', 'NF-A11Y-POWER', ['NS-A11Y-SETTINGS', 'NS-POWER-SAVE']],
    ['T25', 'NF-RESPONSIVE-UI', ['NS-SAFEAREA-PANEL']],
  ];
  for (let i = 0; i < expectedRows.length; i += 1) {
    const [todo, feature, specs] = expectedRows[i];
    const row = asObject(rows[i], pointerFor(['ownership', 'planRows', i]));
    expect(row.todo === todo, `expected ${todo}`, pointerFor(['ownership', 'planRows', i, 'todo']));
    expect(row.feature === feature, `expected ${feature}`, pointerFor(['ownership', 'planRows', i, 'feature']));
    checkExactArray(row.specs, specs, pointerFor(['ownership', 'planRows', i, 'specs']), `specs for ${todo}/${feature}`);
  }

  const contract = asObject(root.contractedValues, '/contractedValues');
  checkSet(contract.canonicalExclusions, [
    'iOS', 'guild', 'chat', 'PvP', 'realtime coop', 'world boss', 'Dragon Valley', 'companion formation', 'forced interstitials', 'cash loot boxes', 'original APK code/assets/values/copy/names/protocols/SDK config reuse', 'Web gameplay', 'Web progression', 'Web inventory', 'Web summon', 'Web reward claims', 'Web wallet ledger editing', 'client-authoritative economy', '600 scenes', 'fixed offline cap'
  ], '/contractedValues/canonicalExclusions', 'canonical exclusions');
  expect(contract.canonicalExclusions.includes('Web gameplay'), 'expected Web gameplay exclusion', '/contractedValues/canonicalExclusions');
  for (const term of ['Unity', 'Firebase', 'schema', 'CI']) {
    expect(!contract.canonicalExclusions.includes(term), `expected ${term} to stay out of product exclusions`, '/contractedValues/canonicalExclusions');
  }
  checkExactArray(contract.roles, ['player', 'operator', 'customer-support'], '/contractedValues/roles', 'contract roles');
  checkExactArray(contract.devices, ['Android', 'Web'], '/contractedValues/devices', 'contract devices');
  checkExactArray(contract.webRestrictions, ['account deletion', 'support', 'operations'], '/contractedValues/webRestrictions', 'web restrictions');
  expect(contract.seasonPassOperatorGate === 'NS-SEASON-GATE', 'expected NS-SEASON-GATE operator gate', '/contractedValues/seasonPassOperatorGate');
  expect(contract.launchContract === '3/30/300', 'expected launch contract', '/contractedValues/launchContract');
  expect(contract.d90Contract === '6/60/600', 'expected D90 contract', '/contractedValues/d90Contract');

  if (root.webGameplayAllowed === true) {
    fail('Web gameplay is not allowed', '/webGameplayAllowed');
  }
  if (product.seasonPass?.sku === true) {
    fail('player-facing pass SKU is not allowed', '/product/seasonPass/sku');
  }

  console.log('PASS');
}

main().catch((error) => fail(error.message));
