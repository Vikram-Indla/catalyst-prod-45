-- Fix boards.project_id FK: was referencing legacy `projects` table,
-- should reference `ph_projects` which is what the app routes use.
ALTER TABLE public.boards
  DROP CONSTRAINT IF EXISTS boards_project_id_fkey;

ALTER TABLE public.boards
  ADD CONSTRAINT boards_project_id_fkey
    FOREIGN KEY (project_id)
    REFERENCES public.ph_projects(id)
    ON DELETE SET NULL;
