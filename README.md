# Reno Manager (MVP)
A lightweight, single-tenant renovation tracker built with Next.js App Router and Shadcn UI.

This project is optimized for practical day-to-day renovation management with minimal overhead:
- organize work by **Project -> Sections -> Items**
- track status, schedules, notes, materials, and expenses
- capture project-level and section-linked lessons learned
- keep everything JSON-backed for fast iteration

## 1. Current MVP Scope
This MVP is intentionally simple and focused on execution.

Included:
- Single-tenant app structure
- Dynamic project routing: `/app/[projectId]`
- Sidebar navigation generated from project JSON
- Section and item drill-down workflows
- Section management on project page:
  - add
  - edit
  - delete (with confirmation)
- Item-level editing for:
  - title
  - status
  - estimate
  - estimated/actual completion dates
  - assigned contractors/vendors
  - overview + notes
  - materials (add/edit/remove)
  - expenses (add/edit/remove)
- Project lessons learned:
  - add notes
  - edit title/content
  - link notes to a section or whole project
- All Items / Purchases / Expenses grouped views
- Inline success/error feedback in edit panels (no toast dependency)
- JSON validation and import pipeline

Not included yet:
- authentication/session/rate limiting
- database persistence
- multi-user support
- accounting-grade reporting

## 2. Tech Stack
- Next.js 16 (App Router)
- React 19
- TypeScript
- Shadcn UI components
- JSON file persistence (current)

## 3. Project Structure
Key paths:

- `src/app/app/[projectId]/...`
  - Project dashboard and feature pages
- `src/components/reno/*`
  - Feature UI and wireframe components
- `src/components/ui/*`
  - Shadcn-based UI primitives
- `src/lib/reno-repository.ts`
  - JSON-backed repository (read/write)
- `src/lib/reno-actions.ts`
  - Server actions used by the UI for writes
- `src/lib/reno-project-service.ts`
  - Server-side project loaders
- `src/lib/reno-data-loader.ts`
  - Shared project helper functions/types exports
- `src/lib/reno-validation.ts`
  - Runtime project schema validation
- `src/data/reno/projects-index.json`
  - project registry + default project
- `src/data/reno/*.json`
  - project datasets
- `scripts/validate-reno-data.mjs`
  - validation script
- `scripts/import-project.mjs`
  - import/backup/update-index script

## 4. Running the App
Install and run:

```bash
npm install
npm run dev
```

Open:
- `http://localhost:3000`

Quality checks:

```bash
npm run lint
npm run validate:data
npm run build
```

## 5. JSON Data Model
The app currently reads and writes project state from JSON files.

### 5.1 Project Registry
`src/data/reno/projects-index.json`

```json
{
  "defaultProjectId": "99-regent",
  "projects": [
    {
      "id": "99-regent",
      "file": "99-regent.json"
    }
  ]
}
```

### 5.2 Project File Shape
Each project file (for example `src/data/reno/99-regent.json`) must follow this structure:

```json
{
  "id": "99-regent",
  "name": "99 Regent",
  "address": "99 Regent St, Toronto, ON",
  "phase": "Planning",
  "targetCompletion": "2026-08-15",
  "sections": [
    {
      "id": "hvac",
      "title": "HVAC",
      "description": "Heating and cooling scope"
    }
  ],
  "items": [
    {
      "id": "hv-1",
      "sectionId": "hvac",
      "title": "Install heat pump",
      "status": "todo",
      "estimate": 12000,
      "estimatedCompletionDate": "2026-06-01",
      "actualCompletionDate": "",
      "performers": ["Northwind HVAC"],
      "description": "Main item overview",
      "note": "Execution notes",
      "materials": [
        {
          "id": "mat-1",
          "name": "Outdoor unit",
          "quantity": 1,
          "estimatedPrice": 4800,
          "note": "Model per design"
        }
      ],
      "expenses": [
        {
          "id": "exp-1",
          "date": "2026-02-21",
          "amount": 350,
          "type": "material",
          "vendor": "HVAC Supply",
          "note": "Refrigerant lines"
        }
      ]
    }
  ],
  "notes": [
    {
      "id": "note-1",
      "title": "Inspection lesson",
      "content": "Take rough-in photos before closure",
      "linkedSectionId": null
    }
  ]
}
```

### 5.3 Enum Rules
`items[].status` must be one of:
- `todo`
- `in_progress`
- `blocked`
- `done`

`items[].expenses[].type` must be one of:
- `material`
- `labor`
- `permit`
- `tool`
- `other`

### 5.4 Numeric Rules
These must be numbers (not `null`, not strings):
- `items[].estimate`
- `items[].materials[].quantity`
- `items[].materials[].estimatedPrice`
- `items[].expenses[].amount`

If unknown, use `0`.

## 6. Importing Real Data
Use the importer to add or replace project JSON safely.

### 6.1 Dry Run (recommended first)
No files are changed.

```bash
npm run import:data:dry-run -- --source path/to/project.json --project-id my-project
```

This prints:
- source file
- resolved project ID
- target data file
- whether backup would be created
- whether `projects-index.json` would be updated

### 6.2 Actual Import
Performs validation, backups, writes, and post-write validation.

```bash
npm run import:data -- --source path/to/project.json --project-id my-project
```

Behavior:
- validates incoming JSON
- creates backup if target exists:
  - `src/data/reno/backups/<projectId>-<timestamp>.json`
- writes project file to `src/data/reno/<file>.json`
- inserts project entry into `projects-index.json` if missing
- runs `validate:data`

## 7. Editing and Persistence Behavior
Current persistence status:
- Sections add/edit/delete: persisted
- Section items add/delete + quick status updates: persisted
- Item overview/schedule/notes: persisted
- Item title/estimate/status/schedule/performers/notes: persisted
- Materials add/edit/remove: persisted
- Expenses add/edit/remove: persisted
- Lessons learned add/edit/link: persisted

All writes are currently implemented through server actions in:
- `src/lib/reno-actions.ts`
and committed through:
- `src/lib/reno-repository.ts`

## 8. Routing Model
- `/app` redirects to the default project from `projects-index.json`
- primary pages are under `/app/[projectId]/*`
- unknown catch-all app routes return 404

## 9. Known MVP Constraints
- JSON file persistence is ideal for local development and rapid iteration.
- For hosted production environments (for example Vercel serverless), filesystem writes are not a long-term persistence strategy.
- Auth baseline is still pending.

## 10. Planned Expansion to DB (Recommended Path)
Target stack for production:
- Vercel Postgres
- Prisma ORM + migrations
- App Router server actions / route handlers
- minimal single-tenant auth (JWT/httpOnly cookies)

### 10.1 Migration Strategy
1. Keep the current repository interface as the contract.
2. Add a `PrismaProjectRepository` implementing the same methods as `JsonProjectRepository`.
3. Switch binding from JSON repo to Prisma repo behind config/env.
4. Keep `validate:data` and importer as bootstrap/seed tools.
5. Add migrations for:
   - projects
   - sections
   - items
   - materials
   - expenses
   - notes

### 10.2 Suggested DB Mapping
- `projects` (id, name, address, phase, target_completion)
- `sections` (id, project_id, title, description)
- `items` (id, project_id, section_id, title, status, estimate, dates, description, note)
- `item_performers` (id, item_id, name)
- `materials` (id, item_id, name, quantity, estimated_price, note)
- `expenses` (id, item_id, date, amount, type, vendor, note)
- `notes` (id, project_id, title, content, linked_section_id nullable)

## 11. Suggested Next Steps
- Add auth baseline (password hash + signed httpOnly cookie + login throttling)
- Add test coverage for repository and server actions
- Add integration tests for key mutation flows (sections/items/materials/expenses/notes)
- Add export snapshot command (JSON backup by project)
- Introduce Prisma repository and environment switch

---
If you update project JSON manually, always run:

```bash
npm run validate:data
```

before running the app.
