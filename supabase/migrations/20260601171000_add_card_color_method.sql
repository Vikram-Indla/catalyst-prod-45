-- Add card_color_method to boards (missed in 20260601170000)
ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS card_color_method text NOT NULL DEFAULT 'none';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'boards_card_color_method_check') THEN
    ALTER TABLE public.boards ADD CONSTRAINT boards_card_color_method_check
      CHECK (card_color_method IN ('none', 'issue_type', 'priorities', 'assignees', 'jql'));
  END IF;
END $$;
