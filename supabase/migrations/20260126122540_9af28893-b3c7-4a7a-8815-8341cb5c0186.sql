-- Add email column to resource_inventory for inventory-only users
ALTER TABLE public.resource_inventory 
ADD COLUMN IF NOT EXISTS email TEXT;