-- Update the payment_status check constraint to include 'on_track'
ALTER TABLE resource_assignments DROP CONSTRAINT IF EXISTS resource_assignments_payment_status_check;

ALTER TABLE resource_assignments ADD CONSTRAINT resource_assignments_payment_status_check 
  CHECK (payment_status IN ('not_applicable', 'unpaid', 'on_track', 'paid', 'closed'));