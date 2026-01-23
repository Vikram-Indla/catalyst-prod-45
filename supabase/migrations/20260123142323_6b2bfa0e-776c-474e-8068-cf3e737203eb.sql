-- =====================================================
-- CATALYST BUDGET PLANNING MODULE - DATABASE SCHEMA
-- =====================================================

-- 1. Resource Cost History Table
-- Tracks all cost changes for resources with date ranges
CREATE TABLE public.resource_cost_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL,
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('fixed', 'variable')),
    monthly_cost DECIMAL(12,2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE, -- NULL means current/ongoing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX idx_resource_cost_history_resource ON public.resource_cost_history(resource_id);
CREATE INDEX idx_resource_cost_current ON public.resource_cost_history(resource_id) 
WHERE effective_to IS NULL;

-- Enable RLS
ALTER TABLE public.resource_cost_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow read access for authenticated users"
ON public.resource_cost_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow insert for authenticated users"
ON public.resource_cost_history FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
ON public.resource_cost_history FOR UPDATE
TO authenticated
USING (true);

-- 2. Software Licenses Table
-- Master table for software licenses
CREATE TABLE public.software_licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    vendor VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    license_type VARCHAR(50) NOT NULL CHECK (license_type IN ('annual', 'monthly', 'consumption', 'perpetual')),
    user_count INTEGER,
    annual_cost DECIMAL(12,2) NOT NULL,
    start_date DATE NOT NULL,
    renewal_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.software_licenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow read access for authenticated users"
ON public.software_licenses FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow insert for authenticated users"
ON public.software_licenses FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
ON public.software_licenses FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow delete for authenticated users"
ON public.software_licenses FOR DELETE
TO authenticated
USING (true);

-- 3. Assignment License Allocations Table
-- Junction table for license allocation percentages per assignment
CREATE TABLE public.assignment_license_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL,
    license_id UUID NOT NULL REFERENCES public.software_licenses(id) ON DELETE CASCADE,
    allocation_percent DECIMAL(5,2) NOT NULL CHECK (allocation_percent >= 0 AND allocation_percent <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(assignment_id, license_id)
);

-- Indexes
CREATE INDEX idx_license_allocations_assignment ON public.assignment_license_allocations(assignment_id);
CREATE INDEX idx_license_allocations_license ON public.assignment_license_allocations(license_id);

-- Enable RLS
ALTER TABLE public.assignment_license_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow read access for authenticated users"
ON public.assignment_license_allocations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow insert for authenticated users"
ON public.assignment_license_allocations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
ON public.assignment_license_allocations FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow delete for authenticated users"
ON public.assignment_license_allocations FOR DELETE
TO authenticated
USING (true);

-- 4. View for Current Resource Costs
CREATE VIEW public.resource_current_cost AS
SELECT DISTINCT ON (resource_id) 
    id,
    resource_id,
    resource_type,
    monthly_cost,
    monthly_cost * 12 as annual_cost,
    effective_from,
    effective_to,
    created_at,
    created_by
FROM public.resource_cost_history
WHERE effective_from <= CURRENT_DATE
  AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
ORDER BY resource_id, effective_from DESC;

-- 5. View for License Allocation Totals
CREATE VIEW public.license_allocation_totals AS
SELECT 
    license_id,
    SUM(allocation_percent) as total_allocated,
    CASE 
        WHEN SUM(allocation_percent) = 100 THEN 'complete'
        WHEN SUM(allocation_percent) < 100 THEN 'partial'
        ELSE 'over'
    END as allocation_status
FROM public.assignment_license_allocations
GROUP BY license_id;

-- 6. Function to close previous cost record when adding new one
CREATE OR REPLACE FUNCTION public.close_previous_cost_record()
RETURNS TRIGGER AS $$
BEGIN
    -- Close the previous active record for this resource
    UPDATE public.resource_cost_history
    SET effective_to = NEW.effective_from - INTERVAL '1 day',
        updated_at = NOW()
    WHERE resource_id = NEW.resource_id
      AND effective_to IS NULL
      AND id != NEW.id
      AND effective_from < NEW.effective_from;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-close previous cost record
CREATE TRIGGER trigger_close_previous_cost
AFTER INSERT ON public.resource_cost_history
FOR EACH ROW
EXECUTE FUNCTION public.close_previous_cost_record();

-- 7. Updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_resource_cost_history_updated_at
BEFORE UPDATE ON public.resource_cost_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_software_licenses_updated_at
BEFORE UPDATE ON public.software_licenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignment_license_allocations_updated_at
BEFORE UPDATE ON public.assignment_license_allocations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();