# Finance Buddy

**Personal accounting, bank reconciliation, tax preparation, debt tracking, reporting, and AI-assisted financial analysis.**

> **Repository status:** V1 audit completed. V2 roadmap created. Production use is not yet approved.

## Version Status

| Item | Status |
|---|---|
| Current version | **Finance Buddy V1 — AI-Assisted Personal Accounting Prototype** |
| V1 audit date | **13 July 2026, 12:00 AM BDT** |
| Audited branch | `main` |
| Audited commit | `bbcf84741cbd5c05de5f7f078191ba0cc02bfa02` |
| Audit verdict | **CHANGES REQUIRED** |
| Production readiness | **Not production-ready** |
| Next version | **Finance Buddy V2 — Secure Accounting & Financial Intelligence** |
| Next active task | **V2-001 — Secure Runnable Foundation** |

The audit was based on repository code and configuration. Build, runtime, database migration, deployment, and end-to-end tests were **not executed**, so no unexecuted test is reported as passed.

---

## V1 Product Scope Found in the Repository

| Module | Code status | Audit note |
|---|---:|---|
| Authentication | ✅ Present | Supabase authentication and password recovery exist; preview login must be removed or strictly development-gated. |
| Dashboard | ✅ Present | Balance, income, expense, savings, receivable, and payable summaries are implemented. |
| Accounts | ✅ Present | Account creation, editing, deletion, balance calculation, and savings goals are present. |
| Transactions | ✅ Present | Income, expense, transfer, receivable, payable, manual entry, and AI extraction flows are present. |
| Categories and budgets | ✅ Present | Default/custom categories and category budget tracking are present. |
| Accounting views | ⚠️ Partial | Cash book, bank book, account ledger, income/expense statement, category summary, and outstanding reports exist; this is not yet a verified double-entry accounting engine. |
| Debt management | ⚠️ Partial | Debt calculations and UI exist, but debt details are currently stored in browser `localStorage`. |
| Bank reconciliation | ✅ Present | CSV parsing, AI document extraction, matching suggestions, adjustments, review, and reconciliation reports are present. |
| Tax preparation | ⚠️ Partial | Tax profile, configurable slabs, calculations, and records exist; legal/current tax accuracy has not been independently verified. |
| Reports | ✅ Present | Transaction filtering and financial reporting UI are present. |
| Currency tools | ✅ Present | External exchange-rate retrieval and currency conversion are present. |
| AI Adviser | ✅ Present | Deterministic alerts, Gemini analysis, chat, saved insights, and confirmation-based suggested actions are present. |
| System management | ⚠️ Partial | Backup, restore, audit log, and trash interfaces exist, but important authorization, durability, and schema gaps remain. |

---

## Technology Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Lucide React
- Motion

### Application Server

- Node.js
- Express
- Server-side Gemini integration through `@google/genai`
- Vite development middleware and production static serving

### Data and Authentication

- Supabase PostgreSQL
- Supabase Authentication
- Supabase Row Level Security policies
- Supabase Storage policy definitions

### Backup Utility

- Python backup and restore script using the Supabase REST API and service-role credentials

### Legacy/unused artifacts requiring cleanup

- Firebase configuration and Firestore blueprint/rules remain in the repository although the active application data layer is Supabase.
- Compiled Python `__pycache__` files are committed and should be removed.

---

# V1 Audit Verdict

## Overall Verdict: **CHANGES REQUIRED**

V1 contains a broad and useful functional prototype. However, authentication integration, authorization, database schema consistency, accounting integrity, backup durability, deployment configuration, and automated verification must be fixed before production use.

## Positive Findings

- Supabase queries generally scope user-owned records with `user_id`.
- The supplied migration enables Row Level Security for the main application tables.
- AI Adviser actions are designed around preview and explicit user confirmation rather than silent database changes.
- Manual transaction validation blocks zero/negative amounts and invalid transfers.
- Reconciliation includes duplicate detection, review, matching, and adjustment workflows.
- A Python unit-test file exists for backup, restore, rollback, and audit-log behavior.
- Environment templates do not contain the Supabase service-role secret itself.

## Critical Findings

### V1-C01 — Hardcoded preview credentials and fail-open authentication

- A preview username/password is hardcoded in frontend source.
- Server authentication bypasses token validation when Supabase environment values are absent.
- Production must fail closed. Preview access must never be enabled through a public hardcoded password.

### V1-C02 — System-management authorization is unsafe

- Backup, restore, and audit endpoints require authentication but do not enforce an administrator role.
- The backup/restore utility uses the Supabase service-role key and operates across complete tables.
- Any ordinary authenticated user must not be able to read all audit records or trigger a full-database restore.

### V1-C03 — Authenticated AI upload flows are broken in production configuration

- `/api/extract` and `/api/reconcile-extract` require a bearer token when Supabase is configured.
- The current receipt and reconciliation upload clients do not send the Supabase access token.
- These flows are expected to return `401 Unauthorized` in a properly configured production environment.

### V1-C04 — System Management does not retrieve the real Supabase token

- The System Management client checks only the preview session object for a token.
- A normal Supabase-authenticated user therefore does not send the required bearer token to backup/audit endpoints.

### V1-C05 — Code and database migration disagree on soft deletion

- Frontend data logic expects `is_deleted` columns for accounts, transactions, categories, and reconciliations.
- The supplied migration does not define those columns.
- Delete operations can fall back to permanent deletion, while Trash and Restore cannot reliably work as described.

### V1-C06 — Deployment port is hardcoded

- The Express server binds to port `3000` instead of reading `process.env.PORT`.
- This is a deployment blocker on platforms that assign the application port dynamically.

### V1-C07 — Backup and restore are not production-safe

- Backup files and audit logs are written to the application server's local filesystem, which may be ephemeral.
- Restore is a multi-step delete-and-reinsert process, not a true PostgreSQL transaction.
- The automatic rollback is best-effort and cannot guarantee atomic recovery.
- The restore command uses shell execution and must be replaced with argument-safe process execution.

### V1-C08 — Backup coverage is incomplete

The backup table list excludes important V1 data, including:

- Adviser conversations
- Adviser messages
- Adviser alerts
- Adviser insights
- Adviser summaries
- Debt details stored in `localStorage`
- Uploaded files and storage objects

## Major Findings

### V1-M01 — Double-entry accounting is not implemented

The current system derives debit/inflow and credit/outflow views from income, expense, and transfer records. It does not yet maintain balanced journal entries and journal lines where total debit equals total credit. Therefore, V1 must not be represented as a verified double-entry general ledger.

### V1-M02 — Database integrity constraints are limited

Important values are stored as unrestricted text or numeric fields without sufficient database checks, including transaction type, account type, status, date format, positive amount rules, and accounting-period controls.

### V1-M03 — Durable data storage is inconsistent

Debt details and currency preferences use browser storage while the rest of the application uses Supabase. Browser-only records are device-specific and are excluded from centralized backup and recovery.

### V1-M04 — Automated verification is insufficient

- No frontend unit-test framework is configured.
- No API integration tests are configured.
- No end-to-end browser tests are configured.
- No GitHub Actions CI workflow is present.
- `package.json` does not provide a standard `test` script.

### V1-M05 — Maintainability risk

Several files contain hundreds of lines and combine UI, database access, business calculations, and orchestration. Major examples include Finance Context, AI Adviser, reconciliation, accounting, and system management modules.

### V1-M06 — Security hardening is incomplete

The server currently lacks clear production configuration for:

- Role-based authorization
- Rate limiting
- Security headers
- Request-schema validation
- Upload MIME/type verification
- Per-route payload limits
- Cost controls for AI endpoints
- Redaction rules for sensitive audit values

### V1-M07 — Product metadata remains generic

- `package.json` still uses the name `react-example` and version `0.0.0`.
- `index.html` still uses the title `My Google AI Studio App`.
- README previously contained only AI Studio starter instructions.

---

## V1 Verification Checklist

| Check | Result |
|---|---:|
| Repository structure reviewed | ✅ PASS |
| Main application modules identified | ✅ PASS |
| Supabase migration statically reviewed | ✅ PASS |
| Authentication/data flow statically reviewed | ✅ PASS |
| `npm run lint` | ⚪ NOT EXECUTED |
| `npm run build` | ⚪ NOT EXECUTED |
| Python unit tests | ⚪ NOT EXECUTED |
| Supabase migration applied to a test project | ⚪ NOT EXECUTED |
| RLS behavior tested with multiple users | ⚪ NOT EXECUTED |
| AI receipt extraction runtime test | ⚪ NOT EXECUTED |
| AI bank-statement extraction runtime test | ⚪ NOT EXECUTED |
| Backup and restore against a test database | ⚪ NOT EXECUTED |
| End-to-end accounting workflow | ⚪ NOT EXECUTED |
| Production deployment | ⚪ NOT EXECUTED |
| Security/penetration testing | ⚪ NOT EXECUTED |

---

# Finance Buddy V2 — Secure Accounting & Financial Intelligence

## V2 Objective

Transform the V1 prototype into a secure, testable, deployable, and accounting-controlled application with a real double-entry ledger, durable data storage, verified bank reconciliation, explainable AI assistance, and evidence-based release gates.

## V2 Non-Negotiable Rules

1. No hardcoded credentials or production authentication bypass.
2. Server authentication must fail closed when required configuration is missing.
3. Destructive system actions must require an explicit administrator role.
4. Every accounting posting must produce balanced debit and credit journal lines.
5. No critical financial record may exist only in browser storage.
6. Backup scope must include every durable table and required storage object.
7. No feature is marked complete without implementation, tests, and evidence.
8. Complete one bounded V2 task before starting the next task.
9. README progress and test results must be updated after each completed task.

---

## Dated V2 Work Plan and Checklist

Dates below are planning dates, not evidence of completion. An item becomes complete only after its acceptance checks pass.

### 13 July 2026 — V2-001: Secure Runnable Foundation — **NEXT**

- [ ] Rename package metadata to Finance Buddy and set a real application version.
- [ ] Replace the generic HTML title and AI Studio starter metadata.
- [ ] Read the server port from `process.env.PORT` with a local fallback.
- [ ] Add startup validation for required production environment variables.
- [ ] Remove hardcoded preview credentials or gate preview mode behind an explicit development-only environment flag.
- [ ] Change backend authentication from fail-open to fail-closed in production.
- [ ] Create one shared frontend helper for retrieving the Supabase access token.
- [ ] Send valid bearer tokens from receipt extraction, reconciliation extraction, AI Adviser, and System Management.
- [ ] Add server-side administrator authorization for backup, restore, and complete audit-log access.
- [ ] Replace shell `exec` restore/backup commands with argument-safe process execution.
- [ ] Add security headers, rate limits, input validation, and route-specific upload limits.
- [ ] Add a production-safe health/readiness response.
- [ ] Run and record TypeScript, build, and targeted authentication tests.

**Completion gate:** Application builds, binds to the assigned port, rejects unauthorized requests, accepts valid authenticated requests, and blocks non-admin destructive system actions.

### 14 July 2026 — V2-002: Database Contract and Migration Repair

- [ ] Create an idempotent migration for `is_deleted`, deletion metadata, and recovery support.
- [ ] Add a durable `debt_details` table and migrate browser-only debt data.
- [ ] Move audit records to a durable database table with tenant/admin visibility rules.
- [ ] Add missing indexes for user, date, account, status, and reconciliation queries.
- [ ] Add database checks/enums for transaction type, positive amount, statuses, and required fields.
- [ ] Add safe migration version tracking.
- [ ] Remove or formally archive unused Firebase artifacts.
- [ ] Remove committed Python cache files and extend `.gitignore`.
- [ ] Test migrations from an empty database and from the V1 schema.

**Completion gate:** V1 data can migrate without loss; soft-delete/trash/restore works; all records are tenant-isolated through verified RLS.

### 15–16 July 2026 — V2-003: Real Double-Entry Accounting Core

- [ ] Define chart of accounts and account classifications.
- [ ] Add journal entry and journal line tables.
- [ ] Enforce total debit equals total credit before posting.
- [ ] Generate balanced postings for income, expense, transfer, receivable, payable, debt, tax, and adjustment events.
- [ ] Support draft, posted, reversed, and locked entry states.
- [ ] Add posting date, accounting period, source module, reference, and audit metadata.
- [ ] Build trial balance from journal lines.
- [ ] Rebuild account ledger, cash book, bank book, income statement, and balance sheet from posted entries.
- [ ] Add accounting-engine unit tests for every posting type and reversal.

**Completion gate:** Every posted transaction balances, trial balance totals agree, and statements reconcile to journal lines.

### 17 July 2026 — V2-004: Transaction and AI Import Reliability

- [ ] Add shared request/response schemas for manual and AI-assisted entries.
- [ ] Validate date, amount, account, category, MIME type, and file size on both client and server.
- [ ] Keep AI extraction as a draft requiring user review and confirmation.
- [ ] Add duplicate detection using reference, date, amount, account, and file fingerprint.
- [ ] Store uploaded document metadata and private storage paths.
- [ ] Add clear extraction confidence and unverified-field handling.
- [ ] Add receipt/PDF/image/CSV integration tests.

**Completion gate:** Invalid imports are rejected, valid imports remain reviewable, and confirmed entries produce balanced journal postings.

### 18 July 2026 — V2-005: Bank Reconciliation Engine

- [ ] Separate statement import, matching, adjustments, completion, and reporting services.
- [ ] Add exact, tolerance-based, date-window, one-to-many, and many-to-one matching rules.
- [ ] Prevent duplicate statement-row imports.
- [ ] Post approved bank charges, interest, and corrections through the journal engine.
- [ ] Lock completed reconciliations while preserving controlled reopening/version history.
- [ ] Add reconciliation evidence and regression tests.

**Completion gate:** Adjusted bank and ledger balances agree at zero difference with a complete audit trail.

### 19 July 2026 — V2-006: Tax, Debt, Reports, and Data Durability

- [ ] Version tax configurations by tax year and effective date.
- [ ] Require explicit disclosure that tax outputs are estimates until professionally reviewed.
- [ ] Verify tax formulas against an approved configuration dataset before release.
- [ ] Persist all debt schedules in Supabase.
- [ ] Add loan principal, interest, installment, maturity, payment history, and payoff projections.
- [ ] Add reliable PDF/CSV exports with report date, filters, and source metadata.
- [ ] Add report reconciliation checks against the accounting engine.

**Completion gate:** Tax/debt/report outputs are reproducible from durable records and traceable to source transactions and configuration versions.

### 20 July 2026 — V2-007: Backup, Restore, Audit, and Operations

- [ ] Store encrypted backups in durable external object storage.
- [ ] Include every application table and required private storage object.
- [ ] Make backup manifests versioned and checksum-verified.
- [ ] Restore only through an administrator-controlled maintenance workflow.
- [ ] Restore first into an isolated validation environment before production cutover.
- [ ] Add tenant-safe audit queries, retention, redaction, and export controls.
- [ ] Add scheduled backups through a real scheduler rather than a manually named “auto” endpoint.
- [ ] Perform and document a complete disaster-recovery rehearsal.

**Completion gate:** A verified backup can restore a complete test environment with matching record counts and checksums.

### 21 July 2026 — V2-008: Test, CI, Deployment, and Release Gate

- [ ] Add frontend unit tests.
- [ ] Add accounting-domain unit tests.
- [ ] Add Express API integration tests.
- [ ] Keep and repair Python backup tests or replace the utility with a tested server-side job.
- [ ] Add Supabase/RLS integration tests.
- [ ] Add end-to-end browser tests for the primary user workflow.
- [ ] Add GitHub Actions for install, type-check, unit tests, integration tests, and production build.
- [ ] Add deployment configuration and environment documentation.
- [ ] Verify health checks, logs, backup job, AI limits, and rollback procedure in staging.
- [ ] Publish a V2 release checklist with exact PASS/FAIL evidence.

**Completion gate:** CI is green, staging verification passes, critical findings are closed, and production release is explicitly approved.

---

## Next Active Task

### V2-001 — Secure Runnable Foundation

Only this task should be active next. No accounting-engine expansion or new feature should start before the V2-001 completion gate is met.

### Exact first implementation order

1. Fix application identity and deployment port.
2. Remove/gate hardcoded preview access.
3. Make backend authentication fail closed.
4. Add a shared Supabase bearer-token helper and repair all protected frontend API calls.
5. Add administrator authorization to backup, restore, and audit endpoints.
6. replace unsafe shell process execution.
7. Add request validation and security middleware.
8. Run type-check, build, and focused auth/API tests.
9. Update this README with changed files, commit, and exact PASS/FAIL evidence.

---

## Local Development

### Prerequisites

- Node.js
- npm
- Python 3 for the current V1 backup utility
- A Supabase project for database/authentication testing
- A Gemini API key for AI features

### Environment

Copy `.env.example` into a local environment file and configure:

```env
GEMINI_API_KEY=your_server_side_key
APP_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code or a public repository.

### Install and run

```bash
npm install
npm run dev
```

### Current repository checks

```bash
npm run lint
npm run build
python3 -m unittest test_system.py
```

These commands are documented but are **not marked as passed** until their outputs are captured and reviewed.

---

## Progress Log

### 13 July 2026 — V1 Repository Audit and V2 Planning

- [x] Repository structure and main modules reviewed.
- [x] V1 code-level strengths and gaps documented.
- [x] Critical production blockers identified.
- [x] V2 name, objective, dated roadmap, and completion gates created.
- [x] Next bounded task selected: `V2-001 — Secure Runnable Foundation`.
- [ ] V2 implementation started.
- [ ] V2-001 tests passed.

**V1 audit documentation:** 100% complete  
**V2 implementation:** 0% complete  
**Current next action:** Start V2-001 only.

---

## Important Disclaimer

Finance Buddy is currently a development-stage application. Financial, accounting, tax, AI-generated, and exchange-rate outputs must be reviewed before being relied upon. Tax outputs are estimates and are not legal or professional tax advice.