# Backlog Wiring Pre-Flight — for Lovable

> **Context for Lovable:** The unified Backlog page (`/project-hub/:key/backlog`) in Catalyst aggregates every work-item type for a project (Epics, Features, Stories, Tasks, QA Bugs, Production Incidents, Change Requests, Business Gaps, API Requirements). Some columns and filters can't be wired yet because the underlying Supabase schema hasn't been confirmed. **Please execute the checks below and return the answers verbatim.** Do not make schema changes — this is a read-only discovery pass.
>
> **Known facts (don't re-discover these):**
> - Jira-synced work items live in `ph_issues`.
> - Catalyst-native work items live in `catalyst_issues`.
> - Every epic's **parent** is a **business request ticket prefixed `MDT-*`** (Ministry of Industry). Please confirm where those MDT records live and how the foreign-key relationship is expressed.
> - Status / priority / assignee for epics already works via `ph_issues.status`, `ph_issues.priority`, `ph_issues.assignee_display_name`.
>
> **Return format:** answer each numbered question with (a) table + column names, (b) 2–3 sample values pulled with a `select ... limit 3`, (c) any gotchas (nullable, sparsely populated, legacy column, etc.). Please number your answers to match the questions.

---

## 1. Reporter

### What I need
The person who originally **reported** / created each issue. Appears in the filter drawer as an avatar grid (like Jira's Reporter filter).

### Questions
1.1. Does `ph_issues` have a reporter column? What's the name? (`reporter_id` / `reporter_display_name` / `reporter_account_id` / other?)
1.2. Does `catalyst_issues` have a reporter column? What's the name?
1.3. If reporter is stored as an ID, what table do we join to for the **display name** and **avatar URL**? (e.g. `profiles`, `users`, `ph_users`)
1.4. Sample: `select id, issue_key, <reporter_fields> from ph_issues limit 3` — paste the result.
1.5. Are reporters populated for all rows, or sparse? Rough percentage null?

---

## 2. Labels

### What I need
Zero-or-many user-assigned tags per issue. Appears in the filter drawer as a compact pill grid and will become an editable table column later.

### Questions
2.1. Does `ph_issues` have a labels column? Is it `text[]`, `jsonb`, or a join table (e.g. `ph_issue_labels`)?
2.2. Does `catalyst_issues` have a labels column? Same question.
2.3. If it's a join table, what are the column names and how is it keyed? (`issue_id` or `issue_key`?)
2.4. Sample: paste the `select ... limit 5` that pulls `issue_key + labels` for a project that has labels (BAU if possible).
2.5. Are labels free-text or do they come from a fixed vocabulary?

---

## 3. MDT-prefixed business request tickets (epic parents)

### What I need
Catalyst needs to show, in the Backlog hierarchy, the MDT-prefixed business request that an epic belongs to. Right now epics show their own row with no parent linkage above them.

### Questions
3.1. Where are MDT-prefixed business request tickets stored? Separate table (`business_requests`, `mdt_issues`, `mdt_tickets`)? Or are they rows in `ph_issues` with `issue_key LIKE 'MDT-%'`?
3.2. What field on an **epic** row points to its MDT parent? Is it `ph_issues.parent_key` (same column used for story→epic)? Or a separate `business_request_id` / `mdt_key` column?
3.3. Sample: paste the result of `select issue_key, issue_type, parent_key, <any-mdt-field> from ph_issues where issue_type = 'Epic' and project_key = 'BAU' limit 5`.
3.4. Is there a **separate MDT detail table** we should fetch from (e.g. BRD content, stakeholder, due date, status lifecycle)? If so, what's its table name and primary key?
3.5. Are ALL epics guaranteed to have an MDT parent, or can an epic exist without one?

---

## 4. Fix versions

### What I need
Fix versions are a Jira concept (e.g. "BAU - Sprint 4.0"). They appear in the filter drawer as pill chips. Right now Catalyst is (incorrectly) using the parent epic id as the filter key — that's a placeholder.

### Questions
4.1. Does `ph_issues` have a `fix_versions` column? Is it `text[]` or a join?
4.2. Is there a dedicated `ph_fix_versions` or `ph_versions` table?
4.3. Sample: paste the `select` that lists all distinct fix versions for the BAU project.
4.4. Does the concept exist at all in Catalyst's current Supabase schema, or is this purely a future-state field?

---

## 5. Priority values

### What I need
Confirm the canonical priority vocabulary so the filter's 5-icon row (Highest / High / Medium / Low / Lowest) maps correctly.

### Questions
5.1. Run `select distinct priority from ph_issues where project_key = 'BAU' and priority is not null`. Paste every value returned.
5.2. Run the same against `catalyst_issues` for the BAU project.
5.3. Are values stored in the original casing (e.g. `Highest`) or already lowercased? Are there any non-canonical values (e.g. `P1`, `Blocker`, `Trivial`)?

---

## 6. Work type taxonomy

### What I need
Confirm every issue_type value that appears in either table so the work-type chip list is complete.

### Questions
6.1. Run `select distinct issue_type, count(*) from ph_issues group by issue_type order by count desc`. Paste all rows.
6.2. Run the same against `catalyst_issues`.
6.3. Are there types used by one table but not the other? Any that map 1:1 despite different spellings (`QA Bug` vs `Bug`)?

---

## 7. Comments count

### What I need
The Backlog table has a Comments column. Currently some rows show a number, most show "Add comment". Verify where comment_count lives.

### Questions
7.1. Is `comment_count` a denormalised field on `ph_issues`? Confirm column name + type.
7.2. Is there a `ph_comments` or `catalyst_comments` table we'd need to count rows from?
7.3. Sample: paste `select issue_key, comment_count from ph_issues where comment_count > 0 limit 5`.

---

## 8. Due dates

### What I need
The filter drawer's Date range section has Start date + Due date. BacklogItem currently has no due date.

### Questions
8.1. Is `due_date` stored on `ph_issues`? What's its type? (The hook currently treats it as a date string.)
8.2. Is there a `start_date` field on `ph_issues`, or is start always implicit (createdAt)?
8.3. Does `catalyst_issues` have due_date / start_date?

---

## 9. Updated / Created timestamps for synthesized epic rows

### What I need
When BacklogPage synthesizes an epic row (because `useEpicBacklog`'s year-2026 filter excluded old BAU epics), it pulls status/priority/assignee from the enriched `epicMap` — please confirm that `jira_updated_at` and `jira_created_at` are indeed what we should surface for these synthesized rows.

### Questions
9.1. For old BAU epics (created 2024 or 2025), what are the values of `jira_updated_at` and `jira_created_at`? Are they always populated?
9.2. Is there any epic-specific `last_modified` that diverges from `jira_updated_at` (e.g. because Jira-sync touches timestamps)?

---

## 10. Assignee vs assignee_display_name

### What I need
The filter currently uses `assignee_display_name` (a string) as both the id and the name. That's fragile — two people with the same display name would merge.

### Questions
10.1. Is there an `assignee_id` column on `ph_issues`? What ID system? (Jira account ID, email, Supabase `user_id`?)
10.2. What table do we join to for a user's avatar URL?
10.3. Sample: `select distinct assignee_id, assignee_display_name from ph_issues where project_key = 'BAU' limit 10`.

---

## Return the answers in this format

Paste your response as a single markdown document with sections matching the numbering above. Example:

```
## 1. Reporter
1.1. `ph_issues.reporter_display_name` (text, nullable).
1.2. `catalyst_issues` — no reporter column. We'd need to add one.
1.3. No join needed — display name is denormalised on `ph_issues`. Avatar lookup goes through `profiles.avatar_url WHERE profiles.full_name = reporter_display_name`.
1.4. Sample rows:
     | id  | issue_key | reporter_display_name |
     | --- | --------- | --------------------- |
     | ... | BAU-5371  | Sara Alzahrani        |
     | ... | BAU-5414  | Nada alfassam         |
     | ... | BAU-5413  | menna nasser          |
1.5. ~95% populated on ph_issues; 0% on catalyst_issues.
```

That's all. Do not propose schema changes. Do not edit any files. Just report back what's there.
