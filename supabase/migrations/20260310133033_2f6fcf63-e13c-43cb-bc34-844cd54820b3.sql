-- Restrict planhub_ai_config SELECT to admins only (was USING (true))
DROP POLICY IF EXISTS "AI config viewable by authenticated users" ON planhub_ai_config;
CREATE POLICY "AI config admin select"
  ON planhub_ai_config FOR SELECT
  TO authenticated
  USING (planhub_is_admin());