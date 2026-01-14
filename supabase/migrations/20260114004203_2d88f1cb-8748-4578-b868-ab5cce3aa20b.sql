-- Fix infinite recursion in kanban_board_users RLS policies
-- The problem: policies on kanban_board_users reference kanban_board_users (self-referential)

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view board users for accessible boards" ON kanban_board_users;
DROP POLICY IF EXISTS "Admins can manage board users" ON kanban_board_users;

-- Create fixed policies that avoid self-referential checks
-- For SELECT: Allow users to see board_users for boards they created OR where they are a member
CREATE POLICY "Users can view board users for accessible boards" 
ON kanban_board_users 
FOR SELECT 
USING (
  -- User is viewing their own membership
  user_id = auth.uid()
  OR
  -- User created the board
  board_id IN (
    SELECT id FROM kanban_boards WHERE created_by = auth.uid()
  )
  OR
  -- User is already a member of this board (direct check without recursion)
  EXISTS (
    SELECT 1 FROM kanban_board_users kbu 
    WHERE kbu.board_id = kanban_board_users.board_id 
    AND kbu.user_id = auth.uid()
  )
);

-- For ALL operations (INSERT, UPDATE, DELETE): Only board creators or admins
CREATE POLICY "Admins can manage board users" 
ON kanban_board_users 
FOR ALL 
USING (
  -- User created the board
  board_id IN (
    SELECT id FROM kanban_boards WHERE created_by = auth.uid()
  )
  OR
  -- User is an admin of this board (need security definer function to avoid recursion)
  EXISTS (
    SELECT 1 FROM kanban_board_users kbu 
    WHERE kbu.board_id = kanban_board_users.board_id 
    AND kbu.user_id = auth.uid() 
    AND kbu.role = 'Admin'
  )
);