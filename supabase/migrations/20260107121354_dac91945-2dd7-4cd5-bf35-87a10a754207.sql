-- Add contract date fields to resource_inventory
ALTER TABLE public.resource_inventory 
ADD COLUMN IF NOT EXISTS contract_start_date DATE,
ADD COLUMN IF NOT EXISTS contract_end_date DATE,
ADD COLUMN IF NOT EXISTS vendor_name TEXT;

-- Create index for efficient queries on contract dates
CREATE INDEX IF NOT EXISTS idx_resource_inventory_contract_dates 
ON public.resource_inventory(contract_start_date, contract_end_date);

-- Enable realtime for resource_inventory if not already enabled
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_inventory;