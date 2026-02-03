-- RLS Policies for t10_lists
CREATE POLICY "t10_lists_select" ON public.t10_lists FOR SELECT USING (true);
CREATE POLICY "t10_lists_insert" ON public.t10_lists FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "t10_lists_update" ON public.t10_lists FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "t10_lists_delete" ON public.t10_lists FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for t10_weeks
CREATE POLICY "t10_weeks_select" ON public.t10_weeks FOR SELECT USING (true);
CREATE POLICY "t10_weeks_insert" ON public.t10_weeks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "t10_weeks_update" ON public.t10_weeks FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "t10_weeks_delete" ON public.t10_weeks FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for t10_items
CREATE POLICY "t10_items_select" ON public.t10_items FOR SELECT USING (true);
CREATE POLICY "t10_items_insert" ON public.t10_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "t10_items_update" ON public.t10_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "t10_items_delete" ON public.t10_items FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for t10_activity
CREATE POLICY "t10_activity_select" ON public.t10_activity FOR SELECT USING (true);
CREATE POLICY "t10_activity_insert" ON public.t10_activity FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);