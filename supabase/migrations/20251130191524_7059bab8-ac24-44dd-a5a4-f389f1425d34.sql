-- Seed comprehensive Stories data with complete linkages
-- Using first available profile for all data

INSERT INTO public.stories (id, name, description, acceptance_criteria, status, feature_id, team_id, sprint_id, assignee_id, estimate_points, points_loe, created_at) VALUES
-- Stories linked to existing Features
('11111111-1111-1111-1111-111111111111', 'User Login Authentication', 'Implement secure user login with email and password', E'Given a user has valid credentials\nWhen they submit the login form\nThen they should be authenticated and redirected to dashboard', 'in_progress', (SELECT id FROM features LIMIT 1 OFFSET 0), (SELECT id FROM teams LIMIT 1 OFFSET 0), (SELECT id FROM iterations WHERE name LIKE '%Sprint%' LIMIT 1 OFFSET 0), (SELECT id FROM profiles LIMIT 1), 5, 8, NOW() - INTERVAL '10 days'),

('22222222-2222-2222-2222-222222222222', 'Password Reset Functionality', 'Allow users to reset forgotten passwords via email', E'Given a user forgot their password\nWhen they request a reset\nThen they should receive an email with reset link', 'todo', (SELECT id FROM features LIMIT 1 OFFSET 0), (SELECT id FROM teams LIMIT 1 OFFSET 0), (SELECT id FROM iterations WHERE name LIKE '%Sprint%' LIMIT 1 OFFSET 0), NULL, 3, 5, NOW() - INTERVAL '8 days'),

('33333333-3333-3333-3333-333333333333', 'Social Login Integration', 'Add Google and GitHub OAuth login options', E'Given a user wants to login with social account\nWhen they click social login button\nThen they should be authenticated via OAuth provider', 'done', (SELECT id FROM features LIMIT 1 OFFSET 0), (SELECT id FROM teams LIMIT 1 OFFSET 0), (SELECT id FROM iterations WHERE name LIKE '%Sprint%' LIMIT 1 OFFSET 0), (SELECT id FROM profiles LIMIT 1), 8, 13, NOW() - INTERVAL '15 days'),

('44444444-4444-4444-4444-444444444444', 'Dashboard Analytics Widget', 'Create real-time analytics dashboard widget', E'Given admin is on dashboard\nWhen page loads\nThen analytics widget displays current metrics', 'in_progress', (SELECT id FROM features LIMIT 1 OFFSET 1), (SELECT id FROM teams LIMIT 1 OFFSET 0), (SELECT id FROM iterations WHERE name LIKE '%Sprint%' LIMIT 1 OFFSET 0), (SELECT id FROM profiles LIMIT 1), 13, 21, NOW() - INTERVAL '5 days'),

('55555555-5555-5555-5555-555555555555', 'Export Report to CSV', 'Add functionality to export dashboard reports as CSV', E'Given user wants to export data\nWhen they click export button\nThen CSV file should download with all current data', 'todo', (SELECT id FROM features LIMIT 1 OFFSET 1), (SELECT id FROM teams LIMIT 1 OFFSET 0), (SELECT id FROM iterations WHERE name LIKE '%Sprint%' LIMIT 1 OFFSET 0), NULL, 5, 8, NOW() - INTERVAL '3 days'),

('66666666-6666-6666-6666-666666666666', 'Custom Date Range Filter', 'Allow users to filter analytics by custom date ranges', E'Given user wants specific date range\nWhen they select start and end dates\nThen dashboard updates with filtered data', 'done', (SELECT id FROM features LIMIT 1 OFFSET 1), (SELECT id FROM teams LIMIT 1 OFFSET 0), (SELECT id FROM iterations WHERE name LIKE '%Sprint%' LIMIT 1 OFFSET 0), (SELECT id FROM profiles LIMIT 1), 8, 13, NOW() - INTERVAL '20 days'),

('77777777-7777-7777-7777-777777777777', 'Notification Bell Component', 'Create notification bell with unread count badge', E'Given user has unread notifications\nWhen they view header\nThen bell icon displays unread count', 'done', (SELECT id FROM features LIMIT 1 OFFSET 2), (SELECT id FROM teams LIMIT 1 OFFSET 0), (SELECT id FROM iterations WHERE name LIKE '%Sprint%' LIMIT 1 OFFSET 0), (SELECT id FROM profiles LIMIT 1), 5, 8, NOW() - INTERVAL '18 days'),

('88888888-8888-8888-8888-888888888888', 'Real-time Notification Updates', 'Implement WebSocket for real-time notification delivery', E'Given system generates notification\nWhen event occurs\nThen user receives notification instantly without refresh', 'in_progress', (SELECT id FROM features LIMIT 1 OFFSET 2), (SELECT id FROM teams LIMIT 1 OFFSET 0), (SELECT id FROM iterations WHERE name LIKE '%Sprint%' LIMIT 1 OFFSET 0), (SELECT id FROM profiles LIMIT 1), 13, 21, NOW() - INTERVAL '7 days'),

('99999999-9999-9999-9999-999999999999', 'Notification Preferences Page', 'Allow users to customize notification settings', E'Given user wants to manage notifications\nWhen they navigate to preferences\nThen they can enable/disable notification types', 'todo', (SELECT id FROM features LIMIT 1 OFFSET 2), (SELECT id FROM teams LIMIT 1 OFFSET 0), (SELECT id FROM iterations WHERE name LIKE '%Sprint%' LIMIT 1 OFFSET 0), NULL, 8, 13, NOW() - INTERVAL '4 days'),

('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'API Rate Limiting', 'Implement rate limiting for public API endpoints', E'Given API receives excessive requests\nWhen rate limit exceeded\nThen return 429 status with retry-after header', 'todo', (SELECT id FROM features LIMIT 1 OFFSET 3), (SELECT id FROM teams LIMIT 1 OFFSET 0), (SELECT id FROM iterations WHERE name LIKE '%Sprint%' LIMIT 1 OFFSET 0), NULL, 8, 13, NOW() - INTERVAL '2 days'),

('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'User Profile Avatar Upload', 'Allow users to upload custom profile pictures', E'Given user wants custom avatar\nWhen they upload image\nThen avatar updates across all views', 'in_progress', (SELECT id FROM features LIMIT 1 OFFSET 4), (SELECT id FROM teams LIMIT 1 OFFSET 0), (SELECT id FROM iterations WHERE name LIKE '%Sprint%' LIMIT 1 OFFSET 0), (SELECT id FROM profiles LIMIT 1), 5, 8, NOW() - INTERVAL '6 days'),

('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Search Autocomplete', 'Add autocomplete suggestions to main search bar', E'Given user types in search\nWhen 3+ characters entered\nThen display relevant autocomplete suggestions', 'done', (SELECT id FROM features LIMIT 1 OFFSET 5), (SELECT id FROM teams LIMIT 1 OFFSET 0), (SELECT id FROM iterations WHERE name LIKE '%Sprint%' LIMIT 1 OFFSET 0), (SELECT id FROM profiles LIMIT 1), 8, 13, NOW() - INTERVAL '25 days');

-- Insert Subtasks for Stories
INSERT INTO public.subtasks (id, name, description, status, story_id, assignee_id, created_at) VALUES
(gen_random_uuid(), 'Design login form UI', 'Create responsive login form with email/password fields', 'done', '11111111-1111-1111-1111-111111111111', (SELECT id FROM profiles LIMIT 1), NOW() - INTERVAL '9 days'),
(gen_random_uuid(), 'Implement backend authentication', 'Set up JWT token generation and validation', 'in_progress', '11111111-1111-1111-1111-111111111111', (SELECT id FROM profiles LIMIT 1), NOW() - INTERVAL '8 days'),
(gen_random_uuid(), 'Add form validation', 'Client and server-side validation for login inputs', 'todo', '11111111-1111-1111-1111-111111111111', NULL, NOW() - INTERVAL '7 days'),
(gen_random_uuid(), 'Create widget skeleton component', 'Set up basic widget structure with loading state', 'done', '44444444-4444-4444-4444-444444444444', (SELECT id FROM profiles LIMIT 1), NOW() - INTERVAL '5 days'),
(gen_random_uuid(), 'Integrate analytics API', 'Connect widget to analytics data endpoints', 'in_progress', '44444444-4444-4444-4444-444444444444', (SELECT id FROM profiles LIMIT 1), NOW() - INTERVAL '4 days'),
(gen_random_uuid(), 'Add chart visualization', 'Implement charts using recharts library', 'todo', '44444444-4444-4444-4444-444444444444', NULL, NOW() - INTERVAL '3 days'),
(gen_random_uuid(), 'Design notification dropdown', 'Create notification list dropdown component', 'done', '77777777-7777-7777-7777-777777777777', (SELECT id FROM profiles LIMIT 1), NOW() - INTERVAL '17 days'),
(gen_random_uuid(), 'Implement mark as read', 'Add functionality to mark notifications as read', 'done', '77777777-7777-7777-7777-777777777777', (SELECT id FROM profiles LIMIT 1), NOW() - INTERVAL '16 days'),
(gen_random_uuid(), 'Set up WebSocket server', 'Configure WebSocket connection handler', 'done', '88888888-8888-8888-8888-888888888888', (SELECT id FROM profiles LIMIT 1), NOW() - INTERVAL '6 days'),
(gen_random_uuid(), 'Create client WebSocket hook', 'Build React hook for WebSocket connection', 'in_progress', '88888888-8888-8888-8888-888888888888', (SELECT id FROM profiles LIMIT 1), NOW() - INTERVAL '5 days');

-- Insert Discussions for Stories
INSERT INTO public.discussions (entity_type, entity_id, user_id, message, created_at) VALUES
('stories', '11111111-1111-1111-1111-111111111111', (SELECT id FROM profiles LIMIT 1), 'Started working on the JWT implementation. Using jsonwebtoken library.', NOW() - INTERVAL '8 days'),
('stories', '11111111-1111-1111-1111-111111111111', (SELECT id FROM profiles LIMIT 1), 'Make sure to include refresh token logic as well.', NOW() - INTERVAL '7 days'),
('stories', '11111111-1111-1111-1111-111111111111', (SELECT id FROM profiles LIMIT 1), 'Good point! Will add refresh token rotation for better security.', NOW() - INTERVAL '7 days'),
('stories', '44444444-4444-4444-4444-444444444444', (SELECT id FROM profiles LIMIT 1), 'Which charting library should we use? Recharts or Chart.js?', NOW() - INTERVAL '5 days'),
('stories', '44444444-4444-4444-4444-444444444444', (SELECT id FROM profiles LIMIT 1), 'Recharts works better with React. Lets go with that.', NOW() - INTERVAL '4 days'),
('stories', '88888888-8888-8888-8888-888888888888', (SELECT id FROM profiles LIMIT 1), 'WebSocket server is running. Testing connection stability.', NOW() - INTERVAL '6 days'),
('stories', '88888888-8888-8888-8888-888888888888', (SELECT id FROM profiles LIMIT 1), 'Do not forget to implement reconnection logic for dropped connections.', NOW() - INTERVAL '5 days'),
('stories', '99999999-9999-9999-9999-999999999999', (SELECT id FROM profiles LIMIT 1), 'This story is on hold waiting for the notification service API to be finalized.', NOW() - INTERVAL '3 days'),
('stories', '99999999-9999-9999-9999-999999999999', (SELECT id FROM profiles LIMIT 1), 'API spec should be ready by end of week.', NOW() - INTERVAL '2 days');

-- Insert Activity Logs for Stories
INSERT INTO public.activity_logs (entity_type, entity_id, action, actor_id, before_json, after_json, created_at) VALUES
('stories', '11111111-1111-1111-1111-111111111111', 'INSERT', (SELECT id FROM profiles LIMIT 1), NULL, '{"name":"User Login Authentication","status":"todo"}'::jsonb, NOW() - INTERVAL '10 days'),
('stories', '11111111-1111-1111-1111-111111111111', 'UPDATE', (SELECT id FROM profiles LIMIT 1), '{"status":"todo"}'::jsonb, '{"status":"in_progress"}'::jsonb, NOW() - INTERVAL '8 days'),
('stories', '33333333-3333-3333-3333-333333333333', 'UPDATE', (SELECT id FROM profiles LIMIT 1), '{"status":"in_progress"}'::jsonb, '{"status":"done"}'::jsonb, NOW() - INTERVAL '14 days'),
('stories', '66666666-6666-6666-6666-666666666666', 'UPDATE', (SELECT id FROM profiles LIMIT 1), '{"status":"in_progress"}'::jsonb, '{"status":"done"}'::jsonb, NOW() - INTERVAL '19 days');