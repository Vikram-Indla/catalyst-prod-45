# 03 — PLAN LOCK · F1 · Server SoD-check RPC (closes anchor 27's CLEAN/GUARDED/CONFLICT column)

> STATUS: **PROPOSED — awaiting Vikram. NO CODE until approved.** Target: `catalyst-staging` (the live target;
> `catalyst-prod` is a scope, not production). Migration: **yes, one** (F1a). PR-based (no direct push to main).

## Why this exists
5F (anchor 27) shipped **without** the per-assignment SoD column. That was deliberate (P5-D4): there is no SoD table,
no per-assignment field and no check RPC, so a fabricated "CLEAN" would assert a check that never ran. F1 closes it.

## 🔴 DISCOVERY THAT CHANGES THE DESIGN — read before deciding
The DB enforces **exactly four** SoD rules, extracted from `pg_proc` (verbatim):

| RPC | Rule text it raises |
|---|---|
| `strata_approve_record` | *segregation of duties: the creator cannot approve their own record* |
| `strata_attest_actual` | *segregation of duties: the submitter cannot attest their own actual* |
| `strata_validate_benefit_value` | *segregation of duties: the submitter cannot validate their own value record* |
| `strata_decide_gate` | *segregation of duties: the subject owner cannot decide their own gate* |

**Every one is RECORD-scoped, not ROLE-COMBINATION-scoped.** They compare the *actor* to *that record's*
creator/submitter/owner at the moment of action. The server has **no notion** of "this person's role set conflicts",
and `governanceApi.assignRole` **never refuses a combination**.

Consequence: anchor 27's column implies a role-combination verdict, but **for CONFLICT there is no server engine to
mirror**. Anchor 27 says "the UI mirrors the server role engine, never replaces it"; P5-D4 says "SoD stays DB-enforced,
no client SoD engine". Inventing a combination rule would violate both. So F1 splits.

## F1a — GUARDED/CLEAN · **mirrorable, no new policy** → RECOMMEND BUILD
An RPC that *projects the four existing rules* onto a person's role set. It invents nothing:
- **GUARDED** = the person holds roles on **both sides of one of the four real rules** — legal today, but that rule
  *will* bite them at action time. E.g. `kpi_owner` (submits actuals) + `vmo_validator` (attests actuals) ⇒ rule 2
  will refuse them on their *own* submissions.
- **CLEAN** = no such overlap; no rule can bite them.
- Returns the **rule text verbatim** so the rail quotes rather than paraphrases (anchor 27 requirement).
- Honest framing: GUARDED means *"a rule constrains you on your own records"*, NOT *"this combination is illegal"*.

**Migration:** one RPC, e.g. `strata_check_role_sod(p_user uuid)` → rows of `{role, verdict, rule}`. Read-only,
SECURITY DEFINER, no schema tables added. UI: fills 5F's column + the rail's COMBINED EFFECT, replacing today's
labelled deferral note.

## F1b — CONFLICT · **needs a PRODUCT DECISION — not mine to make** ⛔
CONFLICT means *"this combination is illegal and the assign form refuses it"* (anchor 27: "the assignment form will
refuse it with the rule quoted"). That requires a **new server policy**: `assignRole` must start rejecting role
combinations it currently permits.

**Vikram must decide:**
1. **Do we want assignment-time refusal at all?** Today SoD is enforced at *action* time, which is arguably stronger
   (it blocks the actual conflicted act, not the potential). Assignment-time refusal may be redundant.
2. **If yes — which combinations are illegal?** e.g. is `kpi_owner + vmo_validator` GUARDED (constrained, allowed) or
   CONFLICT (banned outright)? Today it is permitted and constrained.
3. **What happens to the existing assignments that would become illegal?** (Staging currently has a person holding 3
   roles.) Grandfather, or force-revoke?

**Until 1–3 are answered, CONFLICT cannot be built honestly.** Recommended: **ship F1a now** (closes most of the
column with zero invention), keep CONFLICT deferred and labelled, and treat F1b as its own slice once decided.

## Scope
- **Files:** new migration; `domain/index.ts` (+reader); `hooks/useStrata.tsx` (+hook); `StrataAccessPage.tsx`
  (column + rail); tests.
- **Forbidden:** `StrataStrategyMapPage.tsx` (HARD gate) · inventing any SoD rule not extracted from `pg_proc` ·
  weakening `assignRole`.
- **Gates:** tsc · lint:colors:gate · audit:ads:gate · lint:cre · `PATH=node@22 npm test` (STRATA suite).
- **Ledger:** `execute_sql` + explicit ledger INSERT (MCP `apply_migration` stamps its own version and breaks 1:1).
- **Stop conditions:** any rule not traceable to a `pg_proc` definition → stop and ask.

## Decisions needed
- **F1-D1:** Approve F1a (GUARDED/CLEAN projection of the four real rules)? → **Recommend YES.**
- **F1-D2:** F1b CONFIRM/CONFLICT policy — answer questions 1–3 above, or confirm CONFLICT stays deferred.
  → **Recommend DEFER** (action-time enforcement already covers the risk).
