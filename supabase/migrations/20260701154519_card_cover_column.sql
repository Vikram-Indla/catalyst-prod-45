-- Card cover strap (Jira parity). One free-form text column holding whatever
-- CSS background value the SelectCoverPanel yields — a hex ("#DBE4FF"), a
-- linear-gradient() expression, or an image URL. Rendered by <Card> as a
-- top strap; also by detail views (modal, sidebar, full page).
alter table public.ph_issues         add column if not exists cover text;
alter table public.business_requests add column if not exists cover text;
alter table public.tasks             add column if not exists cover text;
alter table public.rh_releases       add column if not exists cover text;
alter table public.tm_test_cases     add column if not exists cover text;
