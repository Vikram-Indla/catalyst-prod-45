-- Make owner_id and created_by_id nullable for ideas (to allow seed data without users)
ALTER TABLE public.ideas 
ALTER COLUMN owner_id DROP NOT NULL,
ALTER COLUMN created_by_id DROP NOT NULL;

-- Now insert seed data
-- Insert sample idea groups (campaigns)
INSERT INTO public.idea_groups (
  id, name, category, is_enabled, is_public, 
  make_states_public, allow_voting, voting_type, 
  total_user_tokens, approve_external_users
) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Product Enhancement Ideas', 'Enhancement', true, true, true, true, 'ForAgainst', 100, false),
  ('22222222-2222-2222-2222-222222222222', 'Customer Feature Requests', 'Question', true, true, true, true, 'Token', 50, true),
  ('33333333-3333-3333-3333-333333333333', 'Support Ticket Ideas', 'Ticket', true, false, false, true, 'ForAgainst', 100, false)
ON CONFLICT (id) DO NOTHING;

-- Insert sample ideas for the first group
INSERT INTO public.ideas (
  id, idea_group_id, title, description, status, 
  t_shirt_size, is_public, vote_score, for_votes, against_votes,
  token_votes, comment_count
) VALUES 
  ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 
   'Dark Mode Support', 
   'Add a dark mode theme option for the application to reduce eye strain and improve accessibility for users who prefer darker interfaces.',
   'New', 'M', true, 5, 7, 2, 0, 2),
  
  ('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 
   'Keyboard Shortcuts', 
   'Implement comprehensive keyboard shortcuts for power users to navigate and perform common actions without using the mouse.',
   'Open', 'S', true, 12, 14, 2, 0, 5),
  
  ('aaaa3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 
   'Export to PDF', 
   'Allow users to export reports and dashboards directly to PDF format for easy sharing and printing.',
   'Planned', 'L', true, 8, 10, 2, 0, 3),
  
  ('aaaa4444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 
   'Mobile App', 
   'Develop a native mobile application for iOS and Android platforms to enable on-the-go access.',
   'New', 'XL', true, 15, 18, 3, 0, 8),
  
  ('aaaa5555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 
   'Two-Factor Authentication', 
   'Add two-factor authentication support for enhanced security, supporting authenticator apps and SMS.',
   'Completed', 'M', true, 20, 22, 2, 0, 4),
  
  ('aaaa6666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 
   'Bulk Import Feature', 
   'Enable bulk importing of data via CSV or Excel files to streamline data migration and updates.',
   'Open', 'M', true, 6, 8, 2, 0, 1),
  
  ('aaaa7777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 
   'API Rate Limiting Dashboard', 
   'Create a dashboard showing API usage and rate limit status for developers integrating with our platform.',
   'Shelved', 'S', true, -2, 3, 5, 0, 2),

  ('bbbb1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 
   'Custom Dashboards', 
   'Allow users to create custom dashboards with drag-and-drop widgets for personalized views.',
   'New', 'L', true, 25, 0, 0, 25, 6),
  
  ('bbbb2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 
   'Integration with Slack', 
   'Native Slack integration for notifications and commands directly within Slack channels.',
   'Open', 'M', true, 18, 0, 0, 18, 3)
ON CONFLICT (id) DO NOTHING;