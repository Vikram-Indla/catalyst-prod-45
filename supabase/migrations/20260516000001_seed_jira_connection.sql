-- Seed ph_jira_connection with valid Jira API token
DELETE FROM ph_jira_connection WHERE auth_email = 'vikramataol@gmail.com';

INSERT INTO ph_jira_connection (
  site_url,
  auth_email,
  auth_token_encrypted,
  status
) VALUES (
  'https://digital-transformation.atlassian.net',
  'vikramataol@gmail.com',
  'ATATT3xFfGF0vGCSn8OMnNTHdgsIjw28DLNQOhNy_yhpQm1ZHc9-ShuEPYJfMDXK3QoOS49ajkRq7Ztgv4tdfiozyWOZ8gBHYUzDYS7LJ_2686THkn9xbO8vjp4DT_CD-ry0EJ_zr01wplmZu1227TpsFFF9ke2aymJSUTbYfxD-WmrywYj9yJE=3BE31D15',
  'connected'
);
