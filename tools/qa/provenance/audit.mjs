#!/usr/bin/env node
import { lstat, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

const assetHeader = ['asset_id', 'source_type', 'source_ref', 'creator_id', 'vendor_id', 'license_id', 'receipt_id', 'source_derivative_link', 'export_id', 'similarity_status', 'similarity_review_id'];
const vendorHeader = ['vendor_id', 'vendor_name', 'license_id', 'receipt_id', 'source_record', 'status'];
const forbiddenMarkers = ['extracted-asset-hash', 'original-identifier', 'analysis-derived', 'analysis:', 'apk:', 'capture:', 'screenshot:', 'original-asset', 'original-screenshot', 'original-color', 'original-silhouette', 'original-name', 'original-protocol', 'original-sdk-config'];
const issues = [];

function issue(code, row, field, message) {
  issues.push({ code, row, field, message });
}

function parseArgs(args) {
  const options = { strict: false, assets: 'docs/production/asset-ledger.csv', vendors: 'docs/production/vendor-ledger.csv' };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--strict') options.strict = true;
    else if (argument === '--assets' || argument === '--vendors') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) issue('CLI_ARGUMENT_INVALID', 0, argument, 'expected a workspace-relative CSV path');
      else {
        options[argument.slice(2)] = value;
        index += 1;
      }
    } else issue('CLI_ARGUMENT_INVALID', 0, 'argument', `unsupported argument ${JSON.stringify(argument)}`);
  }
  if (!options.strict) issue('STRICT_MODE_REQUIRED', 0, '--strict', 'clean-room audit requires --strict');
  return options;
}

function isWithin(root, target) {
  const pathFromRoot = relative(root, target);
  return pathFromRoot === '' || (!pathFromRoot.startsWith('..') && !isAbsolute(pathFromRoot));
}

async function readWorkspaceFile(root, input, field) {
  const candidate = resolve(root, input);
  if (!isWithin(root, candidate)) {
    issue('INPUT_PATH_OUTSIDE_WORKSPACE', 0, field, 'input path must remain inside the workspace');
    return null;
  }
  try {
    const metadata = await lstat(candidate);
    if (metadata.isSymbolicLink()) {
      issue('INPUT_SYMLINK_DISALLOWED', 0, field, 'input path must not be a symbolic link');
      return null;
    }
    if (!metadata.isFile()) {
      issue('INPUT_NOT_FILE', 0, field, 'input path must be a regular file');
      return null;
    }
    const canonical = await realpath(candidate);
    if (!isWithin(root, canonical)) {
      issue('INPUT_PATH_OUTSIDE_WORKSPACE', 0, field, 'resolved input path must remain inside the workspace');
      return null;
    }
    return await readFile(canonical, 'utf8');
  } catch {
    issue('INPUT_READ_FAILURE', 0, field, 'input file could not be read');
    return null;
  }
}

function parseCsv(text, field) {
  const records = [];
  let row = [];
  let cell = '';
  let quoted = false;
  let rowNumber = 1;
  let recordStart = 1;
  const pushRecord = () => {
    row.push(cell);
    records.push({ row: recordStart, cells: row });
    row = [];
    cell = '';
    recordStart = rowNumber;
  };
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else {
        cell += character;
        if (character === '\n' || (character === '\r' && text[index + 1] !== '\n')) rowNumber += 1;
      }
      continue;
    }
    if (character === '"') {
      if (cell !== '') issue('CSV_QUOTE_INVALID', recordStart, field, 'quote must begin a field');
      else quoted = true;
    } else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      rowNumber += 1;
      pushRecord();
    } else cell += character;
  }
  if (quoted) issue('CSV_UNTERMINATED_QUOTE', recordStart, field, 'quoted field is not terminated');
  else if (cell !== '' || row.length > 0) pushRecord();
  return records;
}

function equalHeader(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function parseLedger(text, header, field) {
  const records = parseCsv(text, field);
  if (records.length === 0) {
    issue('CSV_EMPTY', 1, field, 'CSV must include an exact header and at least one record');
    return [];
  }
  if (!equalHeader(records[0].cells, header)) {
    issue('CSV_HEADER_INVALID', records[0].row, field, `expected header ${header.join(',')}`);
    return [];
  }
  return records.slice(1).flatMap((record) => {
    if (record.cells.every((value) => value === '')) {
      issue('CSV_BLANK_ROW', record.row, field, 'blank data rows are not allowed');
      return [];
    }
    if (record.cells.length !== header.length) {
      issue('CSV_COLUMN_COUNT_INVALID', record.row, field, `expected ${header.length} fields, got ${record.cells.length}`);
      return [];
    }
    return [{ row: record.row, ...Object.fromEntries(header.map((name, index) => [name, record.cells[index]])) }];
  });
}

function requireFields(record, fields) {
  for (const field of fields) {
    if (!record[field]?.trim()) issue('REQUIRED_FIELD', record.row, field, 'field is required');
    else if (record[field] !== record[field].trim() || /[\u0000\r\n]/.test(record[field]) || /^[=+\-@]/.test(record[field])) issue('UNSAFE_TEXT', record.row, field, 'field contains unsupported control, formula-like, or padded text');
  }
}

function requirePrefix(record, field, prefix) {
  if (record[field] && !record[field].startsWith(prefix)) issue('FIELD_FORMAT_INVALID', record.row, field, `field must start with ${prefix}`);
}

function rejectForbidden(record, fields) {
  for (const field of fields) {
    const value = record[field]?.toLowerCase() ?? '';
    const marker = forbiddenMarkers.find((candidate) => value.includes(candidate));
    if (marker) issue('FORBIDDEN_SOURCE', record.row, field, `contains clean-room marker ${marker}`);
  }
}

function validateAssets(rows) {
  const required = assetHeader;
  const identifiers = new Set();
  for (const record of rows) {
    requireFields(record, required);
    rejectForbidden(record, required);
    requirePrefix(record, 'asset_id', 'asset:');
    requirePrefix(record, 'source_ref', 'source:');
    requirePrefix(record, 'creator_id', 'creator:');
    requirePrefix(record, 'vendor_id', 'vendor:');
    requirePrefix(record, 'license_id', 'license:');
    requirePrefix(record, 'receipt_id', 'receipt:');
    requirePrefix(record, 'export_id', 'export:');
    requirePrefix(record, 'similarity_review_id', 'review:');
    if (!['synthetic-original', 'licensed-external'].includes(record.source_type)) issue('SOURCE_TYPE_INVALID', record.row, 'source_type', 'source type must be synthetic-original or licensed-external');
    if (record.asset_id && identifiers.has(record.asset_id)) issue('DUPLICATE_ASSET_ID', record.row, 'asset_id', 'asset_id must be unique');
    identifiers.add(record.asset_id);
    if (record.source_ref && record.asset_id && record.source_derivative_link !== `${record.source_ref}->derivative:${record.asset_id}`) issue('DERIVATIVE_LINK_INVALID', record.row, 'source_derivative_link', 'link must bind this source to this asset');
    if (record.asset_id && record.export_id !== `export:${record.asset_id}`) issue('EXPORT_LINK_INVALID', record.row, 'export_id', 'export must bind to this asset');
    if (record.similarity_status !== 'reviewed-clear') issue('SIMILARITY_STATUS_INVALID', record.row, 'similarity_status', 'strict audit requires reviewed-clear');
    if (record.asset_id && record.similarity_review_id !== `review:${record.asset_id}`) issue('SIMILARITY_REVIEW_LINK_INVALID', record.row, 'similarity_review_id', 'review must bind to this asset');
  }
}

function validateVendors(rows) {
  const required = vendorHeader;
  const identifiers = new Map();
  for (const record of rows) {
    requireFields(record, required);
    rejectForbidden(record, required);
    requirePrefix(record, 'vendor_id', 'vendor:');
    requirePrefix(record, 'license_id', 'license:');
    requirePrefix(record, 'receipt_id', 'receipt:');
    requirePrefix(record, 'source_record', 'source:');
    if (record.status !== 'approved') issue('VENDOR_STATUS_INVALID', record.row, 'status', 'vendor status must be approved');
    if (record.vendor_id && identifiers.has(record.vendor_id)) issue('DUPLICATE_VENDOR_ID', record.row, 'vendor_id', 'vendor_id must be unique');
    identifiers.set(record.vendor_id, record);
  }
  return identifiers;
}

function validateVendorLinks(assets, vendors) {
  for (const asset of assets) {
    const vendor = vendors.get(asset.vendor_id);
    if (!vendor) {
      issue('VENDOR_REFERENCE_MISSING', asset.row, 'vendor_id', 'asset vendor_id has no vendor-ledger record');
      continue;
    }
    if (asset.license_id !== vendor.license_id) issue('VENDOR_LICENSE_MISMATCH', asset.row, 'license_id', 'asset license must match vendor record');
    if (asset.receipt_id !== vendor.receipt_id) issue('VENDOR_RECEIPT_MISMATCH', asset.row, 'receipt_id', 'asset receipt must match vendor record');
    if (asset.source_ref !== vendor.source_record) issue('VENDOR_SOURCE_MISMATCH', asset.row, 'source_ref', 'asset source must match vendor record');
  }
}

async function validateCreativeBible(root) {
  const bible = await readWorkspaceFile(root, 'docs/production/provenance/creative-bible.md', 'creative_bible');
  if (bible === null) return;
  for (const section of ['## Normative Product Constraints', '## Non-Normative Analysis Precedent', '## Clean-Room Review Workflow', '## Ledger Schemas']) {
    if (!bible.includes(section)) issue('CREATIVE_BIBLE_SECTION_MISSING', 0, 'creative_bible', `missing ${section}`);
  }
  if (!bible.includes('Planning counts are capacity evidence only, never production asset targets.')) issue('CREATIVE_BIBLE_POLICY_MISSING', 0, 'creative_bible', 'planning counts must remain non-target evidence');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = await realpath(process.cwd());
  const [assetText, vendorText] = await Promise.all([
    readWorkspaceFile(root, options.assets, 'assets'),
    readWorkspaceFile(root, options.vendors, 'vendors'),
    validateCreativeBible(root),
  ]);
  const assets = assetText === null ? [] : parseLedger(assetText, assetHeader, 'assets');
  const vendors = vendorText === null ? [] : parseLedger(vendorText, vendorHeader, 'vendors');
  validateAssets(assets);
  const vendorIndex = validateVendors(vendors);
  validateVendorLinks(assets, vendorIndex);
  if (issues.length > 0) {
    for (const entry of issues) console.error(JSON.stringify(entry));
    process.exitCode = 1;
    return;
  }
  console.log(`PASS clean-room assets=${assets.length} vendors=${vendors.length} planning_counts_ignored=true`);
}

main().catch((error) => {
  console.error(JSON.stringify({ code: 'AUDIT_INTERNAL_ERROR', row: 0, field: 'audit', message: error instanceof Error ? error.message : 'unknown audit failure' }));
  process.exitCode = 1;
});
