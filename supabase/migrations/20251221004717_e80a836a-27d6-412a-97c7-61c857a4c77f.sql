-- =====================================================
-- PHASE 2: Release Calendar Enterprise Maturity Tables
-- =====================================================

-- TABLE: release_windows (Blackout & Maintenance Windows)
CREATE TABLE IF NOT EXISTS public.release_windows (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    window_type TEXT NOT NULL CHECK (window_type IN ('blackout', 'maintenance')),
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    applies_to_release_version_id UUID REFERENCES public.release_versions(id),
    applies_to_environment TEXT DEFAULT 'PROD',
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern TEXT,
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TABLE: change_dependencies (Dependency Management)
CREATE TABLE IF NOT EXISTS public.change_dependencies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    blocking_change_id UUID NOT NULL REFERENCES public.change_cards(id) ON DELETE CASCADE,
    blocked_change_id UUID NOT NULL REFERENCES public.change_cards(id) ON DELETE CASCADE,
    dependency_type TEXT NOT NULL DEFAULT 'must_complete_before' CHECK (dependency_type IN ('must_complete_before', 'should_complete_before', 'related')),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'cancelled')),
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(blocked_change_id, blocking_change_id)
);

-- TABLE: change_approvals (Multi-step CAB Approvals)
CREATE TABLE IF NOT EXISTS public.change_approvals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    change_card_id UUID NOT NULL REFERENCES public.change_cards(id) ON DELETE CASCADE,
    step_type TEXT NOT NULL CHECK (step_type IN ('technical_review', 'security_review', 'cab_approval', 'business_approval', 'emergency_approval')),
    step_order INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
    assigned_role TEXT,
    assigned_user_id UUID,
    decision_by_user_id UUID,
    decided_at TIMESTAMPTZ,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(change_card_id, step_type)
);

-- TABLE: change_conflicts (Conflict Detection & Resolution)
CREATE TABLE IF NOT EXISTS public.change_conflicts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    change_card_id UUID NOT NULL REFERENCES public.change_cards(id) ON DELETE CASCADE,
    conflict_type TEXT NOT NULL CHECK (conflict_type IN ('blackout_violation', 'dependency_violation', 'resource_conflict', 'timing_conflict')),
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    related_change_id UUID REFERENCES public.change_cards(id),
    related_window_id UUID REFERENCES public.release_windows(id),
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'ignored')),
    resolved_by_user_id UUID,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add risk_level to change_cards if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'change_cards' AND column_name = 'risk_level') THEN
        ALTER TABLE public.change_cards ADD COLUMN risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'change_cards' AND column_name = 'approvals_overall_status') THEN
        ALTER TABLE public.change_cards ADD COLUMN approvals_overall_status TEXT DEFAULT 'pending' CHECK (approvals_overall_status IN ('pending', 'in_progress', 'approved', 'rejected'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'change_cards' AND column_name = 'release_readiness') THEN
        ALTER TABLE public.change_cards ADD COLUMN release_readiness TEXT DEFAULT 'not_ready' CHECK (release_readiness IN ('not_ready', 'partial', 'ready', 'deployed'));
    END IF;
END $$;

-- Enable RLS on all new tables
ALTER TABLE public.release_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_conflicts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for release_windows
CREATE POLICY "release_windows_select" ON public.release_windows FOR SELECT USING (true);
CREATE POLICY "release_windows_insert" ON public.release_windows FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "release_windows_update" ON public.release_windows FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "release_windows_delete" ON public.release_windows FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for change_dependencies
CREATE POLICY "change_dependencies_select" ON public.change_dependencies FOR SELECT USING (true);
CREATE POLICY "change_dependencies_insert" ON public.change_dependencies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "change_dependencies_update" ON public.change_dependencies FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "change_dependencies_delete" ON public.change_dependencies FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for change_approvals
CREATE POLICY "change_approvals_select" ON public.change_approvals FOR SELECT USING (true);
CREATE POLICY "change_approvals_insert" ON public.change_approvals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "change_approvals_update" ON public.change_approvals FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "change_approvals_delete" ON public.change_approvals FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for change_conflicts
CREATE POLICY "change_conflicts_select" ON public.change_conflicts FOR SELECT USING (true);
CREATE POLICY "change_conflicts_insert" ON public.change_conflicts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "change_conflicts_update" ON public.change_conflicts FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "change_conflicts_delete" ON public.change_conflicts FOR DELETE USING (auth.uid() IS NOT NULL);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_release_windows_dates ON public.release_windows(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_change_dependencies_blocking ON public.change_dependencies(blocking_change_id);
CREATE INDEX IF NOT EXISTS idx_change_dependencies_blocked ON public.change_dependencies(blocked_change_id);
CREATE INDEX IF NOT EXISTS idx_change_approvals_card ON public.change_approvals(change_card_id);
CREATE INDEX IF NOT EXISTS idx_change_conflicts_card ON public.change_conflicts(change_card_id);
CREATE INDEX IF NOT EXISTS idx_change_conflicts_status ON public.change_conflicts(status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_release_windows_updated_at ON public.release_windows;
CREATE TRIGGER update_release_windows_updated_at BEFORE UPDATE ON public.release_windows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_change_approvals_updated_at ON public.change_approvals;
CREATE TRIGGER update_change_approvals_updated_at BEFORE UPDATE ON public.change_approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();