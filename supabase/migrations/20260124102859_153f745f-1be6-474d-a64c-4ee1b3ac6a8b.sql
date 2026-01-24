-- Add end_date and payment_status to resource_assignments table
ALTER TABLE public.resource_assignments 
ADD COLUMN end_date date,
ADD COLUMN payment_status text DEFAULT 'not_applicable';

-- Add check constraint for payment_status values
ALTER TABLE public.resource_assignments 
ADD CONSTRAINT resource_assignments_payment_status_check 
CHECK (payment_status IN ('not_applicable', 'unpaid', 'paid', 'closed'));

-- Comment for clarity
COMMENT ON COLUMN public.resource_assignments.end_date IS 'Assignment end date';
COMMENT ON COLUMN public.resource_assignments.payment_status IS 'Payment status - only applicable for outsourced/cosourced types';