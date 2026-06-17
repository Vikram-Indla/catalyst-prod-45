-- Stores the user-selected icon key from the create-project wizard's icon
-- picker. Value is a PROJECT_ICONS filename stem (e.g. 'rocket'), resolved to
-- the bundled SVG url at render time. Nullable: legacy rows + pre-pick state.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS icon text;

COMMENT ON COLUMN public.projects.icon IS
  'Catalyst icon picker key (PROJECT_ICONS filename stem). Resolved to bundled SVG at render. Set by create-project wizard. Nullable.';
