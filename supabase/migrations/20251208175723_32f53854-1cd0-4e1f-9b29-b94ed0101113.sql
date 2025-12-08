-- Enums
CREATE TYPE skill_proficiency_level AS ENUM ('awareness', 'beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE skill_category AS ENUM ('technical', 'cloud_infrastructure', 'data_analytics', 'security', 'leadership', 'soft_skills', 'domain_knowledge', 'methodology');

-- Skills master table
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  description TEXT,
  category skill_category NOT NULL DEFAULT 'technical',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team member skills junction table
CREATE TABLE team_member_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level skill_proficiency_level NOT NULL DEFAULT 'beginner',
  years_experience DECIMAL(4,1),
  is_primary_skill BOOLEAN DEFAULT false,
  self_assessed BOOLEAN DEFAULT true,
  manager_verified BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_member_id, skill_id)
);

-- Certifications table
CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  issuing_organization VARCHAR(255),
  credential_id VARCHAR(255),
  issue_date DATE,
  expiry_date DATE,
  credential_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skill requirements for programs/features
CREATE TABLE skill_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  required_proficiency skill_proficiency_level NOT NULL DEFAULT 'intermediate',
  required_count INTEGER DEFAULT 1,
  priority VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_team_member_skills_member ON team_member_skills(team_member_id);
CREATE INDEX idx_team_member_skills_skill ON team_member_skills(skill_id);
CREATE INDEX idx_certifications_member ON certifications(team_member_id);
CREATE INDEX idx_certifications_expiry ON certifications(expiry_date);
CREATE INDEX idx_skill_requirements_entity ON skill_requirements(entity_type, entity_id);

-- RLS Policies
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON team_member_skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON certifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON skill_requirements FOR SELECT TO authenticated USING (true);

-- Admin write policies
CREATE POLICY "Admins can manage skills" ON skills FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage team_member_skills" ON team_member_skills FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage certifications" ON certifications FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage skill_requirements" ON skill_requirements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed sample skills
INSERT INTO skills (name, category) VALUES
  ('AWS', 'cloud_infrastructure'),
  ('Azure', 'cloud_infrastructure'),
  ('Google Cloud Platform', 'cloud_infrastructure'),
  ('React', 'technical'),
  ('Node.js', 'technical'),
  ('Python', 'technical'),
  ('TypeScript', 'technical'),
  ('PostgreSQL', 'data_analytics'),
  ('MongoDB', 'data_analytics'),
  ('Docker', 'cloud_infrastructure'),
  ('Kubernetes', 'cloud_infrastructure'),
  ('CI/CD Pipelines', 'cloud_infrastructure'),
  ('Cybersecurity', 'security'),
  ('Agile/Scrum', 'methodology'),
  ('Project Management', 'leadership');