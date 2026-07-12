# Finance Buddy

**Personal accounting, bank reconciliation, tax preparation, debt tracking, reporting, and AI-assisted financial analysis.**

> **Repository status:** Finance Buddy V2 is under controlled development. V2-001 security work is not yet independently closed. The login-page visual redesign is tracked separately and does not replace the security completion gate.

## Version Status

| Item | Status |
|---|---|
| Current baseline | **Finance Buddy V1 — AI-Assisted Personal Accounting Prototype** |
| Target version | **Finance Buddy V2 — Secure Accounting & Financial Intelligence** |
| Branch | `main` |
| V2-001 implementation | `e252482274a99879cb4014774a3ff69a8c107e02` |
| V2-001A correction | `88bf20080951793ba85aedfbb291c2f2d239a493` |
| V2-001B scope closure attempt | `f3dff33d34d71f3b12a886d0579f17d1a5fdf14a` |
| Latest verified documentation commit before this update | `732421fa4b05298263982dbb0cf7114ff60e6297` |
| Audit date | **13 July 2026 BDT** |
| V2-001 verdict | **CHANGES REQUIRED** |
| Production readiness | **Not production-ready** |
| Current security task | **V2-001C — Final Authentication and Test Closure** |
| Current design task | **UI-LOGIN-001 — Right-Side Premium Visual Panel Refinement** |
| V2-002 | **NOT STARTED** |

No test, build, preview, deployment, or runtime result is marked PASS without verifiable evidence.

---

## Controlled Delivery Workflow

1. Read the latest README and current repository code.
2. Work only on the approved bounded task.
3. Do not replace this README with the AI Studio starter README.
4. Run lint, tests, build, Python tests, and preview checks.
5. Report exact changed files and PASS / FAIL / NOT EXECUTED results.
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

# UI-LOGIN-001 — Right-Side Premium Visual Panel Refinement

## Status

**DESIGN APPROVED — IMPLEMENTATION / PREVIEW CHECK PENDING**

## Locked Scope

> **Update ONLY the right-side 60% visual panel of the Finance Buddy login page.**

The left-side 40% login panel, authentication behavior, backend, database, and all other application pages are out of scope.

## Approved Layout

### Desktop

- Left panel: **40%** — existing login form, unchanged.
- Right panel: **60%** — premium corporate financial SaaS presentation.

### Tablet

- Preserve readable split layout.
- Reduce card density where needed.

### Mobile

- Preserve the existing mobile authentication flow.
- Hide the full visual panel or show only a compact branded section.
- No horizontal overflow.

## Right-Panel Design Requirements

- [ ] Use a brighter blue-to-indigo gradient instead of an excessively dark navy panel.
- [ ] Keep strong white and light-blue headline contrast.
- [ ] Use readable supporting text with stronger opacity and line height.
- [ ] Remove separate Income and Expense cards.
- [ ] Remove fake balance-dashboard styling.
- [ ] Replace metric cards with four feature-based blocks.
- [ ] Keep cards spacious, translucent, and clearly separated from the background.
- [ ] Add a readable security/trust line without unsupported encryption claims.
- [ ] Keep the design professional, corporate, and suitable for accounting software.

## Approved Feature Blocks

1. **Unified Account Management**  
   View and manage financial accounts from one organized workspace.

2. **Organized Transaction Records**  
   Record, review, and categorize financial activity with clarity.

3. **Accurate Bank Reconciliation**  
   Match statements with ledger records and identify differences efficiently.

4. **AI-Assisted Financial Guidance**  
   Receive clear insights based on financial data stored in the workspace.

## Design Restrictions

- [ ] Do not change the left-side login form.
- [ ] Do not change authentication logic.
- [ ] Do not modify backend routes.
- [ ] Do not modify Supabase configuration.
- [ ] Do not change preview-session security.
- [ ] Do not modify Dashboard, Sidebar, or any other page.
- [ ] Do not add fake financial statistics.
- [ ] Do not use neon colours or excessive glow.
- [ ] Do not replace this README.

## UI Completion Gate

The design task passes only when:

- [ ] Only the right-side 60% panel changed.
- [ ] Left-side login panel is visually and functionally unchanged.
- [ ] No Income or Expense mini-card remains.
- [ ] All right-panel text is clearly readable.
- [ ] Feature cards have sufficient contrast.
- [ ] Desktop, tablet, and mobile layouts have no clipping or horizontal overflow.
- [ ] `npm run lint` passes with evidence.
- [ ] `npm run test` passes with evidence.
- [ ] `npm run build` passes with evidence.
- [ ] Preview shows no blank page or fatal console error.
- [ ] GitHub commit is independently audited.

---

# Dated V2 Roadmap

## 13 July 2026 — V2-001C: Final Authentication and Test Closure — **ACTIVE BLOCKER**

- [ ] Remove remaining preview-token special-case code.
- [ ] Add preview endpoint Origin validation.
- [ ] Fix test import/environment initialization order.
- [ ] Strengthen restore `execFile` verification.
- [ ] Run and record all required checks.
- [ ] Complete independent audit and close V2-001.

## 13 July 2026 — UI-LOGIN-001: Premium Right Visual Panel — **DESIGN ACTIVE**

- [ ] Implement the approved right-side feature layout.
- [ ] Preserve the left login panel exactly.
- [ ] Run lint, test, build, and preview checks.
- [ ] Push only after Product Owner preview approval.
- [ ] Complete independent GitHub audit.

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

1. Complete **V2-001C** security/test closure.
2. Implement and preview **UI-LOGIN-001** without changing the left login panel.
3. Do not start V2-002 until V2-001 is independently closed.

## Disclaimer

Finance Buddy is a development-stage application. Financial, accounting, tax, AI-generated, and exchange-rate outputs must be reviewed before being relied upon.