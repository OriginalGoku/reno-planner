# Reno Manager (MVP)
Reno Manager is a single-tenant renovation tracker for renovation planning and execution.
It is intentionally practical and low-overhead:
- JSON-backed data (for now)
- local file storage for attachments
- same backend logic exposed to UI and MCP

## Current MVP Capabilities
### Project structure
- Project metadata and overview
- Ordered sections
- Items under sections
- Units with one-level room sub-items
- Lessons learned notes
- Attachments at multiple scopes

### Sections
- Add, edit, delete sections
- Reorder sections (up/down and exact position)

### Items
- Add, edit, delete items
- Optional `unitId` linkage (item can be section-scoped and unit-linked)
- Status, estimate, dates, performers, overview, notes
- Materials and expenses per item

### Units
- Add, edit, delete units
- Default rooms on create: Kitchen, Living Area, Bathroom
- Optional additional rooms: Bedroom, Storage, Other
- Dedicated unit pages: `/app/[projectId]/units/[unitId]`
- Dynamic tab layout on unit detail (currently `Rooms` and `Items`)
- Unit item titles link to section anchors:
  - `/app/[projectId]/sections/[sectionId]#item-[itemId]`

### Notes
- Add, edit, delete notes
- Optional link to section or project-wide note

### Attachments
- Upload, download, delete files
- Scopes: `project`, `section`, `item`, `expense`
- Categories: `drawing`, `invoice`, `permit`, `photo`, `other`
- Optional `fileTitle` and note

## Material Catalog (Design Decision)
This is the agreed direction for next iteration:
- Add project-level `materialCatalog` with:
  - `id`
  - `name`
  - `unitType`
  - optional: `estimatedPrice`, `sampleUrl`, `notes`
- Item material lines should reference catalog entries (single source of truth for material identity).
- Unit type is enforced at catalog level (no per-item unit override).
- Future UI setting will support display-unit conversion without changing stored canonical unit values.

## Tech Stack
- Next.js 16 (App Router)
- React 19
- TypeScript
- Shadcn UI
- JSON persistence
- MCP server over stdio

## Repository Layout
- `src/app/app/[projectId]/*` project routes
- `src/components/reno/*` feature UIs
- `src/components/ui/*` UI primitives and sidebar
- `src/lib/reno-types.ts` domain types
- `src/lib/reno-validation.ts` runtime validation
- `src/lib/reno-repository.ts` JSON repository
- `src/core/reno-service.ts` shared business logic
- `src/lib/reno-actions.ts` Next server actions
- `src/lib/local-file-store.ts` local attachment storage
- `src/data/reno/*` project JSON data
- `apps/mcp-server/server.mjs` MCP server

## Local Run
```bash
npm install
npm run dev
```
Open `http://localhost:3000`

Useful checks:
```bash
npm run lint
npm run validate:data
npm run mcp:doctor
```

## Data Files and Privacy
### Private local files (ignored)
- `src/data/reno/99-regent.json`
- `src/data/reno/projects-index.json`

### Committed mock files
- `src/data/reno/project-sample.mock.json`
- `src/data/reno/projects-index.mock.json`

Initialize local data from mocks:
```bash
cp src/data/reno/projects-index.mock.json src/data/reno/projects-index.json
cp src/data/reno/project-sample.mock.json src/data/reno/99-regent.json
```

## JSON Schema Notes
### `projects-index.json`
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

### Item linkage
- `items[].unitId` is optional:
  - omitted/`null` => project-wide item
  - string => linked to an existing unit ID
- Validation enforces referenced unit existence.

### Enums
- Item status: `todo`, `in_progress`, `blocked`, `done`
- Expense type: `material`, `labor`, `permit`, `tool`, `other`
- Material unit type: `linear_ft`, `sqft`, `sqm`, `piece`, `bundle`, `box`, `roll`, `sheet`, `bag`, `gallon`, `liter`, `kg`, `lb`, `meter`, `other`
- Unit floor: `main`, `basement`
- Unit status: `planned`, `in_progress`, `done`
- Unit room type: `kitchen`, `living_area`, `bedroom`, `bathroom`, `storage`, `other`

## Import / Update JSON
Dry run:
```bash
npm run import:data:dry-run -- --source path/to/project.json --project-id my-project
```

Write:
```bash
npm run import:data -- --source path/to/project.json --project-id my-project
```

Import behavior:
- validates input
- creates backup in `src/data/reno/backups/` when overwriting
- writes project file
- updates `projects-index.json` when needed

## File Storage
Attachments are stored under `storage/` (gitignored).

API routes:
- `POST /api/files/upload`
- `DELETE /api/files/[attachmentId]?projectId=...`
- `GET /api/files/[attachmentId]/download?projectId=...`

## MCP
Run:
```bash
npm run mcp:server
```

Quiet mode:
```bash
npm run mcp:server:quiet
```

Doctor:
```bash
npm run mcp:doctor
```

### MCP resources
- `resource://project/{projectId}`
- `resource://item/{projectId}/{itemId}`
- `resource://unit/{projectId}/{unitId}`
- `resource://section/{projectId}/{sectionId}`
- `resource://note/{projectId}/{noteId}`

### MCP tools (high level)
- Project: list/get/update metadata
- Sections: list/add/update/delete/reorder/set position
- Items: list/get/add/update/delete/status
- Materials: add/update/delete
- Expenses: add/update/delete
- Units: list/get/add/update/delete and room CRUD
- Notes: list/add/update/delete/link
- Attachments: list/add/delete/get download URL

### MCP item + unit linkage support
- `reno_add_item`: supports optional `unitId` and full optional payload (`status`, dates, performers, description, note, materials, expenses).
- `reno_update_item_fields`: supports core fields, optional `unitId` reassignment/clear, optional full `materials[]`/`expenses[]` replacement.
- `reno_list_items`: supports filtering by `sectionId`, `status`, and `unitId`.
- `reno_get_unit`: returns both `unit` and linked `items`.

### MCP safe mode
```bash
RENO_MCP_SAFE_MODE=1 npm run mcp:server
```
With safe mode enabled, destructive tools require `confirm: true`.

## UI Routes
- `/app` redirects to default project
- `/app/[projectId]` dashboard
- `/app/[projectId]/sections/[sectionId]`
- `/app/[projectId]/items`
- `/app/[projectId]/items/[itemId]`
- `/app/[projectId]/units`
- `/app/[projectId]/units/[unitId]`
- `/app/[projectId]/purchases`
- `/app/[projectId]/expenses`
- `/app/[projectId]/notes`
- `/app/[projectId]/settings`

## Current Constraints and Migration
- JSON + local filesystem are great for local/dev.
- Planned migration path:
  1. implement Postgres/Prisma repository with same interface
  2. swap repository binding
  3. keep service/actions/MCP contracts stable
