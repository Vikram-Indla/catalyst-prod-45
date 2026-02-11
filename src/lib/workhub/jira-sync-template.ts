/**
 * JIRA SYNC EDGE FUNCTION TEMPLATE
 * Deploy to: supabase/functions/jira-sync/index.ts
 * 
 * This function:
 * 1. Receives projectId from the client
 * 2. Reads Jira credentials from project.sync_config (encrypted)
 * 3. Calls Jira REST API: GET /rest/api/3/search?jql=project={key}
 * 4. For each Jira issue:
 *    - If jira_issue_id exists in wh_work_items → UPDATE
 *    - If not → INSERT with sync_source='jira', is_jira_locked=true
 * 5. Maps Jira fields:
 *    - issue.key → item_key
 *    - issue.fields.issuetype.name → item_type (Epic/Story/Subtask/Bug)
 *    - issue.fields.summary → summary
 *    - issue.fields.status.name → jira_status (raw)
 *    - issue.fields.status.name → status (mapped: "To Do"/"In Progress"/etc.)
 *    - issue.fields.priority.name → jira_priority (raw)  
 *    - issue.fields.priority.name → priority (mapped: Critical/High/Medium/Low)
 *    - issue.fields.parent?.key → parent_id (lookup by item_key)
 *    - issue.fields.assignee?.accountId → jira_account_id (resource lookup)
 *    - issue.fields.labels → jira_labels
 *    - issue.fields.customfield_10016 → jira_story_points
 * 6. Sets last_synced_at on all synced items
 * 7. Updates wh_jira_sync_log with results
 * 8. Returns { created, updated, unchanged, errors }
 * 
 * STATUS MAPPING:
 *   Jira "To Do" / "Open" / "Backlog" → "To Do"
 *   Jira "In Progress" / "In Development" → "In Progress"  
 *   Jira "In Review" / "Code Review" → "In Review"
 *   Jira "Done" / "Closed" / "Resolved" → "Done"
 *   Jira "Blocked" → "Blocked"
 * 
 * CONFLICT RESOLUTION:
 *   - Jira always wins for: status, priority, summary, assignee
 *   - Catalyst always wins for: release_id, theme_id, team_id
 *   - is_jira_locked items cannot have status/priority changed in UI
 */
export const JIRA_SYNC_TEMPLATE = 'reference-only';
