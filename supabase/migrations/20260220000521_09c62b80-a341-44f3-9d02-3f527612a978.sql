
-- Fix es_key_results constraints to support new values
ALTER TABLE es_key_results DROP CONSTRAINT IF EXISTS es_key_results_confidence_level_check;
ALTER TABLE es_key_results DROP CONSTRAINT IF EXISTS es_key_results_metric_type_check;
ALTER TABLE es_key_results DROP CONSTRAINT IF EXISTS es_key_results_status_check;

-- confidence_level is TEXT in existing schema, allow both old text values and numeric strings
-- No constraint needed - we'll use it as free text

-- metric_type: merge old + new values
ALTER TABLE es_key_results ADD CONSTRAINT es_key_results_metric_type_check 
  CHECK (metric_type IN ('percentage','number','currency','binary','count','nps','decimal_scale'));

-- status: merge old + new values  
ALTER TABLE es_key_results ADD CONSTRAINT es_key_results_status_check 
  CHECK (status IN ('not_started','in_progress','at_risk','on_track','off_track','achieved','completed','cancelled'));
