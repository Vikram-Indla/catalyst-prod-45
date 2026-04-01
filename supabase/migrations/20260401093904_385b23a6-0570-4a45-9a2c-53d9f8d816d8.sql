UPDATE ph_work_items
SET jira_key = 'JIRA-290', jira_sync_status = 'synced', jira_pushed_at = now()
WHERE item_key = 'IRP-290';