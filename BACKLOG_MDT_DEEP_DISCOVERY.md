# Backlog — Deep MDT Discovery (Follow-up Pre-Flight)

> **Context:** The earlier pre-flight reported that 0 BAU epics have MDT links in `ph_issue_links`. Vikram pushed back — in the actual Jira project `BAU`, epics DO have business requests above them. That tells us the data exists somewhere; we just haven't found it. This follow-up asks you to scan **every table and every column** that could carry an epic→MDT relationship. Please be exhaustive — we do not know the schema shape.
>
> **Scope reminder:** read-only. No schema edits. Return answers in the numbered format below.

---

## A. Every table that could link epics to business requests

Please run this query and paste the full result:

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name ILIKE '%brd%' OR
    column_name ILIKE '%business_request%' OR
    column_name ILIKE '%business%req%' OR
    column_name ILIKE '%mdt%' OR
    column_name ILIKE '%initiative%' OR
    column_name ILIKE '%parent_brd%' OR
    column_name ILIKE '%requirement_id%' OR
    column_name ILIKE '%program_id%'
  )
ORDER BY table_name, column_name;
```

Also list every table whose name hints at MDT / BRD / business-request linkage:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name ILIKE '%brd%' OR
    table_name ILIKE '%business%' OR
    table_name ILIKE '%mdt%' OR
    table_name ILIKE '%initiative%' OR
    table_name ILIKE '%parent%'
  )
ORDER BY table_name;
```

---

## B. Inspect `ph_issues.custom_fields` if it exists

Jira often stores epic→Initiative links in a custom field. Please check:

```sql
-- Does the column exist?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ph_issues'
  AND column_name IN ('custom_fields', 'custom_field_values', 'jira_custom_fields', 'fields', 'extra');

-- If it does, show 3 BAU epics' custom fields so we can scan for MDT-shaped values
SELECT issue_key, custom_fields
FROM ph_issues
WHERE project_key = 'BAU'
  AND issue_type = 'Epic'
  AND custom_fields IS NOT NULL
LIMIT 3;
```

---

## C. The `business_requests` Catalyst table — does it link to anything?

The earlier pass noted `business_requests` has 0 MDT-* rows. But the table still exists for a reason. Please:

```sql
-- Describe the schema
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'business_requests'
ORDER BY ordinal_position;

-- Sample 3 rows showing every column
SELECT * FROM business_requests LIMIT 3;

-- Does any FK point from business_requests to ph_issues?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'business_requests'
  AND (
    column_name ILIKE '%epic%' OR
    column_name ILIKE '%issue%' OR
    column_name ILIKE '%ph_%' OR
    column_name ILIKE '%jira%'
  );
```

---

## D. `brd_documents` — mentioned in CLAUDE.md

CLAUDE.md §16 mentions a `brd_documents` table for the RAG pipeline. It may or may not relate to list-view display, but please check:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'brd_documents'
ORDER BY ordinal_position;

-- Any field linking a BRD to an epic or issue_key?
SELECT column_name FROM information_schema.columns
WHERE table_name = 'brd_documents'
  AND (column_name ILIKE '%epic%' OR column_name ILIKE '%issue%' OR column_name ILIKE '%issue_key%' OR column_name ILIKE '%project%');
```

---

## E. Other Jira link types between BAU and MDT

Earlier pass filtered `link_type IN ('BRD','is BRD of')`. Please widen the scan:

```sql
-- Every link type that exists between BAU and MDT
SELECT link_type, COUNT(*) AS n
FROM ph_issue_links
WHERE (source_id LIKE 'BAU-%' AND target_id LIKE 'MDT-%')
   OR (source_id LIKE 'MDT-%' AND target_id LIKE 'BAU-%')
GROUP BY link_type
ORDER BY n DESC;

-- Sample 5 link rows (any link type) where one side is BAU and other is MDT
SELECT source_id, target_id, link_type
FROM ph_issue_links
WHERE (source_id LIKE 'BAU-%' AND target_id LIKE 'MDT-%')
   OR (source_id LIKE 'MDT-%' AND target_id LIKE 'BAU-%')
LIMIT 5;
```

---

## F. Reach-out — is there a `ph_issue_parents` or a dedicated Jira-hierarchy table?

Jira Software has a "parent link" that's distinct from the standard parent_key for Epic↔Initiative. Please check:

```sql
-- Anything that looks like a parent-link side-table
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE 'ph_%parent%' OR
    table_name LIKE 'ph_%hierarch%' OR
    table_name LIKE 'ph_%initiative%' OR
    table_name LIKE 'ph_%epic%'
  );

-- If any of the above returned a name, sample 5 rows from it
-- (please replace the table name)
```

---

## G. What Jira actually renders on the epic — field name

In Jira's UI, when a user looks at a BAU Epic they see a "Parent link" field that points to an MDT issue. That custom field has a specific name in Jira's metadata. Please check:

```sql
-- If there's a field-metadata table
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'ph_%field%';

-- If ph_fields / ph_custom_fields exists, list every Jira field whose name
-- contains 'Parent' or 'Initiative' or 'Business' or 'BRD'
SELECT * FROM ph_fields
WHERE name ILIKE '%parent%'
   OR name ILIKE '%initiative%'
   OR name ILIKE '%business%'
   OR name ILIKE '%brd%'
LIMIT 20;
```

---

## H. If the data truly doesn't exist, confirm

After the above, please answer directly:

H.1. Based on every check above, does a BAU Epic have **any** persistable link to an MDT business-request ticket anywhere in the Supabase schema?
H.2. If yes, state the table + column path verbatim (e.g. `ph_issues.custom_fields->>'customfield_10008'`).
H.3. If no, say so explicitly. Then add: is there a sync job we should be running to populate it? Is the data in Jira but not mirrored to Supabase?

---

## Return format

Use the section letters above. Example:

```
## A. Tables + columns hinting at BRD / MDT / business-request linkage
table_name | column_name | data_type
------------+-----------------------+-----------
ph_issues  | brd_parent_key        | text
brd_documents | issue_key           | text

Tables by name:
- brd_documents
- business_requests
- ph_brd_links  ← this looks promising
```

Be exhaustive. We need to find where Jira's "Parent (BRD)" is stored — or confirm it isn't there and needs sync work.
