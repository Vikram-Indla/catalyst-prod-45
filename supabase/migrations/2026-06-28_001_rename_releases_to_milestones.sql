-- Migration: Rename product_releases table to product_milestones
-- Reason: Clarify that this is a product-level time container (not production deployment)

BEGIN;

-- Step 1: Rename table
ALTER TABLE product_releases RENAME TO product_milestones;

-- Step 2: Update comments
COMMENT ON TABLE product_milestones IS
  'Product-level time-boxed milestone. ' ||
  'Previously called product_releases. ' ||
  'Milestones are the primary measuring unit for product roadmap. ' ||
  'Independent of operational releases in Release Hub.';

-- Step 3: Rename column
ALTER TABLE product_milestones RENAME COLUMN name TO title;

-- Step 4: Add new column
ALTER TABLE product_milestones ADD COLUMN quarter VARCHAR(10);
COMMENT ON COLUMN product_milestones.quarter IS
  'Quarter designation (Q1, Q2, Q3, Q4) or custom quarter label. ' ||
  'Used for filtering and grouping milestones in product roadmap.';

-- Step 5: Add key column (unique identifier)
ALTER TABLE product_milestones ADD COLUMN key VARCHAR(50) UNIQUE;
COMMENT ON COLUMN product_milestones.key IS
  'Unique key for milestone (e.g., PDM-2026-Q3-INV). ' ||
  'Format: PDM-YYYY-QX or PDM-YYYY-MM-THEME';

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_product_milestones_product_id ON product_milestones(product_id);
CREATE INDEX IF NOT EXISTS idx_product_milestones_quarter ON product_milestones(quarter);
CREATE INDEX IF NOT EXISTS idx_product_milestones_target_date ON product_milestones(target_date);
CREATE INDEX IF NOT EXISTS idx_product_milestones_status ON product_milestones(status);
CREATE INDEX IF NOT EXISTS idx_product_milestones_key ON product_milestones(key);

COMMIT;
