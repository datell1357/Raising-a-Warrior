import { SOURCE_CLAIM_CONTRACTS } from './constants.mjs';
import { array, exactKeys, fail, sameArray } from './contract-utils.mjs';

export function validateSourceClaims(input) {
  const claimsDocument = exactKeys(input, ['schemaVersion', 'claims'], '/sourceClaims');
  if (claimsDocument.schemaVersion !== 'warrior-official-source-claims/v1') fail('SOURCE_CLAIM_SCHEMA', '/sourceClaims/schemaVersion', 'unsupported official source claim schema');
  const claims = array(claimsDocument.claims, '/sourceClaims/claims');
  if (claims.length !== SOURCE_CLAIM_CONTRACTS.length) fail('SOURCE_CLAIM_COVERAGE', '/sourceClaims/claims', 'source claim count differs from frozen contract');
  for (let index = 0; index < claims.length; index += 1) {
    const at = `/sourceClaims/claims/${index}`;
    const claim = exactKeys(claims[index], ['id', 'url', 'retrievedAt', 'facts', 'caveats'], at);
    const expected = SOURCE_CLAIM_CONTRACTS[index];
    for (const field of ['id', 'url', 'retrievedAt']) if (claim[field] !== expected[field]) fail('SOURCE_CLAIM_DRIFT', `${at}/${field}`, `${field} differs from frozen source claim contract`);
    sameArray(claim.facts, expected.facts, `${at}/facts`, 'SOURCE_CLAIM_DRIFT');
    sameArray(claim.caveats, expected.caveats, `${at}/caveats`, 'SOURCE_CLAIM_DRIFT');
  }
}
