
-- ============================================
-- SHARED STEPS LIBRARY - DATABASE SETUP
-- ============================================

-- 1. CREATE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS th_shared_step_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#64748B',
  icon VARCHAR(50) DEFAULT 'folder',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREATE/UPDATE SHARED STEPS TABLE
CREATE TABLE IF NOT EXISTS th_shared_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  action TEXT NOT NULL,
  expected_result TEXT,
  category_id UUID REFERENCES th_shared_step_categories(id) ON DELETE SET NULL,
  variables JSONB DEFAULT '[]',
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Add columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'th_shared_steps' AND column_name = 'category_id') THEN
    ALTER TABLE th_shared_steps ADD COLUMN category_id UUID REFERENCES th_shared_step_categories(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'th_shared_steps' AND column_name = 'variables') THEN
    ALTER TABLE th_shared_steps ADD COLUMN variables JSONB DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'th_shared_steps' AND column_name = 'is_active') THEN
    ALTER TABLE th_shared_steps ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'th_shared_steps' AND column_name = 'updated_by') THEN
    ALTER TABLE th_shared_steps ADD COLUMN updated_by UUID REFERENCES profiles(id);
  END IF;
END $$;

-- 3. CREATE USAGE TRACKING TABLE
CREATE TABLE IF NOT EXISTS th_shared_step_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_step_id UUID NOT NULL REFERENCES th_shared_steps(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES th_test_cases(id) ON DELETE CASCADE,
  test_step_id UUID REFERENCES th_test_steps(id) ON DELETE CASCADE,
  variable_values JSONB DEFAULT '{}',
  inserted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shared_step_id, test_step_id)
);

-- 4. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_shared_steps_category ON th_shared_steps(category_id);
CREATE INDEX IF NOT EXISTS idx_shared_steps_active ON th_shared_steps(is_active);
CREATE INDEX IF NOT EXISTS idx_shared_steps_usage_count ON th_shared_steps(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_shared_step_usage_step ON th_shared_step_usage(shared_step_id);
CREATE INDEX IF NOT EXISTS idx_shared_step_usage_test_case ON th_shared_step_usage(test_case_id);

-- 5. ENABLE RLS
ALTER TABLE th_shared_step_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_shared_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_shared_step_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Categories (read-all, write for authenticated)
CREATE POLICY "Anyone can read shared step categories" ON th_shared_step_categories FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage categories" ON th_shared_step_categories FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies - Shared Steps
CREATE POLICY "Anyone can read shared steps" ON th_shared_steps FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage shared steps" ON th_shared_steps FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies - Usage
CREATE POLICY "Anyone can read shared step usage" ON th_shared_step_usage FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage usage" ON th_shared_step_usage FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
