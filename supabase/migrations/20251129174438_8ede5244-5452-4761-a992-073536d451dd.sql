-- Seed missing pyramid levels for Corporate Strategy 2025
DO $$
DECLARE
  v_snapshot_id UUID;
BEGIN
  -- Get Corporate Strategy 2025 snapshot ID
  SELECT id INTO v_snapshot_id FROM strategy_snapshots WHERE name = 'Corporate Strategy 2025';
  
  -- Insert Mission
  INSERT INTO goals (snapshot_id, level, title, description, status) VALUES
  (v_snapshot_id, 'mission', 'Transform Enterprise Technology', 'Modernize technology infrastructure to enable business agility', 'active'),
  (v_snapshot_id, 'mission', 'Deliver Customer Excellence', 'Provide exceptional customer experiences across all touchpoints', 'active')
  ON CONFLICT DO NOTHING;
  
  -- Insert Vision
  INSERT INTO goals (snapshot_id, level, title, description, status) VALUES
  (v_snapshot_id, 'vision', 'Industry-Leading Platform', 'Build the most trusted and innovative platform in the industry', 'active'),
  (v_snapshot_id, 'vision', 'Global Market Leadership', 'Achieve market leadership position across all regions', 'active')
  ON CONFLICT DO NOTHING;
  
  -- Insert Values (12 values)
  INSERT INTO goals (snapshot_id, level, title, description, status) VALUES
  (v_snapshot_id, 'value', 'Innovation', 'Drive continuous innovation in everything we do', 'active'),
  (v_snapshot_id, 'value', 'Integrity', 'Act with honesty and transparency', 'active'),
  (v_snapshot_id, 'value', 'Collaboration', 'Work together across boundaries', 'active'),
  (v_snapshot_id, 'value', 'Excellence', 'Strive for excellence in execution', 'active'),
  (v_snapshot_id, 'value', 'Customer Focus', 'Put customers at the center of decisions', 'active'),
  (v_snapshot_id, 'value', 'Accountability', 'Take ownership of outcomes', 'active'),
  (v_snapshot_id, 'value', 'Agility', 'Adapt quickly to change', 'active'),
  (v_snapshot_id, 'value', 'Diversity', 'Embrace diverse perspectives', 'active'),
  (v_snapshot_id, 'value', 'Sustainability', 'Build for long-term success', 'active'),
  (v_snapshot_id, 'value', 'Learning', 'Continuously learn and improve', 'active'),
  (v_snapshot_id, 'value', 'Empowerment', 'Enable teams to make decisions', 'active'),
  (v_snapshot_id, 'value', 'Quality', 'Deliver high-quality outcomes', 'active')
  ON CONFLICT DO NOTHING;
  
  -- Insert North Stars
  INSERT INTO goals (snapshot_id, level, title, description, status) VALUES
  (v_snapshot_id, 'north_star', 'Customer Satisfaction Score > 9.0', 'Achieve industry-leading customer satisfaction', 'active'),
  (v_snapshot_id, 'north_star', 'Market Share Growth 25% YoY', 'Accelerate market share expansion', 'active')
  ON CONFLICT DO NOTHING;
  
  -- Insert Long Term Goals (6 goals)
  INSERT INTO goals (snapshot_id, level, title, description, status) VALUES
  (v_snapshot_id, 'long_term_goal', 'Digital Transformation Leadership', 'Lead industry in digital transformation initiatives', 'active'),
  (v_snapshot_id, 'long_term_goal', 'Global Expansion', 'Establish presence in 50+ countries', 'active'),
  (v_snapshot_id, 'long_term_goal', 'Platform Innovation', 'Build next-generation platform capabilities', 'active'),
  (v_snapshot_id, 'long_term_goal', 'Operational Excellence', 'Achieve operational efficiency targets', 'active'),
  (v_snapshot_id, 'long_term_goal', 'Talent Development', 'Build world-class talent organization', 'active'),
  (v_snapshot_id, 'long_term_goal', 'Sustainable Growth', 'Achieve profitable sustainable growth', 'active')
  ON CONFLICT DO NOTHING;
  
  -- Insert Long Term Strategies (16 strategies)
  INSERT INTO goals (snapshot_id, level, title, description, status) VALUES
  (v_snapshot_id, 'long_term_strategy', 'Cloud-Native Architecture', 'Migrate to cloud-native infrastructure', 'active'),
  (v_snapshot_id, 'long_term_strategy', 'AI/ML Integration', 'Integrate AI capabilities across platform', 'active'),
  (v_snapshot_id, 'long_term_strategy', 'API-First Design', 'Build comprehensive API ecosystem', 'active'),
  (v_snapshot_id, 'long_term_strategy', 'Mobile-First Experience', 'Optimize for mobile-first users', 'active'),
  (v_snapshot_id, 'long_term_strategy', 'Data Analytics Platform', 'Build advanced analytics capabilities', 'active'),
  (v_snapshot_id, 'long_term_strategy', 'Security & Compliance', 'Strengthen security and compliance posture', 'active'),
  (v_snapshot_id, 'long_term_strategy', 'Partner Ecosystem', 'Expand strategic partner network', 'active'),
  (v_snapshot_id, 'long_term_strategy', 'Customer Success Program', 'Build proactive customer success organization', 'active'),
  (v_snapshot_id, 'long_term_strategy', 'DevOps Excellence', 'Implement world-class DevOps practices', 'active'),
  (v_snapshot_id, 'long_term_strategy', 'Product Innovation', 'Accelerate product innovation cycles', 'active'),
  (v_snapshot_id, 'long_term_strategy', 'Market Expansion', 'Enter new geographic markets', 'active'),
  (v_snapshot_id, 'long_term_strategy', 'Brand Leadership', 'Build strong brand recognition', 'active'),
  (v_snapshot_id, 'long_term_strategy', 'Operational Automation', 'Automate operational processes', 'active'),
  (v_snapshot_id, 'long_term_strategy', 'Talent Acquisition', 'Attract top-tier talent', 'active'),
  (v_snapshot_id, 'long_term_strategy', 'Culture Development', 'Build high-performance culture', 'active'),
  (v_snapshot_id, 'long_term_strategy', 'Financial Optimization', 'Optimize financial performance', 'active')
  ON CONFLICT DO NOTHING;
  
END $$;