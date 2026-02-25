
-- Temporarily disable the item_key trigger so we can insert Jira issue keys directly
ALTER TABLE ph_work_items DISABLE TRIGGER trg_item_key;
