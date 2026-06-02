-- Add card_layout and card_colors columns to boards table
ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS card_layout text NOT NULL DEFAULT 'default' CHECK (card_layout IN ('default', 'compact')),
  ADD COLUMN IF NOT EXISTS card_colors jsonb NOT NULL DEFAULT '[]'::jsonb;
