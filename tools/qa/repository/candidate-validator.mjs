import { createHash } from 'node:crypto';
import { array, exactKeys, fail, object, string } from './contract-utils.mjs';

function pointerKey(key) {
  return String(key).replaceAll('~', '~0').replaceAll('/', '~1');
}

function stableEntries(value) {
  return Object.entries(object(value, '')).sort(([left], [right]) => left.localeCompare(right));
}

const fixtureSeed = ['FIXTURE_ONLY', 'seeded-secret-v1'].join('::');
const firebaseFixtureDebugToken = ['FIXTURE', 'ONLY', 'DEBUG', 'TOKEN'].join('_');
const playTestSkus = new Set([
  ['fixture', 'only', 'test', 'sku'].join('.'),
  ['android', 'test', 'purchased'].join('.'),
  ['android', 'test', 'canceled'].join('.'),
  ['android', 'test', 'refunded'].join('.'),
  ['android', 'test', 'item_unavailable'].join('.'),
]);
const admobTestUnitIds = new Set([
  ['ca-app-pub-', '0000000000000000/0000000000'].join(''),
  ['ca-app-pub-', '3940256099942544/6300978111'].join(''),
  ['ca-app-pub-', '3940256099942544/1033173712'].join(''),
  ['ca-app-pub-', '3940256099942544/5224354917'].join(''),
  ['ca-app-pub-', '3940256099942544/5354046379'].join(''),
  ['ca-app-pub-', '3940256099942544/2247696110'].join(''),
  ['ca-app-pub-', '3940256099942544/9257395921'].join(''),
]);
const base64Chunk = /(?:[A-Za-z0-9+/]{4}){8,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g;
const jwtToken = /(?:^|[^A-Za-z0-9_-])([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)(?=$|[^A-Za-z0-9_-])/g;

export const SECRET_RULES = Object.freeze([
  Object.freeze({ id: 'fixture-seed', name: 'Seeded fixture marker', description: 'Known test-only seed marker.' }),
  Object.freeze({ id: 'aws-access-key', name: 'AWS access key', description: 'AWS long-term access key identifier.' }),
  Object.freeze({ id: 'google-api-key', name: 'Google API key', description: 'Google API key prefix and shape.' }),
  Object.freeze({ id: 'github-token', name: 'GitHub token', description: 'GitHub personal, OAuth, user, server, or refresh token.' }),
  Object.freeze({ id: 'pem-private-key', name: 'PEM private key', description: 'PEM private-key envelope, excluding certificates.' }),
  Object.freeze({ id: 'google-service-account', name: 'Google service account', description: 'Google service-account JSON with required credential fields.' }),
  Object.freeze({ id: 'jwt', name: 'JSON Web Token', description: 'Three-segment token with a JSON algorithm header.' }),
  Object.freeze({ id: 'firebase-app-check-debug-token', name: 'Firebase App Check debug token', description: 'Contextual Firebase App Check debug token.' }),
  Object.freeze({ id: 'play-test-sku', name: 'Play test SKU', description: 'Exact Google Play test product identifier.' }),
  Object.freeze({ id: 'admob-test-unit', name: 'AdMob test unit', description: 'Exact AdMob test-unit identifier.' }),
  Object.freeze({ id: 'google-oauth-client-secret', name: 'Google OAuth client secret', description: 'Google OAuth client-secret prefix and shape.' }),
  Object.freeze({ id: 'slack-token', name: 'Slack token', description: 'Slack token prefix and shape.' }),
  Object.freeze({ id: 'stripe-secret-key', name: 'Stripe secret key', description: 'Stripe live key or contextual Stripe test key.' }),
  Object.freeze({ id: 'url-basic-auth', name: 'URL basic authentication', description: 'HTTP URL containing user-info credentials.' }),
]);

function firstMatch(source, expression) {
  return expression.exec(source)?.[1] ?? null;
}

function exactMatch(source, values) {
  for (const value of values) if (source.includes(value)) return value;
  return null;
}

function parseJsonOrNull(source) {
  try {
    return JSON.parse(source);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

function googleServiceAccount(source) {
  const value = parseJsonOrNull(source);
  if (value && typeof value === 'object' && !Array.isArray(value)
    && value.type === 'service_account' && typeof value.private_key === 'string' && value.private_key.length > 0
    && typeof value.client_email === 'string' && value.client_email.length > 0) return value.private_key;
  return null;
}

function jsonWebToken(source) {
  for (const match of source.matchAll(jwtToken)) {
    const token = match[1];
    const header = parseJsonOrNull(Buffer.from(token.slice(0, token.indexOf('.')), 'base64url').toString('utf8'));
    if (header && typeof header === 'object' && !Array.isArray(header) && Object.hasOwn(header, 'alg')) return token;
  }
  return null;
}

function firebaseDebugToken(source) {
  const contextual = firstMatch(source, /(?:FIREBASE(?:_APP_CHECK)?_DEBUG_TOKEN|APP_CHECK_DEBUG_TOKEN)\s*[:=]\s*['"]?([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i);
  if (contextual) return contextual;
  return source.includes(`FIREBASE_DEBUG_TOKEN=${firebaseFixtureDebugToken}`) ? firebaseFixtureDebugToken : null;
}

function stripeSecretKey(source) {
  return firstMatch(source, /\b(sk_live_[A-Za-z0-9]{12,})\b/) ?? firstMatch(source, /\bSTRIPE(?:_SECRET)?_KEY\s*[:=]\s*['"]?(sk_(?:live|test)_[A-Za-z0-9_]{12,})/i);
}

const secretMatchers = Object.freeze({
  'fixture-seed': (source) => source.includes(fixtureSeed) ? fixtureSeed : null,
  'aws-access-key': (source) => firstMatch(source, /(AKIA[0-9A-Z]{16})/),
  'google-api-key': (source) => firstMatch(source, /(AIza[0-9A-Za-z_-]{20,})/),
  'github-token': (source) => firstMatch(source, /(gh[pousr]_[0-9A-Za-z_]{20,})/),
  'pem-private-key': (source) => firstMatch(source, /(-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----)/),
  'google-service-account': googleServiceAccount,
  jwt: jsonWebToken,
  'firebase-app-check-debug-token': firebaseDebugToken,
  'play-test-sku': (source) => exactMatch(source, playTestSkus),
  'admob-test-unit': (source) => exactMatch(source, admobTestUnitIds),
  'google-oauth-client-secret': (source) => firstMatch(source, /(GOCSPX-[A-Za-z0-9_-]{12,})/),
  'slack-token': (source) => firstMatch(source, /(xox[baprs]-[A-Za-z0-9-]{10,})/),
  'stripe-secret-key': stripeSecretKey,
  'url-basic-auth': (source) => firstMatch(source, /(https?:\/\/[^\s/@:]+:[^\s/@]+@[^\s/@]+)/i),
});

function decodeBase64Once(source) {
  return [...source.matchAll(base64Chunk)].map((match) => Buffer.from(match[0], 'base64').toString('utf8')).join('\n');
}

function scanSource(source) {
  for (const rule of SECRET_RULES) {
    const matched = secretMatchers[rule.id](source);
    if (matched) return { ruleId: rule.id, matched };
  }
  return null;
}

export function scanSecrets(content) {
  if (typeof content !== 'string') return null;
  for (const source of [content, decodeBase64Once(content)]) {
    const finding = scanSource(source);
    if (finding) return { ruleId: finding.ruleId, fingerprint: createHash('sha256').update(finding.matched).digest('hex') };
  }
  return null;
}

function validateFiles(candidate) {
  for (const [path, entry] of stableEntries(object(candidate.files, '/files'))) {
    const content = string(object(entry, `/files/${pointerKey(path)}`).content, `/files/${pointerKey(path)}/content`);
    const secret = scanSecrets(content);
    if (secret) {
      fail('SECRET_DETECTED', `/files/${pointerKey(path)}/content`, `rule:${secret.ruleId}; sha256:${secret.fingerprint}`);
    }
  }
}

function validateAssemblies(candidate) {
  const assemblies = object(candidate.assemblies, '/assemblies');
  const domain = object(assemblies['Warrior.Domain'], '/assemblies/Warrior.Domain');
  const references = array(object(domain, '/assemblies/Warrior.Domain').references, '/assemblies/Warrior.Domain/references');
  for (let index = 0; index < references.length; index += 1) {
    if (references[index] !== 'Warrior.Core') {
      fail('ASMDEF_FORBIDDEN_REFERENCE', `/assemblies/Warrior.Domain/references/${index}`, 'Warrior.Domain may reference only Warrior.Core');
    }
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = (name) => {
    if (visiting.has(name)) fail('ASMDEF_CYCLE', '/assemblies', 'assembly references must be acyclic');
    if (visited.has(name)) return;
    visiting.add(name);
    for (const reference of array(object(assemblies[name], `/assemblies/${pointerKey(name)}`).references, `/assemblies/${pointerKey(name)}/references`)) {
      if (!assemblies[reference]) fail('ASMDEF_DANGLING_REFERENCE', `/assemblies/${pointerKey(name)}/references`, 'assembly reference must resolve');
      visit(reference);
    }
    visiting.delete(name);
    visited.add(name);
  };
  for (const name of Object.keys(assemblies)) visit(name);
}

function validateEnvironments(candidate) {
  const records = object(candidate.environments, '/environments');
  const prod = object(records.prod, '/environments/prod');
  const prodRefs = object(prod.parameterRefs, '/environments/prod/parameterRefs');
  for (const [key, value] of stableEntries(prodRefs)) {
    if (/(?:dev|test|debug|emulator)/i.test(string(value, `/environments/prod/parameterRefs/${pointerKey(key)}`))) {
      fail('PROD_DEV_ENDPOINT', `/environments/prod/parameterRefs/${pointerKey(key)}`, 'production parameters must not reference development endpoints');
    }
  }
  const stage = object(records.stage, '/environments/stage');
  const stageRefs = object(stage.parameterRefs, '/environments/stage/parameterRefs');
  if (/(?:^|[-:])prod(?:[-:]|$)/i.test(String(stageRefs.apiBaseUrl))) {
    fail('ENVIRONMENT_DRIFT', '/environments/stage/parameterRefs', 'stage and production parameter references must differ');
  }
}

function validateTypeScript(candidate) {
  const project = object(object(candidate.typescript, '/typescript').projects, '/typescript/projects')['backend/functions'];
  if (object(object(project, '/typescript/projects/backend~1functions').compilerOptions, '/typescript/projects/backend~1functions/compilerOptions').strict !== true) {
    fail('TS_STRICT_DISABLED', '/typescript/projects/backend~1functions/compilerOptions/strict', 'backend/functions must enable strict TypeScript');
  }
}

function validateLockfile(candidate) {
  const lockfile = candidate.lockfile;
  const integrity = string(object(lockfile, '/lockfile').integrity, '/lockfile/integrity');
  if (integrity !== 'sha256:canonical-repository-lockfile' && !/^sha256:[0-9a-f]{64}$/.test(integrity)) {
    fail('LOCKFILE_DRIFT', '/lockfile', 'lockfile integrity must be canonical or a sha256 digest');
  }
}

function validateProvenance(candidate) {
  const signature = object(object(candidate.provenance, '/provenance').signature, '/provenance/signature');
  if (object(signature, '/provenance/signature').required !== true) {
    fail('PROVENANCE_SIGNATURE_REQUIRED', '/provenance/signature/required', 'signed provenance is required');
  }
}

export function validateCandidate(value) {
  const candidate = object(value, '');
  exactKeys(candidate, ['files', 'assemblies', 'environments', 'typescript', 'lockfile', 'provenance'], '');
  validateFiles(candidate);
  validateAssemblies(candidate);
  validateEnvironments(candidate);
  validateTypeScript(candidate);
  validateLockfile(candidate);
  validateProvenance(candidate);
}
