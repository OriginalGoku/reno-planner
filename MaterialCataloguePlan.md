# Material Catalogue Plan

## Goal
Introduce a project-level `materialCatalog` as the single source of truth for material identity and base unit type, while keeping item-level material usage for quantity planning.

---

## Agreed Data Model

## `materialCatalog[]` (project-level)
Each entry:
- `id` (string, stable key)
- `name` (string)
- `unitType` (enum from existing material unit types)
- optional:
  - `estimatedPrice` (number)
  - `sampleUrl` (string)
  - `notes` (string)

Example:

```json
{
  "id": "mat-drywall-58-typex",
  "name": "Drywall 5/8 Type X",
  "unitType": "sheet",
  "estimatedPrice": 24,
  "sampleUrl": "https://example.com/drywall",
  "notes": "Default board for fire separation walls"
}
```

---

## Item Material Usage Model (reference-based)

Item material lines should reference catalog entries:
- `id` (line id)
- `materialId` (required, points to `materialCatalog.id`)
- `quantity` (number)
- optional:
  - `estimatedPrice` (line-level planning override if needed later)
  - `url` (line-level link if needed later)
  - `note`

Core principle:
- Material identity and unit are catalog-owned.
- Item lines hold usage quantities and task-level context.

---

## Unit Type Policy (Agreed)

- Unit type is enforced at catalog level.
- No per-item unit override.
- Future UI will allow display-unit conversion settings (presentation only).
- Stored values remain in canonical catalog unit.

---

## Validation Rules

1. `materialCatalog[].id` must be unique within project.
2. `materialCatalog[].name` should be non-empty.
3. `materialCatalog[].unitType` must be valid enum value.
4. Every item material `materialId` must reference an existing catalog entry.
5. Item material `quantity` must be numeric.

Recommended:
- Soft check for duplicate names in catalog (warn in UI).

---

## UI Plan

1. New project-level Material Catalogue screen
- List/search materials
- Add/edit/delete catalog entries

2. Item material editor changes
- Replace free-text material name with catalog selector
- Allow inline “create new material” from item flow
- Show catalog unit type as read-only next to quantity input

3. Shopping/Purchase readiness
- Aggregation key becomes `materialId` (clean, deterministic)
- Better traceability from required -> purchased -> remaining

---

## MCP Plan

Add material catalogue tools:
- `reno_list_material_catalog`
- `reno_get_material`
- `reno_add_material_catalog_item`
- `reno_update_material_catalog_item`
- `reno_delete_material_catalog_item`

Adjust existing item-material tools to use `materialId` and quantity.

---

## Migration Plan (JSON-backed)

1. Add `materialCatalog: []` to project schema.
2. Migrate existing item materials:
- Create catalog entries from existing material names.
- Assign generated `materialId` to each item material line.
- Keep legacy fields temporarily if needed, then remove.
3. Validate referential integrity after migration.

---

## Non-Goals (for this step)

- Multi-project shared global catalog
- Advanced pricing/versioning history
- Unit-conversion engine implementation (documented for later)
