# Reno Manager (MVP)

Reno Manager is a single-tenant renovation tracker focused on practical execution:
- JSON-backed project data
- local file storage for attachments
- one shared backend service used by both UI and MCP

The app is intentionally simple, with strong editability across project planning, units, materials, purchases, notes, and files.

## Current MVP Scope

### Core structure
- Project metadata + detailed project overview
- Ordered project sections (shown in sidebar under `Project Sections`)
- Items under sections
- Optional unit linkage per item via `unitId`
- Units with one-level room sub-items
- Lessons learned notes (project-wide or linked to a section)

### Sections
- Add, edit, delete
- Reorder (up/down and exact position)

### Items
- Add, edit, delete
- Status: `todo | in_progress | blocked | done`
- Estimate, dates, performers/vendors, overview, notes
- Materials tab
- Expenses tab
- Files tab

### Units
- Add, edit, delete units
- Bedrooms supported (including `0` for bachelor)
- Default rooms on create: `Kitchen`, `Living Area`, `Bathroom`
- Optional rooms: `Bedroom`, `Storage`, `Other`
- Unit detail page uses dynamic tabs (currently `Rooms`, `Items`)
- Unit items are clickable and deep-link to section item anchor:
  - `/app/[projectId]/sections/[sectionId]#item-[itemId]`

### Materials
- Sidebar has `Materials` with 2 pages:
  - `New Materials`
  - `Catalog Entries`
- `Catalog Entries` grouped by category (collapsible)
- Catalog material name is clickable to a usage page:
  - `/app/[projectId]/materials/catalog/[materialId]`
  - shows all items using that material

### Purchases / Accounting (Phase 1)
- Upload invoice files
- Create invoice draft from attachment via LLM extraction
- Review/edit draft lines + material links
- Confirm & post immutable purchase ledger rows
- Delete draft support
- Force second pass extraction (`gpt-5-mini`) from UI
- Extraction pass marker shown in UI (`First Pass` / `Second Pass`)

### Attachments
- Upload / download / delete
- Scopes: `project | section | item | expense`
- Categories: `drawing | invoice | permit | photo | other`
- Optional `fileTitle` + note

---

## Material Pricing Model (Important)

Material unit price is catalog-owned only.

- `materialCatalog[].estimatedPrice` is the default unit estimate
- Item material lines store quantity + link only:
  - `id`, `materialId`, `quantity`, `url`, `note`
- Item-level `estimatedPrice` is removed
- Line estimate in UI is always:
  - `quantity * materialCatalog[materialId].estimatedPrice`
- If catalog price is missing, app uses `0` and displays warning
- UI clearly marks: `Price source: Material Catalog`

### One-time migration command
Legacy data can be migrated with:

```bash
npm run migrate:material-pricing
```

Migration behavior:
- for each legacy item material line, derive unit price:
  - `catalogEstimatedPrice = legacyEstimatedPrice / quantity`
- only sets catalog price when catalog price is missing/non-positive
- removes item-level `estimatedPrice`
- normalizes line to quantity-only shape

---

## Tech Stack
- Next.js 16 (App Router)
- React 19
- TypeScript
- Shadcn UI
- JSON persistence
- MCP server over stdio

---

## Repository Layout
- `src/app/app/[projectId]/*` routes
- `src/components/reno/*` feature UI
- `src/components/ui/*` UI primitives + sidebar
- `src/core/reno-service.ts` shared business logic
- `src/core/invoice-extractor.ts` modular LLM extraction
- `src/lib/reno-types.ts` domain types
- `src/lib/reno-validation.ts` runtime validation
- `src/lib/reno-repository.ts` JSON repository
- `src/lib/reno-actions.ts` Next server actions
- `src/lib/local-file-store.ts` local file storage
- `src/data/reno/*` project JSON data
- `apps/mcp-server/server.mjs` MCP server
- `scripts/*` migration/import/validation scripts

---

## Local Development

```bash
npm install
npm run dev
```

Open:
- `http://localhost:3000`

Useful checks:

```bash
npm run lint
npm run validate:data
./node_modules/.bin/tsc --noEmit
npm run mcp:doctor
```

---

## Data Files and Privacy

Private local files (ignored):
- `src/data/reno/99-regent.json`
- `src/data/reno/projects-index.json`

Committed mock files:
- `src/data/reno/project-sample.mock.json`
- `src/data/reno/projects-index.mock.json`

Initialize local files from mocks:

```bash
cp src/data/reno/projects-index.mock.json src/data/reno/projects-index.json
cp src/data/reno/project-sample.mock.json src/data/reno/99-regent.json
```

---

## JSON Notes

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
  - string => linked to existing unit

### Material catalog
- `materialCatalog` includes:
  - `id`, `categoryId`, `name`, `unitType`
  - optional `estimatedPrice`, `sampleUrl`, `notes`

### Enums
- Item status: `todo`, `in_progress`, `blocked`, `done`
- Expense type: `material`, `labor`, `permit`, `tool`, `other`
- Material unit type:
  - `linear_ft`, `sqft`, `sqm`, `piece`, `bundle`, `box`, `roll`, `sheet`, `bag`, `gallon`, `liter`, `kg`, `lb`, `meter`, `other`
- Unit floor: `main`, `basement`
- Unit status: `planned`, `in_progress`, `done`
- Room type:
  - `kitchen`, `living_area`, `bedroom`, `bathroom`, `storage`, `other`

---

## Import / Update Project JSON

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
- creates backup in `src/data/reno/backups/` on overwrite
- writes project file
- updates `projects-index.json` when needed

---

## File Storage

Attachments are stored in `storage/` (gitignored).

API routes:
- `POST /api/files/upload`
- `DELETE /api/files/[attachmentId]?projectId=...`
- `GET /api/files/[attachmentId]/download?projectId=...`

---

## Invoice Extraction (OpenAI)

Set environment variables in `.env`:

```bash
OPENAI_API_KEY=your_key_here
RENO_INVOICE_LLM_PROVIDER=openai
RENO_INVOICE_LLM_MODEL=gpt-5-nano
RENO_INVOICE_LLM_SECOND_PASS_MODEL=gpt-5-mini
RENO_INVOICE_DEBUG=1
```

Debug logs:
- file: `logs/invoice-extractor.log`
- includes pass-1/pass-2 outputs, parsed keys, line counts, and normalization summary

---

## MCP Server

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

### MCP Resources
- `resource://project/{projectId}`
- `resource://item/{projectId}/{itemId}`
- `resource://unit/{projectId}/{unitId}`
- `resource://section/{projectId}/{sectionId}`
- `resource://note/{projectId}/{noteId}`
- `resource://material/{projectId}/{materialId}`

### MCP Tools (high-level)
- Project metadata: get/update
- Sections: list/add/update/delete/reorder/set-position
- Items: list/get/add/update/delete/status
- Units: list/get/add/update/delete + room CRUD
- Notes: list/add/update/delete/link
- Material categories + catalog entries: full CRUD
- Item material lines: add/update/delete (quantity + catalog link)
- Expenses: add/update/delete
- Attachments: list/add/delete/get-download-url
- Invoices: extract draft, force second pass, update draft, confirm draft, delete draft, list/get invoices, list purchase ledger
- Services menus/subsections/fields: full CRUD

### MCP Safe Mode
```bash
RENO_MCP_SAFE_MODE=1 npm run mcp:server
```
In safe mode, destructive tools require `confirm: true`.

---

## UI Routes
- `/app` redirects to default project
- `/app/[projectId]`
- `/app/[projectId]/sections/[sectionId]`
- `/app/[projectId]/items`
- `/app/[projectId]/items/[itemId]`
- `/app/[projectId]/units`
- `/app/[projectId]/units/[unitId]`
- `/app/[projectId]/materials/new`
- `/app/[projectId]/materials/catalog`
- `/app/[projectId]/materials/catalog/[materialId]`
- `/app/[projectId]/purchases`
- `/app/[projectId]/expenses`
- `/app/[projectId]/notes`
- `/app/[projectId]/settings`

---

## Future DB Migration Path
1. Implement Postgres/Prisma repository with same interface as JSON repository.
2. Switch binding at service layer.
3. Keep UI routes, server actions, and MCP tool contracts stable.

