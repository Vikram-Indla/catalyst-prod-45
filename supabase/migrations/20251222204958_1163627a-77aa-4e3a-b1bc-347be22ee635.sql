-- Products table for grouping demands in roadmap
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#c69c6d',
  owner_id UUID REFERENCES public.profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roadmap Views (saved filter/group configurations)
CREATE TABLE IF NOT EXISTS public.roadmap_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  filters JSONB DEFAULT '{}',
  grouping VARCHAR(50),
  is_default BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add product_id to business_requests if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'business_requests' 
    AND column_name = 'product_id'
  ) THEN
    ALTER TABLE public.business_requests ADD COLUMN product_id UUID REFERENCES public.products(id);
  END IF;
END $$;

-- Add progress column to business_requests if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'business_requests' 
    AND column_name = 'progress'
  ) THEN
    ALTER TABLE public.business_requests ADD COLUMN progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products (read by all approved users, write by admins)
CREATE POLICY "Products viewable by approved users" 
ON public.products FOR SELECT 
USING (public.current_user_is_approved());

CREATE POLICY "Products manageable by admins" 
ON public.products FOR ALL 
USING (public.is_admin(auth.uid()));

-- RLS Policies for roadmap_views (users can manage their own views)
CREATE POLICY "Users can view their own saved views" 
ON public.roadmap_views FOR SELECT 
USING (user_id = auth.uid() OR is_shared = TRUE);

CREATE POLICY "Users can create their own views" 
ON public.roadmap_views FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own views" 
ON public.roadmap_views FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own views" 
ON public.roadmap_views FOR DELETE 
USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_requests_product ON public.business_requests(product_id);
CREATE INDEX IF NOT EXISTS idx_business_requests_dates ON public.business_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_products_code ON public.products(code);
CREATE INDEX IF NOT EXISTS idx_roadmap_views_user ON public.roadmap_views(user_id);

-- Seed default products
INSERT INTO public.products (name, code, color, sort_order) VALUES
  ('Mini Apps', 'MINI', '#c69c6d', 1),
  ('Senaei Platform', 'SEN', '#5c7c5c', 2),
  ('Enterprise Platform', 'ENT', '#8b7355', 3),
  ('Unassigned', 'UNA', '#c8ccd0', 4)
ON CONFLICT (code) DO NOTHING;

-- Updated_at trigger for products
CREATE OR REPLACE FUNCTION public.update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_products_updated_at();

-- Updated_at trigger for roadmap_views
DROP TRIGGER IF EXISTS update_roadmap_views_updated_at ON public.roadmap_views;
CREATE TRIGGER update_roadmap_views_updated_at
  BEFORE UPDATE ON public.roadmap_views
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();