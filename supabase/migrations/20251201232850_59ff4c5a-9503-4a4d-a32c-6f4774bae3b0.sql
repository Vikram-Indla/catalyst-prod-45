-- Create test_data_parameters table for parameterized testing
CREATE TABLE IF NOT EXISTS public.test_data_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
  parameter_name VARCHAR(255) NOT NULL,
  parameter_type VARCHAR(50) NOT NULL DEFAULT 'string',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_parameter_per_test UNIQUE(test_case_id, parameter_name)
);

-- Create test_data_rows table for storing test data sets
CREATE TABLE IF NOT EXISTS public.test_data_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
  row_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_test_data_parameters_test_case_id ON public.test_data_parameters(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_data_rows_test_case_id ON public.test_data_rows(test_case_id);

-- Enable RLS
ALTER TABLE public.test_data_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_data_rows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_data_parameters
CREATE POLICY "Users can view test parameters"
  ON public.test_data_parameters FOR SELECT
  USING (true);

CREATE POLICY "Users can insert test parameters"
  ON public.test_data_parameters FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update test parameters"
  ON public.test_data_parameters FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete test parameters"
  ON public.test_data_parameters FOR DELETE
  USING (true);

-- RLS Policies for test_data_rows
CREATE POLICY "Users can view test data rows"
  ON public.test_data_rows FOR SELECT
  USING (true);

CREATE POLICY "Users can insert test data rows"
  ON public.test_data_rows FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update test data rows"
  ON public.test_data_rows FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete test data rows"
  ON public.test_data_rows FOR DELETE
  USING (true);

-- Add trigger for updated_at on test_data_parameters
CREATE OR REPLACE FUNCTION update_test_data_parameters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER test_data_parameters_updated_at
  BEFORE UPDATE ON public.test_data_parameters
  FOR EACH ROW
  EXECUTE FUNCTION update_test_data_parameters_updated_at();

-- Add trigger for updated_at on test_data_rows
CREATE OR REPLACE FUNCTION update_test_data_rows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER test_data_rows_updated_at
  BEFORE UPDATE ON public.test_data_rows
  FOR EACH ROW
  EXECUTE FUNCTION update_test_data_rows_updated_at();