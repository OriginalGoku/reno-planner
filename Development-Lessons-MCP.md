# Development Lessons: Reno Manager + MCP

## Purpose
Capture the key engineering lessons from building this app so the same approach can be reused in future projects, especially when exposing application capabilities through MCP.

## 1) Core Architecture Lessons

### 1.1 Keep a single business-logic layer
- We centralized core logic in `src/core/reno-service.ts`.
- UI server actions and MCP tools both call this same service layer.
- Result:
  - less duplicated logic,
  - consistent behavior across UI and LLM automation,
  - easier migration from JSON to DB later.

### 1.2 Separate responsibilities clearly
- `src/lib/reno-types.ts` -> domain contracts
- `src/lib/reno-validation.ts` -> runtime guardrails
- `src/lib/reno-repository.ts` -> persistence (JSON today)
- `src/core/reno-service.ts` -> business workflows
- `src/lib/reno-actions.ts` -> UI mutation adapters
- `apps/mcp-server/server.mjs` -> MCP transport + tool schemas

This layering made iterative changes manageable even as scope expanded.

### 1.3 Use JSON first, but design for replacement
- JSON-backed storage allowed rapid iteration.
- We kept data access through repository interfaces, which reduces rewrite cost for Postgres/Prisma migration.
- Rule adopted: no direct file I/O in UI; go through service/repository.

## 2) Data Modeling Lessons

### 2.1 Model relationships early
- Adding optional `unitId` on items was a strong design choice:
  - one item can belong to a section and optionally a unit,
  - no duplicated tasks,
  - supports multiple UI views (by section, by unit).

### 2.2 Preserve editability as first-class
- Every major entity eventually needed add/edit/delete:
  - sections, items, materials, notes, units, rooms, invoices.
- Lesson: if an entity is user-facing, assume full CRUD is needed.

### 2.3 Use canonical catalogs where possible
- Material catalog with category + canonical unit type reduced ambiguity.
- Better than free-text matching for long-term quality and automation.

## 3) MCP Lessons (Most Important)

### 3.1 Build MCP on top of service methods, not UI code
- MCP tools should call `reno-service` directly.
- Avoid coupling MCP behavior to route components or client-side state.

### 3.2 Tool design principles that worked
- Small, explicit tools with strict input schema.
- Deterministic names:
  - `reno_add_*`, `reno_update_*`, `reno_delete_*`, `reno_list_*`, `reno_get_*`.
- Return structured JSON payloads for machine use.

### 3.3 Add resource endpoints for context, not mutations
- MCP resources are useful for read context (`resource://project/...`, `resource://item/...`, etc.).
- Mutations should stay in tools.

### 3.4 Safe mode pattern is valuable
- `RENO_MCP_SAFE_MODE=1` + `confirm: true` requirement for destructive actions is a good default pattern.
- This should be reused in all future MCP servers.

### 3.5 Local stdio MCP is ideal for MVP
- Fastest path for Claude Desktop integration.
- Lower auth complexity than remote HTTP MCP.
- For production remote MCP later: use service tokens, not browser cookie auth.

## 4) UI + Navigation Lessons

### 4.1 Breadcrumb discipline matters
- Breadcrumbs must reflect meaningful hierarchy only.
- Removed noisy nodes (`Dashboard`, `Sections`, `Items`) when they didn’t add value.

### 4.2 Sidebars need clear defaults
- Default-collapsed project menu reduced visual overload.
- Grouping by floor and collapsibles improved unit navigation significantly.

### 4.3 Label every editable field
- Ambiguous forms slowed workflow.
- Explicit field labels and status/date semantics improved correctness.

## 5) Invoice + LLM Extraction Lessons

### 5.1 Human-in-the-loop is mandatory
- Extraction is draft-only, then user review/edit, then confirm/post.
- This avoided silent data corruption.

### 5.2 Keep immutable ledger entries
- Confirm step posts immutable `purchaseLedger` rows.
- Edits happen in draft; posted entries are append-only.

### 5.3 Multi-pass extraction is better than one-shot
- First pass (`gpt-5-nano`) + optional second pass (`gpt-5-mini`) improved recovery.
- Surface extraction metadata (`pass1`/`pass2`) in UI.
- Add manual “Force Second Pass” for operator control.

### 5.4 Logging is required for LLM debugging
- Raw parsed outputs and normalized summaries were essential to diagnose line-item misses.
- Persisting debug logs to file made troubleshooting reliable.

## 6) Operational Lessons

### 6.1 Keep real data private by default
- Mock JSON templates should be committed.
- Real project JSON and indexes must be ignored.
- Be aware: `.gitignore` does not remove already committed history.

### 6.2 Validate data continuously
- `npm run validate:data` should be part of routine checks.
- Runtime validation prevented many malformed JSON regressions.

### 6.3 Do not rely on build alone for confidence
- Lint + typecheck + data validation + MCP doctor gave stronger signal in this project.

## 7) Reusable Delivery Pattern for Future Projects

1. Define types and validation first.
2. Implement repository abstraction.
3. Implement service layer workflows.
4. Wire UI actions to service.
5. Wire MCP tools to same service.
6. Add resources for context.
7. Add safe mode for destructive tools.
8. Add debug logs and diagnostics.
9. Add tests for service + tool contracts.
10. Only then optimize UI polish.

## 8) Anti-Patterns to Avoid Next Time

- Duplicating business logic in UI and MCP separately.
- Letting raw routes mutate data without service-level invariants.
- Hiding extraction uncertainty from users.
- Using free-text material identities without canonical catalog.
- Delaying auth/rate-limit decisions until late deployment stage.

## 9) Immediate Next Improvements (From Current State)

- Implement auth/session/rate-limit baseline.
- Protect all mutating actions and file endpoints.
- Add configurable upload constraints in settings.
- Add test suite (unit + integration for critical flows).
- Add production-grade logging/monitoring hooks.

## 10) Summary

The strongest decision in this project was building around a shared service layer and treating MCP as a first-class automation interface from day one. That made expansion fast, reduced regressions, and created a reusable blueprint for future apps.
