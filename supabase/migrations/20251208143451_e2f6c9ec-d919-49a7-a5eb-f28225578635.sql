-- Add additional columns to custom_field_defs for better configuration
ALTER TABLE public.custom_field_defs
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS default_value jsonb,
ADD COLUMN IF NOT EXISTS validation_rules jsonb,
ADD COLUMN IF NOT EXISTS placeholder text;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_custom_field_defs_entity_type ON public.custom_field_defs(entity_type, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON public.custom_field_values(entity_type, entity_id);

-- Insert some default custom field definitions for common entity types
INSERT INTO public.custom_field_defs (entity_type, name, field_type, required, description, display_order, is_active, options_json, placeholder)
VALUES 
  ('epic', 'Business Unit', 'select', false, 'Business unit responsible for this epic', 1, true, '{"options": ["Finance", "Operations", "Technology", "Marketing", "HR"]}', 'Select business unit'),
  ('epic', 'External Reference', 'text', false, 'External system reference ID', 2, true, null, 'e.g., JIRA-123'),
  ('epic', 'Regulatory Impact', 'boolean', false, 'Has regulatory compliance impact', 3, true, null, null),
  ('feature', 'Target Market', 'select', false, 'Target market segment', 1, true, '{"options": ["Enterprise", "SMB", "Consumer", "Government"]}', 'Select target market'),
  ('feature', 'Technical Complexity', 'select', false, 'Technical complexity assessment', 2, true, '{"options": ["Low", "Medium", "High", "Very High"]}', 'Select complexity'),
  ('story', 'Definition of Done', 'text', false, 'Specific DoD for this story', 1, true, null, 'Enter specific completion criteria'),
  ('story', 'Test Coverage Required', 'boolean', false, 'Requires automated test coverage', 2, true, null, null)
ON CONFLICT DO NOTHING;