-- Drop the UNIQUE(board_id, position) constraint on board_columns.
-- Position is used only for ordering; the uniqueness constraint causes silent
-- upsert failures when reordering columns (two rows temporarily share a position
-- mid-batch, violating the constraint before the swap completes).
ALTER TABLE board_columns DROP CONSTRAINT IF EXISTS board_columns_board_id_position_key;
