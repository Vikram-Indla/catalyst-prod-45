-- Set production deploy gate to disabled by default
-- Gate is manually enabled from the deploy dashboard when user wants to deploy
UPDATE deploy_gate SET production_deploy_enabled = false, disabled_at = now() WHERE id = 1;

-- Ensure the row exists if it doesn't yet
INSERT INTO deploy_gate (id, production_deploy_enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;
