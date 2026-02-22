# Reno Manager (MVP)
Reno Manager is a single-tenant renovation tracker for planning, execution tracking, notes, purchases, expenses, unit planning, and file attachments.

It is intentionally practical and low-overhead:
- all data is JSON-backed today
- UI edits persist immediately through server actions
- the same backend logic is exposed over MCP for LLM automation

## What This MVP Supports

### Project structure
- Project-level metadata and overview
- Sections (ordered)
- Items under sections
- Units with one-level room sub-items
- Lessons learned notes
- Attachments/files at multiple scopes

### Section management
- Add section
- Edit section title/description
- Delete section (removes its items and unlinks related notes)
- Reorder sections (up/down and exact position)

### Item management
- Add item to a section
- Delete item
- Optionally link item to a unit (`unitId`) without duplicating data
- Update item fields:
  - title
  - status (`todo`, `in_progress`, `blocked`, `done`)
  - estimate
  - estimated/actual completion dates
  - assigned people/vendors
  - overview & schedule text
  - notes

### Materials management (per item)
- Add material
- Edit material
- Delete material
- Material fields:
  - name
  - quantity
  - unit type
  - estimated unit price
  - URL
  - note

### Expense management (per item)
- Add expense
- Edit expense
- Delete expense
- Expense fields:
  - date
  - amount
  - type
  - vendor
  - note

### Unit management
- Add unit
- Edit unit
- Delete unit
- Unit fields:
  - name
  - floor (`main`, `basement`)
  - no. bedrooms (integer, `0` allowed for bachelor units)
  - total area (sqm)
  - status (`planned`, `in_progress`, `done`)
  - description
- Default rooms for new units:
  - Kitchen
  - Living Area
  - Bathroom
- Optional additional rooms users can add:
  - Bedroom
  - Storage
  - Other
- Units also support linked section items (same shared item model):
  - add/edit/delete unit-linked items
  - click item title to jump to its original section item card
- Dedicated unit pages are available via sidebar:
  - `/app/[projectId]/units/[unitId]`
  - dynamic tab layout (currently `Rooms` and `Items`)

### Room management (one level deep under a unit)
- Add room
- Edit room
- Delete room
- Room fields:
  - room type
  - width (mm)
  - length (mm)
  - height (mm)
  - description/notes

### Lessons learned
- Add note
- Edit note
- Delete note
- Link note to a section, or keep it as project-wide

### Files / attachments
- Upload file
- Delete file
- Download file
- Supported by local filesystem storage
- Attachment can be linked to:
  - project
  - section
  - item
  - expense
- Attachment fields:
  - category (`drawing`, `invoice`, `permit`, `photo`, `other`)
  - optional `fileTitle`
  - note

## Tech Stack
- Next.js 16 (App Router)
- React 19
- TypeScript
- Shadcn UI
- JSON persistence (current)
- MCP server over stdio

## Repository Layout

- `src/app/app/[projectId]/*`
  - Project pages (`dashboard`, `sections`, `items`, `units`, `unit detail`, `purchases`, `expenses`, `notes`, `settings`)
- `src/components/reno/*`
  - Feature wireframes and forms
- `src/components/ui/*`
  - UI primitives + sidebar
- `src/lib/reno-types.ts`
  - Canonical domain types
- `src/lib/reno-validation.ts`
  - Runtime schema validation
- `src/lib/reno-repository.ts`
  - JSON read/write repository
- `src/core/reno-service.ts`
  - Shared business logic for both UI actions and MCP
- `src/lib/reno-actions.ts`
  - Server actions used by UI
- `src/lib/local-file-store.ts`
  - Local file storage adapter
- `src/data/reno/projects-index.json`
  - Project registry/default project
- `src/data/reno/*.json`
  - Project data files
- `src/data/reno/backups/*.json`
  - Import/backups
- `storage/`
  - Local attachment file storage (ignored by git)
- `apps/mcp-server/server.mjs`
  - MCP server entrypoint
- `apps/mcp-server/doctor.mjs`
  - MCP diagnostics

## Run Locally

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

Useful checks (no build required):

```bash
npm run lint
npm run validate:data
npm run mcp:doctor
```

## JSON Data

### Private data policy (recommended)
- Keep your real project data files private and untracked:
  - `src/data/reno/99-regent.json`
  - `src/data/reno/projects-index.json`
- This repository includes sanitized mock files for sharing/open-source use:
  - `src/data/reno/project-sample.mock.json`
  - `src/data/reno/projects-index.mock.json`

If you are setting up locally:
1. Copy `src/data/reno/projects-index.mock.json` to `src/data/reno/projects-index.json`
2. Copy `src/data/reno/project-sample.mock.json` to `src/data/reno/99-regent.json` (or your own file name)
3. Update `projects-index.json` entries to point to your local data files

Example:

```bash
cp src/data/reno/projects-index.mock.json src/data/reno/projects-index.json
cp src/data/reno/project-sample.mock.json src/data/reno/99-regent.json
```

### Project registry
`src/data/reno/projects-index.json`

```json
{
  "defaultProjectId": "sample-project",
  "projects": [
    {
      "id": "sample-project",
      "file": "project-sample.mock.json"
    }
  ]
}
```

### Project file schema (current)
Each project file in `src/data/reno/*.json` must include:

```json
{
  "id": "sample-project",
  "name": "Sample Reno Project",
  "address": "100 Example Ave, Toronto, ON",
  "phase": "Planning",
  "targetCompletion": "2026-12-31",
  "overview": {
    "projectDescription": "...",
    "area": {
      "groundFloorSqFtApprox": 1000,
      "basementSqFtApprox": 1000
    },
    "occupancyPlan": {
      "groundFloorUnits": 4,
      "basementUnits": 3,
      "totalUnits": 7
    },
    "currentState": {
      "permitObtained": true,
      "occupancy": "Fully vacant",
      "framing": "...",
      "groundFloorExteriorWalls": "...",
      "basementExteriorWalls": "...",
      "hazmat": "No asbestos/hazmat risk"
    },
    "unitMixAndSystems": {
      "totalUnits": 7,
      "bathrooms": 5,
      "kitchens": 7,
      "laundry": "...",
      "hotWater": "...",
      "basementCeilingHeight": "..."
    },
    "tradesAndFinancing": {
      "generalContractor": "Owner-managed",
      "confirmedTrades": ["Architect/Designer"],
      "pendingBeforeStart": ["Trade scheduling"],
      "financing": "Fully funded"
    },
    "scopeExclusions": ["..."]
  },
  "sections": [
    {
      "id": "hvac",
      "title": "HVAC",
      "description": "...",
      "position": 0
    }
  ],
  "items": [
    {
      "id": "hv-1",
      "sectionId": "hvac",
      "unitId": "unit-1",
      "title": "Relocate return vent in hallway",
      "status": "todo",
      "estimate": 1200,
      "estimatedCompletionDate": "2026-03-01",
      "actualCompletionDate": "",
      "performers": ["Vendor A"],
      "description": "Overview text",
      "note": "Execution notes",
      "materials": [
        {
          "id": "mat-1",
          "name": "Duct section",
          "quantity": 2,
          "unitType": "piece",
          "estimatedPrice": 90,
          "url": "",
          "note": ""
        }
      ],
      "expenses": [
        {
          "id": "exp-1",
          "date": "2026-02-20",
          "amount": 312.5,
          "type": "material",
          "vendor": "SupplyHouse",
          "note": "PEX fittings"
        }
      ]
    }
  ],
  "units": [
    {
      "id": "unit-1",
      "name": "Unit 1 - Main Floor",
      "floor": "main",
      "bedrooms": 1,
      "totalAreaSqm": 42,
      "status": "planned",
      "description": "",
      "rooms": [
        {
          "id": "room-1",
          "roomType": "kitchen",
          "widthMm": 3200,
          "lengthMm": 2800,
          "heightMm": 2400,
          "description": ""
        }
      ]
    }
  ],
  "notes": [
    {
      "id": "n-1",
      "title": "Inspection prep",
      "content": "...",
      "linkedSectionId": null
    }
  ],
  "attachments": [
    {
      "id": "att-1",
      "projectId": "sample-project",
      "scopeType": "project",
      "scopeId": null,
      "category": "permit",
      "fileTitle": "Final Approved Plans",
      "originalName": "Building Permit Drawings.PDF",
      "mimeType": "application/pdf",
      "sizeBytes": 6439208,
      "storageKey": "projects/sample-project/project/att-1-Building-Permit-Drawings.PDF",
      "uploadedAt": "2026-02-22T17:53:58.125Z",
      "note": "Site plan + floor plans"
    }
  ]
}
```

### Enums

- Item status: `todo`, `in_progress`, `blocked`, `done`
- Expense type: `material`, `labor`, `permit`, `tool`, `other`
- Material unit type:
  - `linear_ft`, `sqft`, `sqm`, `piece`, `bundle`, `box`, `roll`, `sheet`, `bag`, `gallon`, `liter`, `kg`, `lb`, `meter`, `other`
- Unit floor: `main`, `basement`
- Unit status: `planned`, `in_progress`, `done`
- Unit room type: `kitchen`, `living_area`, `bedroom`, `bathroom`, `storage`, `other`
- Attachment scope: `project`, `section`, `item`, `expense`
- Attachment category: `drawing`, `invoice`, `permit`, `photo`, `other`

### Numeric constraints
- `sections[].position`: non-negative integer, unique
- `items[].estimate`: number
- `materials[].quantity`: number
- `materials[].estimatedPrice`: number
- `expenses[].amount`: number
- `units[].bedrooms`: non-negative integer (`0` valid)
- `units[].totalAreaSqm`: number
- `rooms[].widthMm`, `lengthMm`, `heightMm`: number

### Item linkage behavior
- `items[].unitId` is optional:
  - omitted or `null` -> project-wide item
  - string -> linked to an existing unit ID
- Validation enforces that any non-null `unitId` references an existing unit.

## Importing/Updating JSON Data

Dry run:

```bash
npm run import:data:dry-run -- --source path/to/project.json --project-id my-project
```

Actual import:

```bash
npm run import:data -- --source path/to/project.json --project-id my-project
```

Import behavior:
- validates incoming data
- creates backup in `src/data/reno/backups/` if target exists
- writes target project file
- updates `projects-index.json` when needed
- runs post-write validation

For public repositories, import into locally ignored data files (for example `99-regent.json`) and keep mock files as committed examples only.

## File Storage (Local)

Attachments are stored in local filesystem under `storage/`.

- This folder is ignored by git.
- JSON stores metadata (`storageKey`, filename, mime type, etc.).
- Files can be downloaded through API endpoints.

Current API routes:
- `POST /api/files/upload`
- `DELETE /api/files/[attachmentId]?projectId=...`
- `GET /api/files/[attachmentId]/download?projectId=...`

## MCP Integration

The MCP server uses the same `renoService` as the app UI.

Run MCP server:

```bash
npm run mcp:server
```

Quiet mode:

```bash
npm run mcp:server:quiet
```

Doctor check:

```bash
npm run mcp:doctor
```

### MCP resources
- `resource://project/{projectId}`
- `resource://item/{projectId}/{itemId}`
- `resource://unit/{projectId}/{unitId}`
- `resource://section/{projectId}/{sectionId}`
- `resource://note/{projectId}/{noteId}`

### MCP tools
- Project:
  - `reno_list_projects`
  - `reno_get_project`
  - `reno_get_project_meta`
  - `reno_update_project_meta`
- Sections:
  - `reno_list_sections`
  - `reno_add_section`
  - `reno_update_section`
  - `reno_delete_section`
  - `reno_move_section`
  - `reno_set_section_position`
- Items:
  - `reno_list_items`
  - `reno_get_item`
  - `reno_add_item`
  - `reno_delete_item`
  - `reno_update_item_fields`
  - `reno_update_item_status`
- Materials:
  - `reno_add_material`
  - `reno_update_material`
  - `reno_delete_material`
- Expenses:
  - `reno_add_expense`
  - `reno_update_expense`
  - `reno_delete_expense`
- Units:
  - `reno_list_units`
  - `reno_get_unit`
  - `reno_add_unit`
  - `reno_update_unit`
  - `reno_delete_unit`
  - `reno_add_unit_room`
  - `reno_update_unit_room`
  - `reno_delete_unit_room`
- Notes:
  - `reno_list_notes`
  - `reno_add_note`
  - `reno_update_note`
  - `reno_delete_note`
  - `reno_link_note`
- Attachments:
  - `reno_list_attachments`
  - `reno_add_attachment_from_path`
  - `reno_delete_attachment`
  - `reno_get_attachment_download_url`

### MCP safe mode
Enable confirmation requirement for destructive operations:

```bash
RENO_MCP_SAFE_MODE=1 npm run mcp:server
```

With safe mode on, delete tools require `confirm: true`.

### MCP item + unit linkage details
- `reno_add_item` supports optional `unitId` and full optional fields:
  - `status`, `estimatedCompletionDate`, `actualCompletionDate`
  - `performers`, `description`, `note`
  - `materials[]`, `expenses[]`
- `reno_update_item_fields` supports:
  - all core fields
  - optional `unitId` reassignment/clear
  - optional full replacement of `materials[]` and `expenses[]`
- `reno_list_items` supports filtering by `unitId` (in addition to `sectionId` and `status`).
- `reno_get_unit` returns:
  - `unit`
  - `items` linked to that unit

## UI Routes

- `/app` -> redirects to default project
- `/app/[projectId]` -> dashboard
- `/app/[projectId]/sections/[sectionId]`
- `/app/[projectId]/items`
- `/app/[projectId]/items/[itemId]`
- `/app/[projectId]/units`
- `/app/[projectId]/units/[unitId]`
- `/app/[projectId]/purchases`
- `/app/[projectId]/expenses`
- `/app/[projectId]/notes`
- `/app/[projectId]/settings`

## Current Constraints

- JSON and local filesystem persistence are ideal for local/dev workflows.
- For production hosting, plan migration to durable storage.

## UX Notes (Current)
- Sidebar project menu is collapsed by default.
- `All Items` supports filters for:
  - section
  - status
  - unit (including project-wide items)
- Item links in `All Items` and unit item lists deep-link to section item anchors:
  - `/app/[projectId]/sections/[sectionId]#item-[itemId]`

## Database Migration Path (Planned)

Current architecture already isolates persistence behind repository + service layers.

Recommended next step:
1. Implement a Postgres/Prisma repository with the same interface as `JsonProjectRepository`.
2. Swap repository binding in one place.
3. Keep `renoService`, server actions, and MCP tools unchanged.

Target stack (planned):
- Vercel Postgres
- Prisma migrations
- Minimal single-tenant auth (HTTP-only signed session)
- Add login rate limiting and password hashing baseline
