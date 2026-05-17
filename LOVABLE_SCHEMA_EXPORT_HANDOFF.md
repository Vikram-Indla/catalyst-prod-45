# Lovable Handoff — Full Schema Export (2026-05-16)

## Context

We're deprecating Lovable for schema management. We have a Supabase MCP connection to `lmqwtldpfacrrlvdnmld` (the project you built the schema on). We need you to export the complete, production schema as migration-ready SQL so we can commit it to git and achieve zero Lovable dependency.

## Task for Lovable

Use your Supabase MCP connection to extract and export:

### What to Export

1. **All tables** (public schema only)
   - Table definitions with all columns, types, defaults, constraints
   - Primary keys, unique constraints, check constraints
   - Foreign keys (with correct reference targets)

2. **All RLS policies**
   - FOR SELECT, INSERT, UPDATE, DELETE
   - WITH CHECK and USING clauses
   - Comment each policy with what it protects

3. **All indexes**
   - Regular indexes
   - Unique indexes (already on PK/UK but include them)
   - Composite indexes

4. **All sequences**
   - serial/bigserial backing columns

5. **All functions/procedures** (if any)
   - Full source code
   - Arguments, return types

6. **All triggers** (if any)
   - Full source code
   - BEFORE/AFTER, FOR EACH ROW/STATEMENT

7. **Extensions**
   - List all non-standard extensions (uuid-ossp, pgvector, etc.)
   - CREATE EXTENSION statements

### Export Format

**Output as a single SQL file** (`full_schema.sql`) that:
- Can be run on a fresh Postgres database to recreate the entire schema
- Includes comments explaining what each section does
- Drops nothing (no DROP TABLE statements) — this is for import, not migration
- Ordered logically: extensions → tables → policies → indexes → functions → triggers

### SQL Queries to Run

Use `execute_sql` MCP to get:

```sql
-- 1. Extensions
SELECT * FROM pg_extension WHERE extname NOT IN ('plpgsql', 'pg_stat_statements');

-- 2. Tables (with DDL reconstruction)
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- 3. RLS Policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- 4. Indexes
SELECT * FROM pg_indexes WHERE schemaname = 'public';

-- 5. Functions
SELECT * FROM information_schema.routines WHERE routine_schema = 'public';

-- 6. Triggers
SELECT * FROM information_schema.triggers WHERE trigger_schema = 'public';

-- 7. Sequences
SELECT * FROM information_schema.sequences WHERE sequence_schema = 'public';
```

Then **reconstruct the DDL** from these system tables and output as CREATE statements.

### Deliverable

**Single file: `full_schema.sql`**

```sql
-- Full Schema Export for lmqwtldpfacrrlvdnmld
-- Generated: 2026-05-16
-- Scope: public schema only
-- Purpose: Git-tracked baseline for zero-Lovable schema management

-- ========== EXTENSIONS ==========
CREATE EXTENSION IF NOT EXISTS uuid-ossp;
CREATE EXTENSION IF NOT EXISTS pgvector;
-- ... etc

-- ========== TABLES ==========
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  -- ... full DDL
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES public.users(id),
  -- ... full DDL
);

-- ========== RLS POLICIES ==========
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);
-- ... etc for all tables

-- ========== INDEXES ==========
CREATE INDEX idx_users_email ON public.users(email);
-- ... etc

-- ========== SEQUENCES ==========
-- (if any not backed by serial columns)

-- ========== FUNCTIONS ==========
-- (if any custom functions)

-- ========== TRIGGERS ==========
-- (if any custom triggers)
```

### Success Criteria

1. ✅ Can run this SQL on a fresh Postgres database and recreate the exact schema
2. ✅ No errors, no missing constraints
3. ✅ All RLS policies present and correct
4. ✅ All extensions listed
5. ✅ Includes comments explaining what each section is

### Submission

1. **Post the `full_schema.sql` to this chat** as a code block or attachment
2. **List any caveats** (e.g., "table X has manual data migration logic that won't be captured here")
3. **Confirm** that this schema is identical to what's currently in lmqwtldpfacrrlvdnmld

---

## Why This Matters

Without this export, we still need Lovable to know "what the schema should be." With it, git becomes the authoritative source, and we can:
- Spin up new environments from git
- Audit schema changes via git history
- Recover from corruption using git
- Fully revoke Lovable access

**This is the final bridge between Lovable-managed and git-managed schema.**
