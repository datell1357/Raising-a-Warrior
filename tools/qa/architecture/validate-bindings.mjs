import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CANONICAL_BINDINGS } from './constants.mjs';
import { array, exactKeys, fail, sameArray } from './contract-utils.mjs';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export async function validateCanonicalBindings(root, bindings) {
  const rows = array(bindings, '/canonicalBindings');
  if (rows.length !== CANONICAL_BINDINGS.length) fail('CANONICAL_BINDING_COVERAGE', '/canonicalBindings', 'canonical binding count differs');
  for (let index = 0; index < rows.length; index += 1) {
    const at = `/canonicalBindings/${index}`;
    const row = exactKeys(rows[index], ['path', 'sha256'], at);
    const [path, hash] = CANONICAL_BINDINGS[index];
    if (row.path !== path) fail('CANONICAL_BINDING_PATH', `${at}/path`, 'canonical binding path differs from frozen contract');
    if (row.sha256 !== hash) fail('CANONICAL_BINDING_HASH', `${at}/sha256`, 'canonical binding hash differs from frozen contract');
    const actual = sha256(await readFile(resolve(root, path)));
    if (actual !== hash) fail('CANONICAL_BINDING_DRIFT', `${at}/sha256`, 'canonical source hash differs from frozen contract');
  }
}

function parseFunctionalSpec(text) {
  const specs = [];
  for (const section of text.split(/^#### Spec /m).slice(1)) {
    const header = section.match(/^([^:]+): (.+)\n/);
    if (!header) fail('FUNCTIONAL_SPEC_PARSE', '/functionalSpec', 'invalid spec heading');
    const roles = section.match(/- 역할 배열: \[([^\]]+)\]/);
    const devices = section.match(/- 디바이스 배열: \[([^\]]+)\]/);
    if (!roles || !devices) fail('FUNCTIONAL_SPEC_PARSE', '/functionalSpec', `missing roles or devices for ${header[1]}`);
    specs.push({ id: header[1], label: header[2], roles: roles[1].split(',').map((value) => value.trim()), devices: devices[1].split(',').map((value) => value.trim()) });
  }
  if (specs.length !== 55) fail('FUNCTIONAL_SPEC_COUNT', '/functionalSpec/specs', 'expected 55 functional spec headings');
  return specs;
}

export async function loadBoundReferences(root) {
  const [functionalText, flowText, scopeText] = await Promise.all([
    readFile(resolve(root, 'docs/Manyfast/워리어 키우기_기능명세서.md'), 'utf8'),
    readFile(resolve(root, 'docs/Manyfast/워리어 키우기_유저플로우.md'), 'utf8'),
    readFile(resolve(root, 'docs/production/scope-contract.json'), 'utf8'),
  ]);
  const start = flowText.indexOf('```json\n') + 8;
  const end = flowText.indexOf('\n```', start);
  if (start === 7 || end < start) fail('CANONICAL_FLOW_UNREADABLE', '/docs/Manyfast/user-flow', 'canonical flow JSON block is missing');
  const json = flowText.slice(start, end);
  const declared = flowText.match(/Canonical SHA-256: `([0-9a-f]{64})`/);
  if (!declared || sha256(json) !== declared[1] || sha256(JSON.stringify(JSON.parse(json))) !== declared[1]) fail('CANONICAL_FLOW_HASH', '/docs/Manyfast/user-flow', 'declared canonical model hash cannot be reproduced');
  return { functionalSpecs: parseFunctionalSpec(functionalText), flow: JSON.parse(json), scope: JSON.parse(scopeText), flowHash: declared[1] };
}

export function validateCanonicalProjections(references) {
  const functionalIds = references.functionalSpecs.map((spec) => spec.id);
  const flowIds = references.flow.specs.map((spec) => spec.id);
  sameArray(flowIds, functionalIds, '/flow/specs', 'FUNCTIONAL_FLOW_DRIFT');
  sameArray(references.scope.specs, functionalIds, '/scope/specs', 'FUNCTIONAL_SCOPE_DRIFT');
  for (let index = 0; index < functionalIds.length; index += 1) {
    const functional = references.functionalSpecs[index];
    const flow = references.flow.specs[index];
    if (functional.label !== flow.label) fail('FUNCTIONAL_FLOW_LABEL_DRIFT', `/flow/specs/${index}/label`, 'functional label differs from flow');
    sameArray(flow.roles, functional.roles, `/flow/specs/${index}/roles`, 'FUNCTIONAL_FLOW_ROLE_DRIFT');
    sameArray(flow.devices, functional.devices, `/flow/specs/${index}/devices`, 'FUNCTIONAL_FLOW_DEVICE_DRIFT');
  }
}
