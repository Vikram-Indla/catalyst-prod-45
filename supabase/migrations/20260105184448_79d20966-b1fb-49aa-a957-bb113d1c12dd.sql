-- Add test steps for the new test cases
INSERT INTO tm_test_steps (test_case_id, step_number, action, expected_result, test_data)
SELECT id, 1, 'Navigate to Profile Settings', 'Profile form loads with current user data', 'URL: /settings/profile'
FROM tm_test_cases WHERE case_key = 'TC-011'
UNION ALL
SELECT id, 2, 'Modify first name field', 'Field accepts new value', 'New value: UpdatedName'
FROM tm_test_cases WHERE case_key = 'TC-011'
UNION ALL
SELECT id, 3, 'Click Save Changes', 'Success toast appears, data persisted', NULL
FROM tm_test_cases WHERE case_key = 'TC-011'
UNION ALL
SELECT id, 1, 'Navigate to API documentation', 'API docs page loads', 'URL: /api/docs'
FROM tm_test_cases WHERE case_key = 'TC-015'
UNION ALL
SELECT id, 2, 'Send GET request to /api/users', 'Response status 200', 'Headers: Authorization: Bearer {token}'
FROM tm_test_cases WHERE case_key = 'TC-015'
UNION ALL
SELECT id, 3, 'Verify response body structure', 'JSON array of user objects returned', NULL
FROM tm_test_cases WHERE case_key = 'TC-015'
ON CONFLICT DO NOTHING;