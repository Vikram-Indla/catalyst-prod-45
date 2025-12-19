-- Allow non-feature dependencies by making legacy feature columns optional
ALTER TABLE public.dependencies
  ALTER COLUMN from_feature_id DROP NOT NULL,
  ALTER COLUMN to_feature_id DROP NOT NULL;
