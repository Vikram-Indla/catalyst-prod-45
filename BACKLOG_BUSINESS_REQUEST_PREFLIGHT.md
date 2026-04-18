# Business Request Hierarchy Pre-Flight — for Lovable

> **Context:** Catalyst's backlog hierarchy extends one level ABOVE Jira's. Jira knows: Epic → Story → Subtask. Catalyst knows: **Business Request → Epic → Story → Subtask**. The Business Request (BR) layer is a Catalyst-native work-item type, separate from the MDT-prefixed Jira issues that earlier pre-flights investigated.
>
> We need to render BRs as the top-level rows in `/project-hub/:key/backlog`, with their linked Epics nested underneath (then Stories under Epics, and so on). The renderer already supports depth-based indent and expand/collapse; we just need the data model.
>
> **Scope reminder:** read-only. No schema changes. Paste back answers by section letter.

---

## A. business_requests table — full schema

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'business_requests'
ORDER BY ordinal_position;

SELECT count(*) FROM business_requests;
```

Sample 3 rows showing every column value:
```sql
SELECT * FROM business_requests ORDER BY created_at DESC LIMIT 3;
```

---

## B. How does a BR scope to a project?

What ties a Business Request to project `BAU`? Is there a `project_id` column on `business_requests`? Or is it a Catalyst project thing that spans projects? Please confirm:

```sql
-- Count BRs per project (whatever the joining column is)
SELECT project_id, count(*) FROM business_requests
GROUP BY project_id ORDER BY count(*) DESC LIMIT 10;

-- If business_requests has a project_key instead, use this:
SELECT project_key, count(*) FROM business_requests
GROUP BY project_key ORDER BY count(*) DESC LIMIT 10;
```

---

## C. How does an Epic link to its BR?

Three possible shapes — please report which one (if any) applies:

### C.1 Direct FK on Epic
```sql
-- ph_issues columns that look like BR pointers
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ph_issues'
  AND (column_name ILIKE '%business%' OR column_name ILIKE '%br_%' OR column_name ILIKE 'br_id' OR column_name ILIKE '%request_id%');

-- catalyst_issues version
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'catalyst_issues'
  AND (column_name ILIKE '%business%' OR column_name ILIKE '%br_%' OR column_name ILIKE 'br_id' OR column_name ILIKE '%request_id%');
```

### C.2 Join table
```sql
-- Tables that look like epic↔BR link tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND (
  table_name LIKE 'business_request_%' OR
  table_name LIKE 'br_%' OR
  table_name LIKE '%_business_requests%' OR
  table_name LIKE 'epic_business%'
)
ORDER BY table_name;

-- For each one found, please paste: column_name, data_type + 3 sample rows
```

### C.3 BR stores its own children
```sql
-- Columns on business_requests that reference ph_issues or catalyst_issues
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'business_requests'
  AND (column_name ILIKE '%epic%' OR column_name ILIKE '%issue%' OR column_name ILIKE '%jira%' OR column_name ILIKE '%child%');
```

---

## D. BR status / priority / assignee / owner

The BR row in the backlog needs the same columns we render for Epics/Stories:

```sql
-- Does business_requests have equivalents?
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'business_requests'
  AND (
    column_name ILIKE '%status%' OR
    column_name ILIKE '%priority%' OR
    column_name ILIKE '%assignee%' OR
    column_name ILIKE '%owner%' OR
    column_name ILIKE '%requester%' OR
    column_name ILIKE '%reporter%' OR
    column_name ILIKE '%due%' OR
    column_name ILIKE '%title%' OR
    column_name ILIKE '%name%' OR
    column_name ILIKE '%summary%' OR
    column_name ILIKE 'key' OR
    column_name ILIKE '%br_key%' OR
    column_name ILIKE '%request_key%'
  );
```

Then paste 3 complete BR rows in a table.

---

## E. Display key / prefix for BRs

Jira issues are keyed `BAU-5419`, `MDT-742`. Does `business_requests` have a display key/prefix? (e.g. `BR-0023`, `CAT-BR-0001`)

```sql
-- Find the best display column
SELECT
  column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'business_requests'
  AND (column_name LIKE '%key%' OR column_name LIKE '%display%' OR column_name LIKE '%number%' OR column_name LIKE '%code%');
```

Show 3 sample values.

---

## F. Counts per BAU project

How many BRs exist for the BAU project (assuming BR rows have a project scope)?

```sql
-- Adjust the join to whatever BAU's project_id is
SELECT count(*) as br_count_for_bau FROM business_requests br
JOIN projects p ON p.id = br.project_id
WHERE p.key = 'BAU';
```

And for each BAU BR, how many epics link to it?

```sql
-- Replace the <link> placeholder below based on answers to Section C
SELECT br.id, br.<key-or-title>, count(e.id) as epic_count
FROM business_requests br
LEFT JOIN <whatever_links_br_to_epic> link ON link.br_id = br.id
LEFT JOIN ph_issues e ON e.issue_key = link.epic_key AND e.issue_type = 'Epic'
GROUP BY br.id, br.<key-or-title>
ORDER BY epic_count DESC LIMIT 10;
```

---

## G. Is there a separate `ph_issue_type` for Business Request in ph_issues?

Earlier scan showed `BRD Task` and `Business Request` types exist on `ph_issues` with `project_key='MDT'`. Those are NOT the same as Catalyst's `business_requests` module, correct? Please confirm.

```sql
-- Is a Catalyst Business Request ever mirrored into ph_issues?
SELECT count(*) FROM ph_issues WHERE issue_type ILIKE '%business%request%' AND project_key != 'MDT';
```

---

## H. Summary question

Based on all of the above, please give a **one-paragraph plain-English description** of:

- Where I should fetch BRs for a given project
- How I should resolve the Epics that belong to a BR
- What fields are available on a BR row for display (key, title, status, priority, assignee, updated_at)
- Whether any of this wiring is blocked by missing columns / empty tables today

---

## Return format

Respond with the same letter headings (A, B, C.1, C.2, C.3, D, E, F, G, H). Paste query results verbatim as markdown tables. Do not propose schema changes.
