# Accounting Plan (Phase 1 MVP)

## Goal
Implement invoice-to-purchase bookkeeping with LLM-assisted extraction and mandatory human confirmation before posting.

Core flow:
1. Upload invoice file (image/PDF)
2. LLM extracts invoice + line items into a draft
3. User reviews/edits fields and material links
4. User confirms and posts immutable ledger entries
5. Shopping rollup computes required vs purchased vs remaining

No automatic posting in Phase 1.

---

## Implementation Plan

1. Extend data model
- Add `purchaseInvoices[]` (draft + confirmed invoice records)
- Add `purchaseLedger[]` (immutable posted entries)

2. Extend type system and validation
- Add new types in `src/lib/reno-types.ts`
- Add validation rules in `src/lib/reno-validation.ts`
- Backward compatibility: if arrays missing, default to `[]` in repository read path

3. Add repository/service APIs
- `createInvoiceDraftFromExtraction`
- `updateInvoiceDraft`
- `confirmInvoiceDraft`
- `listInvoices`, `getInvoice`
- `listPurchaseLedger`

4. Reuse existing attachment pipeline
- Keep invoice file as attachment (`category: invoice`)
- Link invoice draft to uploaded attachment via `attachmentId`

5. Add LLM extraction action/endpoint
- Input: `projectId`, `attachmentId`
- Output: strict JSON draft payload
- Save output as `purchaseInvoices[]` record with status `draft`

6. Build invoice review UI
- New/extended Purchases view:
  - list drafts/confirmed invoices
  - editable line table
  - confidence display
  - materialCatalog link selector per line
  - totals reconciliation panel

7. Confirm/post workflow
- On confirm:
  - lock invoice snapshot
  - write immutable `purchaseLedger[]` rows
  - mark invoice `confirmed`
- If totals mismatch, require explicit override note before confirm

8. Shopping rollup computation
- `requiredQty`: sum from item materials
- `purchasedQty`: sum from ledger rows
- `remainingQty = requiredQty - purchasedQty`

9. MCP integration
- Add tools:
  - `reno_extract_invoice_draft`
  - `reno_update_invoice_draft`
  - `reno_confirm_invoice_draft`
  - `reno_list_invoices`
  - `reno_get_invoice`
  - `reno_list_purchase_ledger`

10. Audit and safety
- Persist extraction metadata (model, timestamp)
- Store original extracted output + final confirmed snapshot
- Never overwrite posted ledger rows; corrections are adjustment entries

---

## JSON Schema Proposal (Project-level additions)

Add two top-level arrays to each project JSON:
- `purchaseInvoices`
- `purchaseLedger`

### `purchaseInvoices[]`

```json
{
  "id": "inv-2026-0001",
  "status": "draft",
  "projectId": "99-regent",
  "attachmentId": "att-123",
  "vendorName": "Home Depot",
  "invoiceNumber": "HD-556712",
  "invoiceDate": "2026-03-02",
  "currency": "CAD",
  "totals": {
    "subTotal": 450.0,
    "tax": 58.5,
    "shipping": 0,
    "otherFees": 0,
    "grandTotal": 508.5
  },
  "lines": [
    {
      "id": "line-1",
      "sourceText": "Drywall 5/8 Type X 20 pcs @ 24.00",
      "description": "Drywall 5/8 Type X",
      "quantity": 20,
      "unitType": "sheet",
      "unitPrice": 24.0,
      "lineTotal": 480.0,
      "materialId": "mat-drywall-58-typex",
      "confidence": 0.93,
      "needsReview": false,
      "notes": ""
    }
  ],
  "extraction": {
    "provider": "openai",
    "model": "gpt-4.1",
    "extractedAt": "2026-03-02T17:30:00.000Z",
    "rawOutput": {
      "vendor": "Home Depot",
      "invoiceNumber": "HD-556712"
    }
  },
  "review": {
    "totalsMismatchOverride": false,
    "overrideReason": ""
  },
  "createdAt": "2026-03-02T17:30:00.000Z",
  "updatedAt": "2026-03-02T17:35:00.000Z",
  "confirmedAt": null
}
```

Notes:
- `status`: `draft | confirmed | voided`
- `materialId` is optional in draft; unresolved lines can stay unmatched until review
- `confidence` is LLM-suggested confidence only

### `purchaseLedger[]` (immutable postings)

```json
{
  "id": "led-2026-0001",
  "projectId": "99-regent",
  "invoiceId": "inv-2026-0001",
  "invoiceLineId": "line-1",
  "postedAt": "2026-03-02T17:40:00.000Z",
  "materialId": "mat-drywall-58-typex",
  "quantity": 20,
  "unitType": "sheet",
  "unitPrice": 24.0,
  "lineTotal": 480.0,
  "vendorName": "Home Depot",
  "invoiceDate": "2026-03-02",
  "currency": "CAD",
  "entryType": "purchase",
  "note": ""
}
```

Future adjustment example:
- Same shape, `entryType: "adjustment"`, quantity can be positive/negative, with reason in `note`.

---

## Derived Shopping Rollup (computed, not stored)

For each `materialId`:
- `requiredQty` = sum of item material requirements
- `purchasedQty` = sum of `purchaseLedger` quantities (`entryType` aware)
- `remainingQty` = `requiredQty - purchasedQty`

No manual edits on aggregate totals.

---

## Validation Rules

1. `purchaseInvoices[].projectId` must match project id
2. `purchaseInvoices[].attachmentId` must reference existing attachment
3. `purchaseInvoices[].lines[].materialId` (if present) must exist in `materialCatalog`
4. `purchaseLedger[].materialId` must exist in `materialCatalog`
5. `purchaseLedger[].invoiceId` + `invoiceLineId` must reference existing invoice + line
6. Ledger rows are append-only

---

## Out of Scope (Phase 1)

- Vendor-specific parsers
- Auto-confirm/auto-post
- Fully automated correction workflows
- Tax accounting by jurisdiction
