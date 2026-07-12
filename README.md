# Finance Buddy

**Personal accounting, bank reconciliation, tax preparation, debt tracking, reporting, and AI-assisted financial analysis.**

> **Repository status:** V1 audit completed. V2-001 implementation was pushed and independently reviewed. **V2-001 requires corrections and is not closed. Production use is not approved.**

## Version Status

| Item | Status |
|---|---|
| Current product baseline | **Finance Buddy V1 — AI-Assisted Personal Accounting Prototype** |
| Target version | **Finance Buddy V2 — Secure Accounting & Financial Intelligence** |
| Audited branch | `main` |
| V1 source audit commit | `bbcf84741cbd5c05de5f7f078191ba0cc02bfa02` |
| V2-001 implementation commit | `e252482274a99879cb4014774a3ff69a8c107e02` |
| V2-001 post-push audit date | **13 July 2026** |
| V2-001 verdict | **CHANGES REQUIRED** |
| Production readiness | **Not production-ready** |
| Current active task | **V2-001A — Secure Runnable Foundation Correction** |
| V2-002 status | **NOT STARTED** |

No build, test, preview, migration, deployment, or runtime result is marked as independently passed without evidence.

---

## V2 Delivery Workflow

Finance Buddy V2 is developed one bounded task at a time.

| Role | Responsibility |
|---|---|
| Product Owner | Approves scope, checks preview, and authorizes GitHub push |
| ChatGPT | Audits repository state, defines the bounded task, verifies commits, and updates evidence-based status |
| Google AI Studio | Implements only the approved task, runs available checks, repairs preview errors, and reports exact evidence |
| GitHub `main` | Project source of truth after each approved push |

### Required Task Cycle

1. Read the latest `README.md` and current repository code.
2. Work only on the single active task.
3. Run type-check, build, tests, and preview checks.
4. Report exact changed files and exact PASS/FAIL/NOT EXECUTED results.
5. Product Owner verifies preview and pushes the approved change.
6. ChatGPT audits the resulting GitHub commit.
7. README is updated from verified evidence.
8. The next task starts only when the current completion gate passes.

### Evidence Rules

- Generated code is not automatically complete.
- Preview success does not replace build and test evidence.
- Failed or unexecuted checks must not be labelled as passed.
- Secrets, tokens, service-role keys, and passwords must never be committed.
- Scope, architecture, and accounting rules must not be silently changed.
- V2-002 must not start until V2-001 is closed.

---

# V1 Audit Summary

## Overall Verdict: **CHANGES REQUIRED**

V1 is a broad functional prototype, but security, authentication integration, database consistency, accounting integrity, backup durability, deployment configuration, and automated verification require repair before production use.

## V1 Product Scope Found

| Module | Code status | Audit note |
|---|---:|---|
| Authentication | Present | Supabase authentication and recovery exist |
| Dashboard | Present | Balance, income, expense, savings, receivable, and payable summaries exist |
| Accounts | Present | CRUD, balance calculations, and goals exist |
| Transactions | Present | Income, expense, transfer, receivable, payable, manual entry, and AI extraction exist |
| Categories and budgets | Present | Categories and budget tracking exist |
| Accounting views | Partial | Books exist, but there is no verified double-entry journal engine |
| Debt management | Partial | Debt data still includes browser-only persistence |
| Bank reconciliation | Present | CSV/AI import, review, matching, adjustments, and reports exist |
| Tax preparation | Partial | Tax work exists; current legal accuracy is not independently verified |
| Reports | Present | Filtering and reporting UI exist |
| Currency tools | Present | External rates and conversion exist |
| AI Adviser | Present | Rules, Gemini analysis, chat, insights, and safe-action preview exist |
| System management | Partial | Backup, restore, audit, and trash UI exist, but durability gaps remain |

## Key V1 Blockers

- No verified double-entry journal and journal-line engine.
- Application code and database migration disagree on soft deletion.
- Backup and audit data use local server storage.
- Restore is not an atomic PostgreSQL transaction.
- Debt data is not fully durable or centrally backed up.
- Database integrity constraints are insufficient for financial records.
- Frontend, API, RLS, and end-to-end verification are incomplete.
- Production release evidence and CI are absent.

---

# V2-001 Post-Push Audit

## Audited commit

`e252482274a99879cb4014774a3ff69a8c107e02` — `V2-001 — Secure Runnable Foundation`

## Static implementation results

| Requirement | Audit result | Evidence status |
|---|---:|---|
| Package identity and version | STATIC PASS | `finance-buddy`, `2.0.0-alpha.1` present |
| Browser title | STATIC PASS | `Finance Buddy` present |
| Dynamic deployment port | STATIC PASS | `process.env.PORT` with local fallback present |
| Production environment validation | STATIC PASS | Supabase production validation present |
| Production authentication fail-closed | STATIC PASS | Missing production auth config no longer bypasses authentication |
| Shared frontend auth helper | PARTIAL | Supabase session helper exists, but hardcoded preview bearer token remains |
| Protected frontend API headers | STATIC PASS | Receipt, reconciliation, adviser, audit, and backup clients use shared headers |
| Administrator authorization | STATIC PASS | Admin role/email checks protect full audit and backup/restore endpoints |
| Safe child-process execution | STATIC PASS | `execFile` replaces shell command interpolation |
| Security middleware | PARTIAL | Helmet and rate limits exist; validation and upload controls remain incomplete |
| Health/readiness endpoints | STATIC PASS | Safe status booleans are present |
| Focused test file | PRESENT | Nine tests are defined |
| Test execution evidence | NOT VERIFIED | No CI status or exact command log is attached to the commit |
| Preview evidence | NOT VERIFIED | No independently reviewed preview result is recorded |
| Scope discipline | FAIL | Unapproved Budgets, registration, and large context changes were included |
| README preservation | FAIL, THEN REPAIRED | AI Studio replaced the roadmap with starter README; this audit restored documentation |

## Blocking findings

### V2-001-B01 — Hardcoded preview bearer credential remains

`src/supabase.ts` returns `Authorization: Bearer preview-token` whenever a preview session object exists. This contradicts the approved requirement that no credential remain in frontend source. Preview mode must be redesigned without a reusable hardcoded client credential.

### V2-001-B02 — Test evidence is not independently verifiable

The repository has no CI run/status for the implementation commit. The pasted summary did not include exact command output. Therefore `npm run lint`, `npm run test`, `npm run build`, Python tests, and preview remain **NOT VERIFIED**.

### V2-001-B03 — Test environment setup order is unsafe

`src/server.test.ts` imports the server before assigning the test environment variables. Because static imports are evaluated before normal module statements, environment-sensitive server constants may be initialized before the test values are assigned. Test environment setup must occur before importing the server, using a setup file, dynamic import, or hoisted initialization.

### V2-001-B04 — Tests copy logic instead of exercising production functions

The PORT and production-environment tests duplicate local helper logic rather than testing exported production functions. These tests can pass even if the real implementation later diverges.

### V2-001-B05 — Approved scope was exceeded

The implementation commit added or substantially changed items outside V2-001, including:

- A new `BudgetsView` module and navigation integration.
- Registration/sign-up UI and behavior.
- Large unrelated changes in `FinanceContext` and `TaxContext`.

These changes must be separately audited and either reverted from V2-001 or explicitly approved under a later bounded task.

### V2-001-B06 — README regression

The implementation commit deleted the approved audit, roadmap, workflow, checklist, and progress log and restored the generic AI Studio starter README. This documentation commit restores the controlled project record.

## V2-001 Closure Checklist

- [x] Product name and version updated.
- [x] Browser title updated.
- [x] Dynamic port handling implemented.
- [x] Production environment validation implemented.
- [x] Production authentication changed to fail closed.
- [x] Shared Supabase session header helper introduced.
- [x] Protected frontend API calls wired to the helper.
- [x] Administrator authorization added.
- [x] Shell execution replaced with argument-safe process execution.
- [x] Helmet and endpoint rate limits added.
- [x] Health and readiness routes added.
- [ ] Remove the hardcoded frontend preview bearer token.
- [ ] Correct test environment initialization order.
- [ ] Test exported production PORT/environment functions rather than copied logic.
- [ ] Revert or separately approve unrelated feature/context changes.
- [ ] Provide exact `npm run lint` output.
- [ ] Provide exact `npm run test` output.
- [ ] Provide exact `npm run build` output.
- [ ] Provide Python-test output or mark it NOT EXECUTED.
- [ ] Verify preview without blank page or fatal runtime errors.
- [ ] Complete independent post-correction audit.

**V2-001 completion gate: NOT PASSED.**

---

# Dated V2 Work Plan

Planning dates are targets, not proof of completion.

## 13 July 2026 — V2-001A: Secure Runnable Foundation Correction — **ACTIVE**

- [ ] Remove hardcoded `preview-token` from frontend and backend design.
- [ ] Preserve development-only preview access without reusable credentials.
- [ ] Fix test environment initialization order.
- [ ] Export and directly test production configuration helpers.
- [ ] Revert or isolate unapproved Budgets/registration/context changes.
- [ ] Run lint, test, build, Python tests, and preview.
- [ ] Report exact evidence and changed files.
- [ ] Push one correction-only commit.
- [ ] Complete independent audit and close V2-001.

**Completion gate:** The app builds, binds to an assigned port, securely handles authenticated and admin requests, contains no hardcoded preview credential, stays inside approved scope, and has verified test/preview evidence.

## 14 July 2026 — V2-002: Database Contract and Migration Repair

- [ ] Add idempotent soft-delete and recovery migration.
- [ ] Add durable debt records.
- [ ] Move audit records to durable database storage.
- [ ] Add indexes and integrity constraints.
- [ ] Add migration version tracking.
- [ ] Remove or archive unused Firebase artifacts.
- [ ] Remove committed cache files.
- [ ] Test empty and V1-to-V2 migrations.

**Completion gate:** V1 data migrates without loss; Trash/Restore works; RLS isolation passes.

## 15–16 July 2026 — V2-003: Real Double-Entry Accounting Core

- [ ] Define chart of accounts.
- [ ] Add journal entry and journal line tables.
- [ ] Enforce equal debit and credit totals.
- [ ] Generate postings for all transaction types.
- [ ] Support draft, posted, reversed, and locked states.
- [ ] Add accounting periods and posting metadata.
- [ ] Build trial balance and statements from journal lines.
- [ ] Add posting and reversal tests.

**Completion gate:** Every posting balances and statements reconcile to journal lines.

## 17 July 2026 — V2-004: Transaction and AI Import Reliability

- [ ] Add shared schemas and validation.
- [ ] Validate dates, amounts, accounts, MIME types, and file sizes.
- [ ] Keep AI output as a user-reviewed draft.
- [ ] Add robust duplicate detection.
- [ ] Store document metadata and private storage paths.
- [ ] Add confidence and unverified-field controls.
- [ ] Add import integration tests.

**Completion gate:** Invalid imports are rejected and confirmed imports create balanced postings.

## 18 July 2026 — V2-005: Bank Reconciliation Engine

- [ ] Separate import, matching, adjustment, completion, and reporting services.
- [ ] Add exact, tolerance, date-window, one-to-many, and many-to-one matching.
- [ ] Prevent duplicate statement imports.
- [ ] Post approved adjustments through the journal engine.
- [ ] Lock completed reconciliations with controlled reopening history.
- [ ] Add regression tests.

**Completion gate:** Adjusted bank and ledger balances agree at zero difference.

## 19 July 2026 — V2-006: Tax, Debt, Reports, and Data Durability

- [ ] Version tax rules by year and effective date.
- [ ] Keep tax outputs labelled as estimates.
- [ ] Verify tax formulas against approved test data.
- [ ] Persist debt schedules in Supabase.
- [ ] Add loan, payment, and payoff schedules.
- [ ] Add traceable PDF/CSV exports.
- [ ] Reconcile reports to the accounting engine.

**Completion gate:** Outputs are reproducible and traceable to durable source records.

## 20 July 2026 — V2-007: Backup, Restore, Audit, and Operations

- [ ] Store encrypted backups in durable object storage.
- [ ] Cover all tables and required files.
- [ ] Add versioned manifests and checksums.
- [ ] Restrict restore to an admin maintenance workflow.
- [ ] Validate restore before production cutover.
- [ ] Add audit retention, redaction, and export controls.
- [ ] Add a real scheduled backup job.
- [ ] Complete a disaster-recovery rehearsal.

**Completion gate:** A verified backup restores a complete test environment with matching counts and checksums.

## 21 July 2026 — V2-008: Test, CI, Deployment, and Release Gate

- [ ] Add frontend and accounting-domain tests.
- [ ] Add API integration tests.
- [ ] Add Supabase/RLS tests.
- [ ] Add end-to-end browser tests.
- [ ] Add GitHub Actions CI.
- [ ] Add deployment and environment documentation.
- [ ] Verify staging health, logs, AI limits, backup, and rollback.
- [ ] Publish exact release PASS/FAIL evidence.

**Completion gate:** CI and staging verification pass and production release is explicitly approved.

---

## Current Next Action

Complete **V2-001A only**. Do not start V2-002 or the double-entry accounting engine.

## Important Disclaimer

Finance Buddy is a development-stage application. Financial, accounting, tax, AI-generated, and exchange-rate outputs must be reviewed before being relied upon. Tax outputs are estimates and are not legal or professional tax advice.
