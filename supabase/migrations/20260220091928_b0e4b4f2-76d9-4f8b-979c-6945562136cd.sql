-- Allow anonymous read access for preview/demo purposes on goals module tables
CREATE POLICY "Allow anon read es_goals" ON es_goals FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read es_key_results" ON es_key_results FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read es_strategic_themes" ON es_strategic_themes FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read es_kr_checkins" ON es_kr_checkins FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read es_goal_initiatives" ON es_goal_initiatives FOR SELECT TO anon USING (true);