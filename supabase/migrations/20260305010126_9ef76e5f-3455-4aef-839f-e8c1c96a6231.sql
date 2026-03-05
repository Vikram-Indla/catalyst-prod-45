
CREATE TABLE IF NOT EXISTS r360_role_benchmarks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_code       TEXT NOT NULL,
  role_name       TEXT NOT NULL,
  artifact_type   TEXT NOT NULL,
  affinity_weight INTEGER NOT NULL CHECK (affinity_weight IN (0,1,3,5)),
  is_primary      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_code, artifact_type)
);

ALTER TABLE r360_role_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on r360_role_benchmarks"
  ON r360_role_benchmarks FOR SELECT TO authenticated USING (true);
