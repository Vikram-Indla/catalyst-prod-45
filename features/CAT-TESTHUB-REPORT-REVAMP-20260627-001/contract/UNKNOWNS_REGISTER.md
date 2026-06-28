# UNKNOWNS REGISTER

| ID | Unknown | Owner | Status | Resolution |
|----|---------|-------|--------|-----------|
| U-001 | Where sprints stored | database | ✅ ANSWERED | ph_jira_sprints (26); iterations dead (D8) |
| U-002 | Release↔Sprint cardinality | user | ✅ ANSWERED | Derived via work items, text-join (D-003) |
| U-003 | Test case → work item link | user+db | ✅ ANSWERED | tm_*; trace via tm_requirement_links.external_key → ph_issues.issue_key (D-001/002) |
| U-004 | Execution → sprint/release | database | 🟡 PARTIAL | derive via case→requirement→ph_issues→sprint_name/fix_versions; confirm in D5 |
| U-005 | Coverage denominator | user | 🔴 OPEN | Q-004 still open — blocks coverage formulas |
| U-006 | Status mappings | user | 🔴 OPEN | STATUS_MAPPING per object (ph_issues.status_category exists) |
| U-007 | Date sources | user+db | 🔴 OPEN | DATE_SOURCES — sprint/release have start/target/actual dates (D8) |
| U-008 | "Parent" semantics | user | 🟡 PARTIAL | ph_issues.parent_key / hierarchy_level exist; test parent = tm_test_cases.parent_case_id |
| U-009 | QA team derivation | user | 🔴 OPEN | D13 pending |
| U-010 | Reports real vs mock | code | ✅ ANSWERED | reports real (tm_*) but near-empty; lab seeded (D1) |
