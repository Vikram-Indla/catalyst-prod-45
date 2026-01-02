-- Add test_cycle_board to board_type enum safely
ALTER TYPE board_type ADD VALUE IF NOT EXISTS 'test_cycle_board';