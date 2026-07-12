# Finance Buddy

**Personal accounting, bank reconciliation, tax preparation, debt tracking, reporting, and AI-assisted financial analysis.**

> **Repository status:** Finance Buddy V2 is under controlled development. V2-001 security work remains open. The login-page visual redesign was pushed and audited, but its scope gate did not pass.

## Version Status

| Item | Status |
|---|---|
| Current baseline | **Finance Buddy V1 — AI-Assisted Personal Accounting Prototype** |
| Target version | **Finance Buddy V2 — Secure Accounting & Financial Intelligence** |
| Branch | `main` |
| V2-001 implementation | `e252482274a99879cb4014774a3ff69a8c107e02` |
| V2-001A correction | `88bf20080951793ba85aedfbb291c2f2d239a493` |
| V2-001B attempt | `f3dff33d34d71f3b12a886d0579f17d1a5fdf14a` |
| UI-LOGIN-001 implementation | `2a784975c7c871b9df9174ef6b2fcd7c3f7e1196` |
| Audit date | **13 July 2026 BDT** |
| V2-001 verdict | **CHANGES REQUIRED** |
| UI-LOGIN-001 verdict | **CHANGES REQUIRED** |
| Production readiness | **Not production-ready** |
| Current security task | **V2-001C — Final Authentication and Test Closure** |
| Current design task | **UI-LOGIN-001A — Scope Correction and Visual Verification** |
| V2-002 | **NOT STARTED** |

No test, build, preview, deployment, or runtime result is marked PASS without independently verifiable evidence.

---

## Controlled Delivery Workflow

1. Read the latest README and current repository code.
2. Work only on the approved bounded task.
3. Do not replace this README with the Google AI Studio starter README.
4. Run lint, tests, build, Python tests, and preview checks.
5. Report exact changed files and exact PASS / FAIL / NOT EXECUTED results.
6. Product Owner verifies preview and authorizes GitHub push.
7. ChatGPT audits the pushed commit and updates this README.
8. Do not start V2-002 until V2-001 is independently closed.

---

# V2-001 Security Foundation Status

## Completed Static Changes

- [x] Finance Buddy package identity and browser title.
- [x] Dynamic `process.env.PORT` support.
- [x] Production Supabase configuration validation.
- [x] Fail-closed production authentication design.
- [x] Shared Supabase bearer-header helper.
- [x] Protected frontend API authentication headers.
- [x] Administrator authorization for backup, restore, and full audit access.
- [x] Argument-safe `execFile` process execution.
- [x] Helmet and route rate limits.
- [x] Health and readiness routes.
- [x] Out-of-scope Budgets page removed.
- [x] Registration/sign-up flow removed.
- [x] Tracked Python cache files removed and ignored.

## Remaining V2-001C Blockers

- [ ] Remove every remaining literal or special-case reference to `preview-token` from production code.
- [ ] Validate `Origin` for the preview-session creation endpoint.
- [ ] Initialize test environment before importing environment-sensitive server modules.
- [ ] Make restore tests verify the actual safe `execFile` command and arguments.
- [ ] Add independently verifiable lint, test, build, and Python-test evidence.
- [ ] Verify preview login, dashboard load, protected API access, and production preview-mode rejection.
- [ ] Preserve README during AI Studio changes.
- [ ] Complete final independent audit.

**V2-001 completion gate: NOT PASSED.**

---

# UI-LOGIN-001 — Premium Right-Side Login Panel

## Approved Scope

> **Update ONLY the right-side 60% visual panel of the Finance Buddy login page.**

The left-side 40% login panel, authentication behavior, backend, database, Dashboard, Reports, Sidebar, and all other application pages are out of scope.

## Approved Design

### Desktop

- Left panel: **40%** — existing login form, unchanged.
- Right panel: **60%** — premium corporate financial SaaS presentation.

### Right-Panel Requirements

- [x] Brighter blue-to-indigo visual direction implemented in preview.
- [x] Separate Income and Expense mini-cards removed from the approved design direction.
- [x] Feature-based presentation used instead of a fake financial dashboard.
- [x] Four feature areas planned: account management, transactions, reconciliation, and AI guidance.
- [ ] Confirm every right-panel text element has sufficient contrast.
- [ ] Confirm tablet and mobile layouts have no clipping or horizontal overflow.
- [ ] Confirm left-side login panel is visually and functionally unchanged.
- [ ] Confirm no unrelated code remains in the implementation commit.

## Post-Push Audit — Commit `2a784975c7c871b9df9174ef6b2fcd7c3f7e1196`

### Positive Findings

- [x] Login-page visual panel was updated.
- [x] The new presentation removes the previous dense Income/Expense dashboard styling.
- [x] The right panel now uses a feature-led corporate SaaS direction.

### Blocking Findings

- [ ] `README.md` was replaced again with the generic Google AI Studio starter README.
- [ ] `DashboardView.tsx` was modified although only the login right panel was approved.
- [ ] `ReportsView.tsx` was modified although only the login right panel was approved.
- [ ] `package.json` and `package-lock.json` were modified and `recharts` was added.
- [ ] The implementation was not limited to `AuthView.tsx` or another isolated login-panel component.
- [ ] No GitHub Actions or other independently verifiable lint/test/build evidence is attached.

**UI-LOGIN-001 completion gate: NOT PASSED.**

---

# UI-LOGIN-001A — Scope Correction and Visual Verification

## Active Checklist

- [ ] Preserve the approved right-side design visible in preview.
- [ ] Revert all unrelated `DashboardView.tsx` changes from commit `2a784975...`.
- [ ] Revert all unrelated `ReportsView.tsx` changes from commit `2a784975...`.
- [ ] Remove `recharts` if it is not strictly required by the login right panel.
- [ ] Revert unrelated `package.json` and `package-lock.json` changes.
- [ ] Keep the left-side 40% login panel unchanged.
- [ ] Keep authentication logic unchanged.
- [ ] Keep backend and database code unchanged.
- [ ] Preserve this README exactly.
- [ ] Run `npm run lint` and record exact output.
- [ ] Run `npm run test` and record exact output.
- [ ] Run `npm run build` and record exact output.
- [ ] Verify desktop, tablet, and mobile preview.
- [ ] Push one correction-only commit.
- [ ] Complete independent GitHub audit.

**Completion gate:** Only the right-side 60% login visual panel remains changed; all unrelated files are reverted; required checks pass with evidence; preview remains visually correct.

---

# Dated V2 Roadmap

## 13 July 2026 — V2-001C: Final Authentication and Test Closure — **ACTIVE BLOCKER**

- [ ] Remove remaining `preview-token` special-case code.
- [ ] Add preview endpoint Origin validation.
- [ ] Fix test import/environment initialization order.
- [ ] Strengthen restore `execFile` verification.
- [ ] Run and record all required checks.
- [ ] Complete independent audit and close V2-001.

## 13 July 2026 — UI-LOGIN-001A: Login Panel Scope Correction — **ACTIVE**

- [ ] Revert unrelated Dashboard and Reports changes.
- [ ] Remove unnecessary dependency changes.
- [ ] Preserve only the right-side login visual redesign.
- [ ] Run lint, test, build, and preview checks.
- [ ] Complete independent audit.

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
- [ ] Cover all tables and files with manifests and checksums.
- [ ] Add controlled restore and disaster-recovery rehearsal.

## 21 July 2026 — V2-008: Test, CI, Deployment, and Release Gate

- [ ] Add frontend, API, RLS, and end-to-end test coverage.
- [ ] Add GitHub Actions CI.
- [ ] Verify staging, monitoring, backups, and rollback.
- [ ] Publish exact release PASS / FAIL evidence.

---

## Current Next Actions

1. Complete **V2-001C** security and test closure.
2. Complete **UI-LOGIN-001A** without changing Dashboard, Reports, backend, or authentication logic.
3. Do not start V2-002 until V2-001 is independently closed.

## Disclaimer

Finance Buddy is a development-stage application. Financial, accounting, tax, AI-generated, and exchange-rate outputs must be reviewed before being relied upon.
