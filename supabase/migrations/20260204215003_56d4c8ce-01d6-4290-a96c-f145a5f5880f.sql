-- Enable realtime for t10_items table
ALTER PUBLICATION supabase_realtime ADD TABLE public.t10_items;

-- Enable realtime for t10_item_labels junction table
ALTER PUBLICATION supabase_realtime ADD TABLE public.t10_item_labels;