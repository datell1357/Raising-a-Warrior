import { createHash } from 'node:crypto';
import { fail, object } from './contract-utils.mjs';

function equal(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
function child(at, key) { return `${at}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`; }

function firstDifference(actual, expected, at) {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return at;
    for (let index = 0; index < expected.length; index += 1) {
      const difference = firstDifference(actual[index], expected[index], `${at}/${index}`);
      if (difference) return difference;
    }
    return null;
  }
  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return at;
    if (!equal(Object.keys(actual).sort(), Object.keys(expected).sort())) return at;
    for (const key of Object.keys(expected)) {
      const difference = firstDifference(actual[key], expected[key], child(at, key));
      if (difference) return difference;
    }
    return null;
  }
  return Object.is(actual, expected) ? null : at;
}

function normalizedRules(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\r\n]*/g, '').replace(/\s+/g, '');
}

function functionsPackage(model, policy) {
  const actual = object(model.workspacePackages['backend/functions'], '/workspacePackages/backend/functions');
  const difference = firstDifference(actual, policy.package, '/backend/functions/package.json');
  if (difference) fail('FUNCTIONS_PACKAGE_DRIFT', difference, 'Functions package must match the Firebase contract');
  const config = object(model.typescript.projects['backend/functions'], '/typescript/projects/backend/functions');
  const configDifference = firstDifference(config, policy.tsconfig, '/backend/functions/tsconfig.json');
  if (configDifference) fail('FUNCTIONS_TSCONFIG_DRIFT', configDifference, 'Functions TypeScript configuration must match the Firebase contract');
}

function runtimePolicy(model, policy) {
  const source = model.runtimePolicySource;
  if (typeof source !== 'string') fail('RUNTIME_POLICY_INVALID', '/backend/functions/src/runtime-policy.ts', 'runtime policy source is required');
  for (const fragment of policy.runtimePolicy.requiredSourceFragments) {
    if (!source.includes(fragment)) fail('RUNTIME_POLICY_INVALID', '/backend/functions/src/runtime-policy.ts', 'runtime policy does not implement the exported Firebase contract');
  }
  const callable = model.callableSource;
  if (typeof callable !== 'string' || !new RegExp(`export\\s+const\\s+${policy.callable.name}\\s*=\\s*onCall\\s*\\(\\s*\\{[^}]*enforceAppCheck\\s*:\\s*true`, 's').test(callable)) {
    fail('CALLABLE_APP_CHECK_MISSING', '/backend/functions/src/index.ts', 'callable App Check enforcement is required');
  }
}

export function validateFirebasePolicy(model) {
  const contract = object(model.repositoryContract, '/repositoryContract');
  const policy = object(contract.t7Firebase, '/repositoryContract/t7Firebase');
  const configDifference = firstDifference(model.firebaseConfig, policy.firebaseJson, '/firebase.json');
  if (configDifference) fail('FIREBASE_CONFIG_DRIFT', configDifference, 'firebase.json must match the Firebase contract');
  const aliasesDifference = firstDifference(model.firebaseAliases, policy.firebaserc, '/.firebaserc');
  if (aliasesDifference) fail('FIREBASE_PROJECT_ALIAS_DRIFT', aliasesDifference, '.firebaserc must use the demo project only');
  const expectedHash = policy.firestoreRulesSha256;
  if (typeof expectedHash !== 'string' || createHash('sha256').update(normalizedRules(model.firestore.rules)).digest('hex') !== expectedHash) {
    fail('FIRESTORE_RULES_PERMISSIVE', '/firestore/rules', 'Firestore rules must exactly match the T7 contract');
  }
  functionsPackage(model, policy);
  runtimePolicy(model, policy);
}
