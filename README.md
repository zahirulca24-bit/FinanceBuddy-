# Finance Buddy

**Personal accounting, bank reconciliation, tax preparation, debt tracking, reporting, and AI-assisted financial analysis.**

> **Repository status:** V2-001B was pushed and independently audited. **V2-001 is still not closed. Production use is not approved.**

## Version Status

| Item | Status |
|---|---|
| Current baseline | **Finance Buddy V1 — AI-Assisted Personal Accounting Prototype** |
| Target version | **Finance Buddy V2 — Secure Accounting & Financial Intelligence** |
| Branch | `main` |
| V2-001 implementation | `e252482274a99879cb4014774a3ff69a8c107e02` |
| V2-001A correction | `88bf20080951793ba85aedfbb291c2f2d239a493` |
| V2-001B correction | `f3dff33d34d71f3b12a886d0579f17d1a5fdf14a` |
| Audit date | **13 July 2026 BDT** |
| Verdict | **CHANGES REQUIRED** |
| Current active task | **V2-001C — Final Authentication and Test Closure** |
| V2-002 | **NOT STARTED** |

No test, build, preview, deployment, or runtime result is marked PASS without independently verifiable evidence.

---

## Controlled Delivery Workflow

1. Read the latest README and repository code.
2. Work only on the active bounded task.
3. Google AI Studio must not modify `README.md`.
4. Run lint, tests, build, Python tests, and preview checks.
5. Report exact commands, exit codes, PASS/FAIL/NOT EXECUTED results, and changed files.
6. Product Owner verifies preview and pushes.
7. ChatGPT audits the GitHub commit and updates README.
8. Do not start the next task until the active completion gate passes.

---

# V2-001B Post-Push Audit

## Audited commit

`f3dff33d34d71f3b12a886d0579f17d1a5fdf14a` — `V2-001B — Scope and Evidence Closure`

## Positive static findings

- `BudgetsView.tsx` and its route/navigation integration were removed.
- Registration/sign-up UI and logic were removed.
- Tracked Python cache files were removed.
- `.gitignore` now blocks `__pycache__` and compiled Python files.
- Real reusable environment helpers were added in `src/utils/env.ts`.
- Restore now rejects filenames that differ from `path.basename(filename)`.
- Server-controlled development preview sessions use random HttpOnly cookies with `SameSite=Strict`.
- V2-002 and double-entry accounting were not started.

## Blocking findings

### B01 — README was modified again

V2-001B explicitly required `README.md` to remain unchanged. The commit replaced the controlled roadmap with the generic AI Studio starter README. This documentation commit restores the project record.

### B02 — Literal hardcoded preview token string still exists

`server.ts` still contains a direct check for the literal `preview-token`. The implementation report stated that every occurrence had been removed, but repository code contradicts that claim. The literal and the special-case branch must be removed.

### B03 — Test environment initialization order remains unsafe

`src/server.test.ts` imports `app` from `server.ts` before assigning test environment variables. ESM imports are evaluated before ordinary statements, so environment-sensitive server constants can initialize before the test values. Test setup must occur before dynamically importing the server.

### B04 — Preview origin validation is missing

The preview-session endpoint creates a session without validating `Origin`. The approved security requirement explicitly required same-origin validation before issuing the development preview cookie.

### B05 — Safe exec test does not prove `execFile` was reached correctly

The “safe restore filename” test only asserts that the response is not `400`. A `500` response would still pass. The test must mock `execFile` and verify the exact executable and argument array.

### B06 — Test/build claims are not independently verifiable

The commit has no GitHub Actions workflow run or commit status. Exact command logs were not committed. Therefore the reported `30/30`, `4/4`, type-check, build, and preview results remain **NOT VERIFIED**.

## V2-001 Closure Checklist

- [x] Product identity and version updated.
- [x] Browser title updated.
- [x] Dynamic port implemented.
- [x] Production environment validation implemented.
- [x] Production authentication changed to fail closed.
- [x] Shared Supabase token helper implemented.
- [x] Protected API calls wired to shared authentication.
- [x] Administrator authorization implemented.
- [x] Unsafe shell interpolation replaced with `execFile`.
- [x] Helmet and endpoint rate limits added.
- [x] Health and readiness routes added.
- [x] Budgets feature additions removed.
- [x] Registration additions removed.
- [x] Python cache files removed and ignored.
- [x] Real environment helper module added.
- [ ] Remove every literal/special-case `preview-token` branch.
- [ ] Validate request origin before creating preview sessions.
- [ ] Move all environment setup before importing `server.ts` in tests.
- [ ] Mock and assert the exact `execFile` call for restore tests.
- [ ] Provide verifiable lint/test/build/Python evidence.
- [ ] Verify preview login and dashboard without fatal errors.
- [ ] Complete final independent audit.

**V2-001 completion gate: NOT PASSED.**

---

# Dated V2 Roadmap

## 13 July 2026 — V2-001C: Final Authentication and Test Closure — **ACTIVE**

- [ ] Preserve this README unchanged.
- [ ] Remove the literal `preview-token` branch from `server.ts`.
- [ ] Add strict same-origin validation to preview-session creation.
- [ ] Move test environment setup before dynamically importing the server.
- [ ] Mock `execFile` and assert exact safe restore arguments.
- [ ] Add tests for allowed and rejected preview origins.
- [ ] Run `npm run lint`, `npm run test`, `npm run build`, and Python tests.
- [ ] Verify login page, development preview login, and dashboard.
- [ ] Report exact command outputs and changed files.
- [ ] Push one correction-only commit.
- [ ] Complete independent audit and close V2-001.

**Completion gate:** No hardcoded preview token branch remains, preview session creation is same-origin protected, tests initialize correctly and prove safe process execution, required checks have verifiable evidence, README is preserved, and preview works.

## Queued UI Task — Login 40/60 Layout Refresh

The approved visual request is queued after V2-001 closes:

- Desktop: 40% authentication panel, 60% branded visual panel.
- Mobile: responsive single-column layout.
- Authentication behavior must remain unchanged.

## 14 July 2026 — V2-002: Database Contract and Migration Repair

- [ ] Add idempotent soft-delete and recovery migration.
- [ ] Add durable debt records.
- [ ] Move audit records to durable database storage.
- [ ] Add indexes and financial integrity constraints.
- [ ] Add migration version tracking.
- [ ] Remove or archive unused Firebase artifacts.
- [ ] Test empty and V1-to-V2 migrations.

**Completion gate:** V1 data migrates without loss; Trash/Restore works; RLS isolation passes.

## 15–16 July 2026 — V2-003: Real Double-Entry Accounting Core

- [ ] Define chart of accounts.
- [ ] Add journal entries and journal lines.
- [ ] Enforce equal debit and credit totals.
- [ ] Generate postings for all transaction types.
- [ ] Add trial balance and journal-derived statements.
- [ ] Add posting and reversal tests.

**Completion gate:** Every posting balances and statements reconcile to journal lines.

## 17 July 2026 — V2-004: Transaction and AI Import Reliability

- [ ] Add shared validation schemas.
- [ ] Validate dates, amounts, accounts, MIME types, and sizes.
- [ ] Keep AI output as a reviewed draft.
- [ ] Add duplicate detection and import tests.

## 18 July 2026 — V2-005: Bank Reconciliation Engine

- [ ] Separate import, matching, adjustment, completion, and reporting services.
- [ ] Add exact, tolerance, date-window, and grouped matching.
- [ ] Prevent duplicate imports and post approved adjustments through journals.

## 19 July 2026 — V2-006: Tax, Debt, Reports, and Durability

- [ ] Version tax configurations.
- [ ] Persist debt schedules.
- [ ] Add traceable exports and report reconciliation checks.

## 20 July 2026 — V2-007: Backup, Restore, Audit, and Operations

- [ ] Use durable encrypted object storage.
- [ ] Cover all tables/files with manifests and checksums.
- [ ] Add controlled restore and disaster-recovery rehearsal.

## 21 July 2026 — V2-008: Test, CI, Deployment, and Release Gate

- [ ] Add full frontend/API/RLS/E2E test coverage.
- [ ] Add GitHub Actions CI.
- [ ] Verify staging, monitoring, backups, and rollback.
- [ ] Publish exact release PASS/FAIL evidence.

---

## Current Next Action

Complete **V2-001C only**. Do not start V2-002 or the double-entry accounting engine.

## Disclaimer

Finance Buddy is a development-stage application. Financial, accounting, tax, AI-generated, and exchange-rate outputs must be reviewed before being relied upon.
