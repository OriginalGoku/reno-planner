# MVP Deployment Readiness Tasks

This document defines the implementation tasks required to make the project ready for MVP deployment, with file-level scope and acceptance criteria.

## Phase 1: Auth + Session + Rate Limit Baseline

### 1) Add auth config + crypto utilities
- Scope:
  - `src/lib/auth/config.ts` (cookie names, expiry, env checks)
  - `src/lib/auth/password.ts` (bcrypt/argon2 hash + verify)
  - `src/lib/auth/session.ts` (jose sign/verify)
  - `src/lib/auth/rate-limit.ts` (in-memory/IP limiter for login; pluggable store)
  - `.env.example` (required auth vars)
- Acceptance criteria:
  - Password is never stored plaintext.
  - Session cookie is `HttpOnly`, `Secure` (prod), `SameSite=Lax`.
  - Login route enforces rate limit and returns `429` when exceeded.
  - Missing required auth envs fail safely with clear error.

### 2) Implement login/logout/session endpoints
- Scope:
  - `src/app/api/auth/login/route.ts`
  - `src/app/api/auth/logout/route.ts`
  - `src/app/api/auth/session/route.ts`
- Acceptance criteria:
  - Valid credentials create signed cookie session.
  - Logout clears cookie.
  - Session endpoint returns authenticated user state.
  - Invalid credentials never leak whether username exists.

### 3) Add route protection middleware/layout guard
- Scope:
  - `src/middleware.ts` (protect `/app/**`, `/api/files/**`, optional `/api/mcp/**`)
  - `src/app/app/layout.tsx` (server-side guard fallback/redirect)
- Acceptance criteria:
  - Unauthenticated requests are redirected or rejected consistently.
  - Authenticated requests access protected routes normally.
  - Public routes remain accessible.

## Phase 2: Protect Mutations + File Endpoints + Upload Constraints

### 4) Protect server actions and service mutations
- Scope:
  - `src/lib/reno-actions.ts` (server action auth gate)
  - `src/core/reno-service.ts` (optional actor/context check at service boundary)
- Acceptance criteria:
  - All mutating actions fail with auth error when unauthenticated.
  - Read-only pages/resources continue to work.
  - One central helper enforces auth for all actions.

### 5) Protect file upload/delete/download endpoints
- Scope:
  - `src/app/api/files/upload/route.ts`
  - `src/app/api/files/[attachmentId]/route.ts`
  - `src/app/api/files/[attachmentId]/download/route.ts`
- Acceptance criteria:
  - Upload/delete/download require valid session.
  - Unauthorized access returns `401/403`.
  - Existing authorized flows still work.

### 6) Add upload constraints with project settings-backed values
- Scope:
  - `src/lib/reno-types.ts` (project settings shape for upload limits)
  - `src/lib/reno-validation.ts` (validate limits/types)
  - `src/components/reno/project-settings-form.tsx` (edit limits + allowed MIME/extensions)
  - `src/core/reno-service.ts` (read project limits when validating upload)
  - `src/app/api/files/upload/route.ts` (enforce max size/type)
- Acceptance criteria:
  - Max file size and allowed types are configurable per project.
  - Upload rejects invalid size/type with clear error.
  - Settings changes take effect immediately for new uploads.

## Phase 3: Test Suite

### 7) Add test framework and scripts
- Scope:
  - `package.json` (`test`, `test:watch`, `test:coverage`)
  - `vitest.config.ts` (or Jest equivalent)
  - `tests/setup.ts`
- Acceptance criteria:
  - Test runner works locally and in CI.
  - Coverage report generated.

### 8) Unit tests for auth/session/rate-limit
- Scope:
  - `tests/auth/session.test.ts`
  - `tests/auth/password.test.ts`
  - `tests/auth/rate-limit.test.ts`
- Acceptance criteria:
  - Session signing/verification tested for valid/expired/tampered tokens.
  - Password hash/verify tested.
  - Rate limiter threshold/reset behavior tested.

### 9) Integration tests for protected APIs and uploads
- Scope:
  - `tests/api/auth.test.ts`
  - `tests/api/files.test.ts`
  - `tests/actions/mutations-auth.test.ts`
- Acceptance criteria:
  - Unauthorized calls fail.
  - Authorized calls succeed.
  - Upload constraints enforced by tests.

### 10) Regression tests for core MVP flows
- Scope:
  - `tests/reno/invoice-flow.test.ts`
  - `tests/reno/item-material-expense.test.ts`
- Acceptance criteria:
  - Invoice draft/update/confirm happy path covered.
  - Item/material/expense CRUD path covered.
  - No regressions in existing critical flows.

## Phase 4: Production Logging + Monitoring

### 11) Structured logging layer
- Scope:
  - `src/lib/observability/logger.ts` (JSON logs + levels + requestId)
  - Replace `console.log` hotspots in:
    - `src/core/invoice-extractor.ts`
    - `src/core/reno-service.ts`
    - `apps/mcp-server/server.mjs`
- Acceptance criteria:
  - Logs include `level`, `timestamp`, `requestId`, `component`, `event`.
  - Debug logs gated by env flag.
  - Sensitive fields (tokens/keys) are redacted.

### 12) Error monitoring integration
- Scope:
  - `src/lib/observability/monitoring.ts` (Sentry/OpenTelemetry wrapper)
  - `src/app/api/**` and server action wrappers (capture exceptions)
  - `apps/mcp-server/server.mjs` (capture uncaught tool errors)
- Acceptance criteria:
  - Unhandled exceptions are captured with context.
  - Error alerts usable in production.
  - Monitoring can be disabled in local dev.

### 13) Health/diagnostic endpoint
- Scope:
  - `src/app/api/health/route.ts`
- Acceptance criteria:
  - Returns service health + key dependency checks (repo access, storage access, env sanity).
  - Suitable for deployment probes.

## Definition of Done (Deployment Hardening)
- Auth/session/rate-limit implemented and enforced everywhere mutating/protected.
- File endpoints protected and upload constraints project-configurable.
- Test suite covers auth + core flows and passes in CI.
- Structured logs + error monitoring active in production mode.
- No secret leakage in logs/responses.
