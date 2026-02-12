-- Change item_id from uuid to text to support both UUIDs and Jira issue keys
ALTER TABLE public.user_starred_items ALTER COLUMN item_id TYPE text USING item_id::text;