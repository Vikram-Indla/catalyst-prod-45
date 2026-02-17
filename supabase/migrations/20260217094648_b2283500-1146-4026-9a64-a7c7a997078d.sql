ALTER TABLE public.user_starred_items DROP CONSTRAINT user_starred_items_item_type_check;

ALTER TABLE public.user_starred_items ADD CONSTRAINT user_starred_items_item_type_check CHECK (item_type = ANY (ARRAY['epic'::text, 'feature'::text, 'story'::text, 'task'::text, 'incident'::text, 'defect'::text, 'ph_issue'::text]));