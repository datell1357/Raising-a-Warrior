import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { PREREQUISITE_CONTRACTS, PREREQUISITE_KEYS } from './constants.mjs';
import { array, childPointer, exactKeys, fail, object, string, uniqueStrings, valueIn } from './contract-utils.mjs';

const STATUSES = ['UNKNOWN', 'IN_PROGRESS', 'VERIFIED', 'BLOCKED'];
const ROLES = ['product', 'backend', 'operations', 'legal-privacy', 'release-engineering', 'qa'];
const STATIC_FIELDS = ['id', 'category', 'ownerRole', 'blockingCommand', 'proofRequired', 'sourceUrl', 'proofKind'];

async function validateProof(root, entry, at) {
  const proof = exactKeys(entry.verification, ['artifactPath', 'sha256', 'verifiedAt', 'verifierId'], `${at}/verification`);
  if (entry.status !== 'VERIFIED') {
    if (Object.values(proof).some((value) => value !== null)) fail('PREREQUISITE_UNVERIFIED_PROOF', `${at}/verification`, 'non-VERIFIED prerequisite must use null verification fields');
    return;
  }
  if (typeof proof.artifactPath !== 'string' || isAbsolute(proof.artifactPath)) fail('PREREQUISITE_PROOF_PATH', `${at}/verification/artifactPath`, 'proof path must be workspace-relative');
  if (!/^[0-9a-f]{64}$/.test(proof.sha256 ?? '')) fail('PREREQUISITE_PROOF_HASH', `${at}/verification/sha256`, 'proof hash must be lowercase SHA-256');
  if (!/^\d{4}-\d{2}-\d{2}T/.test(proof.verifiedAt ?? '') || Number.isNaN(Date.parse(proof.verifiedAt))) fail('PREREQUISITE_PROOF_TIME', `${at}/verification/verifiedAt`, 'proof timestamp must be ISO-8601');
  if (!/^[a-z][a-z0-9-]*$/.test(proof.verifierId ?? '') || /secret|token|password/i.test(proof.verifierId)) fail('PREREQUISITE_PROOF_VERIFIER', `${at}/verification/verifierId`, 'verifier ID must be stable and non-secret');
  const path = resolve(root, proof.artifactPath);
  const proofRoot = resolve(root, '.omo/evidence/external-prerequisites', entry.id);
  const proofRelative = relative(proofRoot, path);
  if (!proofRelative || proofRelative.startsWith('..') || isAbsolute(proofRelative)) fail('PREREQUISITE_PROOF_PATH', `${at}/verification/artifactPath`, 'proof path must be a strict descendant of its prerequisite evidence root');
  if ((await lstat(root)).isSymbolicLink()) fail('PREREQUISITE_PROOF_PATH', `${at}/verification/artifactPath`, 'workspace root must not be a symlink');
  let component = root;
  for (const segment of relative(root, path).split('/')) {
    component = resolve(component, segment);
    const componentStat = await lstat(component).catch(() => null);
    if (componentStat?.isSymbolicLink()) fail('PREREQUISITE_PROOF_PATH', `${at}/verification/artifactPath`, 'proof path must not traverse symlink components');
  }
  const stat = await lstat(path).catch(() => null);
  if (!stat || !stat.isFile() || stat.isSymbolicLink()) fail('PREREQUISITE_PROOF_ARTIFACT', `${at}/verification/artifactPath`, 'proof artifact must be a regular file');
  const hash = createHash('sha256').update(await readFile(path)).digest('hex');
  if (hash !== proof.sha256) fail('PREREQUISITE_PROOF_HASH', `${at}/verification/sha256`, 'proof artifact hash mismatch');
}

export async function validatePrerequisites(root, input) {
  exactKeys(input, ['schemaVersion', 'prerequisites'], '');
  if (input.schemaVersion !== 'warrior-external-prerequisites/v1') fail('INVALID_PREREQUISITE_SCHEMA', '/schemaVersion', 'unsupported prerequisite schema');
  const entries = array(input.prerequisites, '/prerequisites');
  if (entries.length !== PREREQUISITE_CONTRACTS.length) fail('PREREQUISITE_COVERAGE', '/prerequisites', 'prerequisite count differs from the frozen contract');
  const ids = [];
  for (let index = 0; index < entries.length; index += 1) {
    const at = `/prerequisites/${index}`;
    const contract = PREREQUISITE_CONTRACTS[index];
    if (!object(entries[index], at).id) fail('PREREQUISITE_ID', `${at}/id`, 'prerequisite ID is required');
    const entry = exactKeys(entries[index], PREREQUISITE_KEYS, at);
    const id = string(entry.id, childPointer(at, 'id'));
    if (!/^[a-z][a-z0-9-]*$/.test(id) || /secret|token|password|credential/i.test(id)) fail('PREREQUISITE_ID', childPointer(at, 'id'), 'prerequisite ID must be stable and non-secret');
    ids.push(id);
    if (entry.status === 'PASS') fail('PREREQUISITE_FALSE_PASS', childPointer(at, 'status'), 'external prerequisites cannot self-report PASS');
    valueIn(entry.status, STATUSES, childPointer(at, 'status'), 'INVALID_PREREQUISITE_STATUS');
    for (const field of STATIC_FIELDS) {
      if (entry[field] !== contract[field]) {
        const code = field === 'sourceUrl' ? 'PREREQUISITE_SOURCE_URL' : field === 'proofKind' ? 'PREREQUISITE_PROOF_KIND' : 'PREREQUISITE_STATIC_DRIFT';
        fail(code, childPointer(at, field), `${field} differs from frozen prerequisite contract`);
      }
    }
    valueIn(entry.ownerRole, ROLES, childPointer(at, 'ownerRole'), 'INVALID_PREREQUISITE_OWNER');
    string(entry.category, childPointer(at, 'category'));
    string(entry.blockingCommand, childPointer(at, 'blockingCommand'));
    string(entry.proofRequired, childPointer(at, 'proofRequired'));
    await validateProof(root, entry, at);
    const serialized = JSON.stringify(entry);
    if (/AIza|-----BEGIN [A-Z ]+PRIVATE KEY-----|\bsk_[A-Za-z0-9]/.test(serialized)) fail('SECRET_IN_PREREQUISITE', at, 'registry must not contain secrets');
  }
  uniqueStrings(ids, '/prerequisites', 'DUPLICATE_PREREQUISITE_ID');
  return entries.filter((entry) => entry.status !== 'VERIFIED').map((entry) => `BLOCKED:${entry.id}`);
}
