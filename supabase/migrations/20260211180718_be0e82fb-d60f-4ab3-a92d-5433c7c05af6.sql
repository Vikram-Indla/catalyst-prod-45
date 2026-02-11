
INSERT INTO caty_prompt_templates (template_key, name, category, system_prompt, user_prompt_template, is_active, is_default, temperature, max_tokens, model)
VALUES (
  'test_data_generator',
  'Test Data Generator',
  'generation',
  'You are CATY AI™, an expert at generating realistic test data for QA testing scenarios. Generate diverse, edge-case-aware test data sets that cover boundary values, invalid inputs, and realistic production-like data.',
  'Generate test data for the following scenario: {{scenario}}. Include positive, negative, and boundary test data.',
  true,
  true,
  0.7,
  4096,
  'google/gemini-3-flash-preview'
);
