-- Kanban Boards Module Database Schema
-- Based on Jira Align Kanban functionality

-- Table 1: kanban_boards
CREATE TABLE IF NOT EXISTS kanban_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
  card_types JSONB DEFAULT '["Epic", "Feature", "Story"]'::jsonb,
  settings JSONB DEFAULT '{"mapColumnStates": true, "showTags": true, "showTeam": false, "smallCards": false, "macroView": false, "showExitCriteria": false}'::jsonb,
  allow_overloading BOOLEAN DEFAULT false,
  allow_state_mapping BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: kanban_columns
CREATE TABLE IF NOT EXISTS kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES kanban_boards(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  column_type VARCHAR(50) NOT NULL CHECK (column_type IN ('Not Started', 'In Progress', 'Completed', 'Accepted')),
  wip_limit INTEGER,
  exit_criteria TEXT,
  sort_order INTEGER DEFAULT 0,
  state_mappings JSONB DEFAULT '[]'::jsonb,
  parent_column_id UUID REFERENCES kanban_columns(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: kanban_swim_lanes
CREATE TABLE IF NOT EXISTS kanban_swim_lanes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES kanban_boards(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  wip_limit INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_collapsed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 4: kanban_cards
CREATE TABLE IF NOT EXISTS kanban_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES kanban_boards(id) ON DELETE CASCADE,
  column_id UUID REFERENCES kanban_columns(id),
  swim_lane_id UUID REFERENCES kanban_swim_lanes(id),
  work_item_type VARCHAR(50) NOT NULL,
  work_item_id UUID NOT NULL,
  sort_order INTEGER DEFAULT 0,
  card_type VARCHAR(50) DEFAULT 'Default',
  color VARCHAR(50),
  is_blocked BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 5: kanban_card_history
CREATE TABLE IF NOT EXISTS kanban_card_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES kanban_cards(id) ON DELETE CASCADE,
  from_column_id UUID REFERENCES kanban_columns(id),
  to_column_id UUID REFERENCES kanban_columns(id),
  moved_by UUID REFERENCES auth.users(id),
  moved_at TIMESTAMPTZ DEFAULT NOW(),
  wip_override_reason TEXT
);

-- Table 6: kanban_board_users
CREATE TABLE IF NOT EXISTS kanban_board_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES kanban_boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Edit Boards', 'Manage Cards', 'View Cards')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_kanban_boards_team ON kanban_boards(team_id);
CREATE INDEX idx_kanban_boards_program ON kanban_boards(program_id);
CREATE INDEX idx_kanban_boards_portfolio ON kanban_boards(portfolio_id);
CREATE INDEX idx_kanban_columns_board ON kanban_columns(board_id);
CREATE INDEX idx_kanban_columns_sort ON kanban_columns(board_id, sort_order);
CREATE INDEX idx_kanban_swim_lanes_board ON kanban_swim_lanes(board_id);
CREATE INDEX idx_kanban_cards_board ON kanban_cards(board_id);
CREATE INDEX idx_kanban_cards_column ON kanban_cards(column_id);
CREATE INDEX idx_kanban_cards_work_item ON kanban_cards(work_item_type, work_item_id);
CREATE INDEX idx_kanban_card_history_card ON kanban_card_history(card_id);
CREATE INDEX idx_kanban_board_users_board ON kanban_board_users(board_id);
CREATE INDEX idx_kanban_board_users_user ON kanban_board_users(user_id);

-- RLS Policies
ALTER TABLE kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_swim_lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_card_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_board_users ENABLE ROW LEVEL SECURITY;

-- Boards: Users can view boards they have access to
CREATE POLICY "Users can view boards they have access to"
  ON kanban_boards FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM kanban_board_users WHERE board_id = kanban_boards.id
    )
    OR created_by = auth.uid()
  );

-- Boards: Users with Admin or Edit Boards role can update
CREATE POLICY "Users with Admin or Edit Boards role can update boards"
  ON kanban_boards FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM kanban_board_users 
      WHERE board_id = kanban_boards.id 
      AND role IN ('Admin', 'Edit Boards')
    )
    OR created_by = auth.uid()
  );

-- Boards: Authenticated users can create boards
CREATE POLICY "Authenticated users can create boards"
  ON kanban_boards FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Boards: Only board creators or admins can delete
CREATE POLICY "Board creators or admins can delete boards"
  ON kanban_boards FOR DELETE
  USING (
    created_by = auth.uid()
    OR auth.uid() IN (
      SELECT user_id FROM kanban_board_users 
      WHERE board_id = kanban_boards.id 
      AND role = 'Admin'
    )
  );

-- Columns: Users can view columns for boards they have access to
CREATE POLICY "Users can view columns for accessible boards"
  ON kanban_columns FOR SELECT
  USING (
    board_id IN (
      SELECT id FROM kanban_boards 
      WHERE auth.uid() IN (
        SELECT user_id FROM kanban_board_users WHERE board_id = kanban_boards.id
      )
      OR created_by = auth.uid()
    )
  );

-- Columns: Users with Admin or Edit Boards role can manage columns
CREATE POLICY "Users with Admin or Edit Boards role can manage columns"
  ON kanban_columns FOR ALL
  USING (
    board_id IN (
      SELECT b.id FROM kanban_boards b
      JOIN kanban_board_users u ON u.board_id = b.id
      WHERE u.user_id = auth.uid() AND u.role IN ('Admin', 'Edit Boards')
    )
  );

-- Swim Lanes: Similar policies as columns
CREATE POLICY "Users can view swim lanes for accessible boards"
  ON kanban_swim_lanes FOR SELECT
  USING (
    board_id IN (
      SELECT id FROM kanban_boards 
      WHERE auth.uid() IN (
        SELECT user_id FROM kanban_board_users WHERE board_id = kanban_boards.id
      )
      OR created_by = auth.uid()
    )
  );

CREATE POLICY "Users with Admin or Edit Boards role can manage swim lanes"
  ON kanban_swim_lanes FOR ALL
  USING (
    board_id IN (
      SELECT b.id FROM kanban_boards b
      JOIN kanban_board_users u ON u.board_id = b.id
      WHERE u.user_id = auth.uid() AND u.role IN ('Admin', 'Edit Boards')
    )
  );

-- Cards: Users can view cards for accessible boards
CREATE POLICY "Users can view cards for accessible boards"
  ON kanban_cards FOR SELECT
  USING (
    board_id IN (
      SELECT id FROM kanban_boards 
      WHERE auth.uid() IN (
        SELECT user_id FROM kanban_board_users WHERE board_id = kanban_boards.id
      )
      OR created_by = auth.uid()
    )
  );

-- Cards: Users with Manage Cards role or higher can manage cards
CREATE POLICY "Users with Manage Cards role can manage cards"
  ON kanban_cards FOR ALL
  USING (
    board_id IN (
      SELECT b.id FROM kanban_boards b
      JOIN kanban_board_users u ON u.board_id = b.id
      WHERE u.user_id = auth.uid() AND u.role IN ('Admin', 'Edit Boards', 'Manage Cards')
    )
  );

-- Card History: Users can view history for accessible boards
CREATE POLICY "Users can view card history for accessible boards"
  ON kanban_card_history FOR SELECT
  USING (
    card_id IN (
      SELECT id FROM kanban_cards 
      WHERE board_id IN (
        SELECT id FROM kanban_boards 
        WHERE auth.uid() IN (
          SELECT user_id FROM kanban_board_users WHERE board_id = kanban_boards.id
        )
        OR created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert card history"
  ON kanban_card_history FOR INSERT
  WITH CHECK (
    card_id IN (
      SELECT id FROM kanban_cards 
      WHERE board_id IN (
        SELECT b.id FROM kanban_boards b
        JOIN kanban_board_users u ON u.board_id = b.id
        WHERE u.user_id = auth.uid() AND u.role IN ('Admin', 'Edit Boards', 'Manage Cards')
      )
    )
  );

-- Board Users: Admins can manage board users
CREATE POLICY "Users can view board users for accessible boards"
  ON kanban_board_users FOR SELECT
  USING (
    board_id IN (
      SELECT id FROM kanban_boards 
      WHERE auth.uid() IN (
        SELECT user_id FROM kanban_board_users WHERE board_id = kanban_boards.id
      )
      OR created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can manage board users"
  ON kanban_board_users FOR ALL
  USING (
    board_id IN (
      SELECT b.id FROM kanban_boards b
      JOIN kanban_board_users u ON u.board_id = b.id
      WHERE u.user_id = auth.uid() AND u.role = 'Admin'
    )
    OR board_id IN (
      SELECT id FROM kanban_boards WHERE created_by = auth.uid()
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_kanban_boards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kanban_boards_timestamp
  BEFORE UPDATE ON kanban_boards
  FOR EACH ROW
  EXECUTE FUNCTION update_kanban_boards_updated_at();