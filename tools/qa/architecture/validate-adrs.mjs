import { ADR_CLAIMS, ADR_CONTRACTS, OFFICIAL_SOURCE_URL_BY_ID } from './constants.mjs';
import { array, exactKeys, fail, sameArray, string, uniqueStrings } from './contract-utils.mjs';

function sectionBody(text, name) {
  const match = text.match(new RegExp(`## ${name}\\n([\\s\\S]*?)(?=\\n## |$)`));
  if (!match || match[1].trim().length === 0) fail('ADR_SECTION_MISSING', `/adr/${name}`, `missing ${name} section body`);
  return match[1];
}

function flattenClaims(value, prefix = '') {
  if (value && typeof value === 'object' && !Array.isArray(value)) return Object.entries(value).flatMap(([key, nested]) => flattenClaims(nested, prefix ? `${prefix}.${key}` : key));
  return [[prefix, String(value)]];
}

function validateDecisionClaims(text, id) {
  const decision = sectionBody(text, 'Decision');
  const rows = [...decision.matchAll(/^\| ([^|]+) \| ([^|]+) \|$/gm)].filter((match) => !['Claim', '---'].includes(match[1].trim()));
  const expected = flattenClaims(ADR_CLAIMS[id]);
  if (rows.length === 0) fail('ADR_DECISION_CLAIM_MISSING', '/adr/Decision', 'Decision must contain a normative claim table');
  if (rows.length !== expected.length) fail('ADR_DECISION_CLAIM_COVERAGE', '/adr/Decision', 'Decision claim table row count differs');
  for (let index = 0; index < rows.length; index += 1) {
    const [path, value] = rows[index].slice(1).map((field) => field.trim());
    if (path !== expected[index][0]) fail('ADR_DECISION_CLAIM_PATH', `/adr/Decision/${index}`, 'Decision claim path differs');
    if (value !== expected[index][1]) fail('ADR_DECISION_CLAIM_VALUE', `/adr/Decision/${index}`, 'Decision claim value differs');
  }
}

function validateSourceTable(text, references, at) {
  const sourceSection = sectionBody(text, 'Sources');
  const rows = [...sourceSection.matchAll(/^\| ([^|]+) \| ([^|]+) \| ([^|]+) \|$/gm)].filter((match) => match[1].trim() !== 'Source ID' && match[1].trim() !== '---');
  if (rows.length !== references.length) fail('ADR_SOURCE_TABLE_COVERAGE', `${at}/sourceIds`, 'source table row count differs');
  for (let index = 0; index < rows.length; index += 1) {
    const [id, url, retrievedAt] = rows[index].slice(1).map((value) => value.trim());
    if (id !== references[index]) fail('ADR_SOURCE_TABLE_ID', `${at}/sourceIds/${index}`, 'source table ID differs from registry');
    if (url !== OFFICIAL_SOURCE_URL_BY_ID[id]) fail('ADR_SOURCE_TABLE_URL', `${at}/sourceIds/${index}`, 'source table URL differs from canonical source');
    if (retrievedAt !== '2026-07-28') fail('ADR_SOURCE_TABLE_RETRIEVED_AT', `${at}/sourceIds/${index}`, 'source table retrieval date differs');
  }
}

export function validateAdrs(registry, sourceIds, adrs) {
  const entries = array(registry, '/adrRegistry');
  if (entries.length !== ADR_CONTRACTS.length) fail('ADR_COVERAGE', '/adrRegistry', 'expected six ADR registry entries');
  const ids = [];
  for (let index = 0; index < entries.length; index += 1) {
    const at = `/adrRegistry/${index}`;
    const entry = exactKeys(entries[index], ['id', 'path', 'title', 'decisionIds', 'riskIds', 'sourceIds'], at);
    const expected = ADR_CONTRACTS[index];
    const id = string(entry.id, `${at}/id`);
    ids.push(id);
    for (const field of ['id', 'path', 'title']) if (entry[field] !== expected[field]) fail(field === 'id' ? 'ADR_ORDER' : 'ADR_REGISTRY_DRIFT', `${at}/${field}`, `${field} differs from frozen ADR contract`);
    sameArray(entry.decisionIds, expected.decisionIds, `${at}/decisionIds`, 'ADR_REGISTRY_DRIFT');
    sameArray(entry.riskIds, expected.riskIds, `${at}/riskIds`, 'ADR_REGISTRY_DRIFT');
    const references = uniqueStrings(entry.sourceIds, `${at}/sourceIds`, 'ADR_SOURCE_DUPLICATE');
    sameArray(references, expected.sourceIds, `${at}/sourceIds`, 'ADR_REGISTRY_DRIFT');
    for (const sourceId of references) if (!sourceIds.has(sourceId)) fail('ADR_SOURCE_UNKNOWN', `${at}/sourceIds`, 'ADR references an unknown official source');
    const text = adrs[id];
    if (typeof text !== 'string') fail('ADR_FILE_MISSING', `${at}/path`, 'ADR document text is missing');
    const match = text.match(/^<!-- adr-meta: (.+) -->/);
    if (!match) fail('ADR_METADATA_MISSING', `${at}/path`, 'ADR requires machine-readable metadata as its first line');
    let meta;
    try {
      meta = JSON.parse(match[1]);
    } catch {
      fail('ADR_METADATA_INVALID', `${at}/path`, 'ADR metadata is not JSON');
    }
    if (meta.id !== id || meta.status !== 'accepted') fail('ADR_METADATA_INVALID', `${at}/path`, 'ADR metadata id or status differs from registry');
    if (JSON.stringify(meta.decisionIds) !== JSON.stringify(entry.decisionIds) || JSON.stringify(meta.riskIds) !== JSON.stringify(entry.riskIds) || JSON.stringify(meta.sourceIds) !== JSON.stringify(entry.sourceIds)) fail('ADR_METADATA_DRIFT', `${at}/path`, 'ADR metadata differs from registry');
    if (JSON.stringify(meta.claims) !== JSON.stringify(ADR_CLAIMS[id])) fail('ADR_CLAIM_DRIFT', `${at}/path`, 'ADR claims differ from frozen contract');
    validateDecisionClaims(text, id);
    sectionBody(text, 'Consequences');
    sectionBody(text, 'Risks And Controls');
    validateSourceTable(text, references, at);
  }
  uniqueStrings(ids, '/adrRegistry', 'ADR_DUPLICATE');
}
