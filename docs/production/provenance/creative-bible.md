# Creative Bible and Clean-Room Provenance Policy

Status: governance template. The sample records in the accompanying ledgers are synthetic placeholders, not production assets, suppliers, or receipts.

## Normative Product Constraints

Every production asset must originate in an independently created or demonstrably licensed source. Before an asset can be used, its ledger record must name its source, creator, accountable vendor, license, receipt, source-to-derivative link, export, and completed similarity review.

The clean-room audit accepts only a `reviewed-clear` similarity status. A reviewer must reject any record that cannot establish independent origin or that retains protected reference details in a source, derivative, export, or metadata field.

Planning counts are capacity evidence only, never production asset targets. This policy does not authorize asset creation, count commitments, or use of a planning estimate as a deliverable requirement.

## Non-Normative Analysis Precedent

Analysis material may describe high-level genre precedent for internal discussion. It is not a production source and does not supply asset references, identifiers, visual constants, names, layouts, code, protocols, or configuration for the ledgers or exports.

Only independently authored creative direction and documented third-party licenses may enter the production provenance chain. A similarity review must be based on the proposed new work, not on reproducing protected reference material.

## Clean-Room Review Workflow

1. The creator records a new source reference before derivative work begins.
2. The accountable vendor record provides the actual license and receipt for the same source. Unknown real vendor or receipt data remains unknown and blocks use; it must not be guessed.
3. The creator records the exact source-to-derivative relationship and export identifier.
4. An independent reviewer records a `reviewed-clear` similarity decision with a review identifier.
5. `bun run audit:clean-room -- --strict` must pass before the asset is admitted. Any missing field, broken link, or clean-room marker blocks the record without a partial pass.

## Ledger Schemas

`asset-ledger.csv` has one row per asset export with these exact columns:

`asset_id,source_type,source_ref,creator_id,vendor_id,license_id,receipt_id,source_derivative_link,export_id,similarity_status,similarity_review_id`

`vendor-ledger.csv` has one row per accountable supplier or internal creator record with these exact columns:

`vendor_id,vendor_name,license_id,receipt_id,source_record,status`

The headers are part of the audit contract. Values are plain text ledger identifiers, not file paths or unreviewed free-form production references.

The audit parser accepts quoted commas, escaped quotes, and quoted newlines. Strict ledger values reject control characters, padded text, and spreadsheet-formula-like prefixes after parsing.
