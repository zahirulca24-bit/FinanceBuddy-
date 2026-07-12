# Finance Buddy

**Personal accounting, bank reconciliation, tax preparation, debt tracking, reporting, and AI-assisted financial analysis.**

> **Repository status:** V2-001A correction was pushed and audited. **V2-001 is still not closed. Production use is not approved.**

## Version Status

| Item | Status |
|---|---|
| Current baseline | **Finance Buddy V1 — AI-Assisted Personal Accounting Prototype** |
| Target version | **Finance Buddy V2 — Secure Accounting & Financial Intelligence** |
| Branch | `main` |
| V2-001 implementation | `e252482274a99879cb4014774a3ff69a8c107e02` |
| V2-001A correction | `88bf20080951793ba85aedfbb291c2f2d239a493` |
| Audit date | **13 July 2026 BDT** |
| Verdict | **CHANGES REQUIRED** |
| Current active task | **V2-001B — Scope and Evidence Closure** |
| V2-002 | **NOT STARTED** |

No test, build, preview, deployment, or runtime result is marked PASS without verifiable evidence.

---

## Controlled Delivery Workflow

1. Read the latest README and repository code.
2. Work only on the active bounded task.
3. Do not modify README from Google AI Studio unless explicitly instructed.
4. Run lint, tests, build, Python tests, and preview checks.
5. Report exact changed files and exact PASS/FAIL/NOT EXECUTED output.
6. Product Owner verifies preview and pushes.
7. ChatGPT audits the GitHub commit and updates README.
8. Do not start the next task until the active completion gate passes.

---

# V2-001 / V2-001A Audit

## Positive static findings

- Package identity and application version are set.
- Browser title is Finance Buddy.
- Express reads `process.env.PORT` with a local fallback.
- Production Supabase configuration validation exists.
- Production authentication is designed to fail closed.
- Shared Supabase bearer-header support exists.
- Protected frontend API calls use the shared authentication path.
- Admin role/email checks protect backup, restore, and full-audit endpoints.
- Shell command interpolation was replaced with argument-safe child-process execution.
- Helmet, endpoint rate limits, health, and readiness routes exist.
- The literal `preview-token` no longer appears in repository search.
- V2-001A introduced server-side development preview-session handling rather than a reusable frontend bearer token.

## Blocking findings after V2-001A

### B01 — README was modified again

V2-001A explicitly required `README.md` to remain untouched, but the commit replaced the controlled audit and roadmap with the generic AI Studio starter README. This documentation commit restores the controlled project record.

### B02 — Approved scope cleanup was not completed

The V2-001A commit did not remove the previously added out-of-scope `BudgetsView`. Registration/sign-up and large context changes also remain or were further modified. V2-001 cannot close until these changes are reverted to the approved baseline or separately approved under a later bounded task.

### B03 — Unrelated generated files were committed

Compiled Python files under `__pycache__/` were modified. Generated cache files must be removed from Git tracking and ignored.

### B04 — Test and build execution remain unverified

The implementation commit has no GitHub Actions workflow run or commit status. Exact console output for `npm run lint`, `npm run test`, `npm run build`, and Python tests was not attached to the commit. Preview success is also not independently recorded.

### B05 — Scope changed files remain broad

V2-001A still changed Sidebar, FinanceContext, AuthView, and other product-facing files beyond the minimum authentication correction. These changes require baseline comparison and exact justification.

## V2-001 Closure Checklist

- [x] Product identity and version updated.
- [x] Browser title updated.
- [x] Dynamic port implemented.
- [x] Production environment validation implemented.
- [x] Production authentication changed to fail closed.
- [x] Shared Supabase token helper implemented.
- [x] Protected API calls wired to shared authentication.
- [x] Administrator authorization implemented.
- [x] Unsafe shell execution replaced.
- [x] Helmet and endpoint rate limits added.
- [x] Health and readiness routes added.
- [x] Hardcoded `preview-token` removed.
- [x] Development preview moved toward server-side cookie/session handling.
- [ ] Restore exact V2-001 scope against baseline commit `f78021ce661d47a282c4c2ae6ad2016237048478`.
- [ ] Remove out-of-scope Budgets and registration additions.
- [ ] Revert unrelated FinanceContext, TaxContext, Sidebar, and product-flow changes.
- [ ] Remove tracked `__pycache__` files and update `.gitignore`.
- [ ] Verify tests exercise real exported production helpers.
- [ ] Provide exact lint/test/build/Python output.
- [ ] Verify preview login and dashboard without fatal errors.
- [ ] Complete final independent audit.

**V2-001 completion gate: NOT PASSED.**

---

# Dated V2 Roadmap

## 13 July 2026 — V2-001B: Scope and Evidence Closure — **ACTIVE**

- [ ] Preserve this README unchanged during AI Studio implementation.
- [ ] Compare current code against baseline commit `f78021ce661d47a282c4c2ae6ad2016237048478`.
- [ ] Keep only approved V2-001 security/deployment/test changes.
- [ ] Remove BudgetsView and all new budget navigation added after the baseline.
- [ ] Remove registration/sign-up additions introduced after the baseline.
- [ ] Revert unrelated FinanceContext, TaxContext, Sidebar, and feature changes.
- [ ] Remove tracked Python cache files and ignore `__pycache__/` and `*.pyc`.
- [ ] Run `npm run lint`, `npm run test`, `npm run build`, and Python tests.
- [ ] Verify preview login and dashboard.
- [ ] Report exact outputs and changed files.
- [ ] Push one correction-only commit.
- [ ] Complete independent audit and close V2-001.

**Completion gate:** Only approved V2-001 changes remain, README is preserved, generated caches are removed, required checks pass with evidence, and preview works.

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

Complete **V2-001B only**. Do not start V2-002 or the double-entry accounting engine.

## Disclaimer

Finance Buddy is a development-stage application. Financial, accounting, tax, AI-generated, and exchange-rate outputs must be reviewed before being relied upon.