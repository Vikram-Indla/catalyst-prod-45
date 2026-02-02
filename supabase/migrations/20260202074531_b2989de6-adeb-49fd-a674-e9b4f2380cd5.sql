-- ═══════════════════════════════════════════════════════════════════════════════
-- Task¹⁰ SEED DATA v1.0.0
-- 
-- Purpose: Comprehensive test data for ALL Task¹⁰ functions
-- Execute AFTER the main schema migration
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  -- User IDs
  v_user_1 UUID;
  v_user_2 UUID;
  v_user_3 UUID;
  
  -- List IDs
  v_list_main UUID;
  v_list_secondary UUID;
  
  -- Week IDs
  v_week_current UUID;
  v_week_previous UUID;
  v_week_archived UUID;
  v_week_secondary UUID;
  
  -- Label IDs
  v_label_finance UUID;
  v_label_urgent UUID;
  v_label_tech UUID;
  v_label_sales UUID;
  v_label_hr UUID;
  v_label_q1 UUID;
  v_label_ops UUID;
  v_label_legal UUID;
  
  -- Item IDs
  v_item_1 UUID;
  v_item_2 UUID;
  v_item_3 UUID;
  v_item_4 UUID;
  v_item_5 UUID;
  v_item_6 UUID;
  v_item_7 UUID;
  v_item_8 UUID;
  v_item_9 UUID;
  v_item_10 UUID;
  v_item_11 UUID;
  v_item_12 UUID;
  
  -- Date calculations
  v_today DATE := CURRENT_DATE;
  v_week_start DATE := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  v_week_end DATE := (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '4 days')::DATE;
  v_prev_week_start DATE := (DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days')::DATE;
  v_prev_week_end DATE := (DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '3 days')::DATE;
  v_old_week_start DATE := (DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '14 days')::DATE;
  v_old_week_end DATE := (DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '10 days')::DATE;
  v_current_week_num INT := EXTRACT(WEEK FROM CURRENT_DATE)::INT;
  v_current_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Task¹⁰ SEED DATA - Starting...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';

  -- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  -- ┃ STEP 1: GET TEST USERS                                                     ┃
  -- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  
  SELECT id INTO v_user_1 FROM profiles ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_user_2 FROM profiles ORDER BY created_at ASC LIMIT 1 OFFSET 1;
  SELECT id INTO v_user_3 FROM profiles ORDER BY created_at ASC LIMIT 1 OFFSET 2;
  
  IF v_user_1 IS NULL THEN
    RAISE NOTICE '⚠️ No users found - using NULL for user references';
  ELSE
    RAISE NOTICE '✓ User 1: %', v_user_1;
  END IF;
  
  -- Fallback to user_1 if others don't exist
  IF v_user_2 IS NULL THEN v_user_2 := v_user_1; END IF;
  IF v_user_3 IS NULL THEN v_user_3 := v_user_1; END IF;

  -- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  -- ┃ STEP 2: CREATE LISTS                                                       ┃
  -- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  
  -- Main Priority List (pinned)
  INSERT INTO aqd_lists (name, description, created_by, is_pinned, settings)
  VALUES (
    'Weekly Team Priorities',
    'Main priority list for the Catalyst team. Track your top 10 weekly priorities.',
    v_user_1,
    true,
    '{"max_items": 10, "overflow_max": 10, "auto_checkout": false, "week_start_day": 1, "notify_carryover": true}'::jsonb
  )
  RETURNING id INTO v_list_main;
  RAISE NOTICE '✓ Main list: %', v_list_main;

  -- Secondary List (not pinned)
  INSERT INTO aqd_lists (name, description, created_by, is_pinned)
  VALUES (
    'Personal Development',
    'Track personal learning and growth objectives.',
    v_user_1,
    false
  )
  RETURNING id INTO v_list_secondary;
  RAISE NOTICE '✓ Secondary list: %', v_list_secondary;

  -- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  -- ┃ STEP 3: CREATE LABELS (All 8 Colors)                                       ┃
  -- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  
  INSERT INTO aqd_labels (list_id, name, color, sort_order) VALUES (v_list_main, 'Finance', '#3b82f6', 1) RETURNING id INTO v_label_finance;
  INSERT INTO aqd_labels (list_id, name, color, sort_order) VALUES (v_list_main, 'Urgent', '#ef4444', 2) RETURNING id INTO v_label_urgent;
  INSERT INTO aqd_labels (list_id, name, color, sort_order) VALUES (v_list_main, 'Tech', '#8b5cf6', 3) RETURNING id INTO v_label_tech;
  INSERT INTO aqd_labels (list_id, name, color, sort_order) VALUES (v_list_main, 'Sales', '#f97316', 4) RETURNING id INTO v_label_sales;
  INSERT INTO aqd_labels (list_id, name, color, sort_order) VALUES (v_list_main, 'HR', '#ec4899', 5) RETURNING id INTO v_label_hr;
  INSERT INTO aqd_labels (list_id, name, color, sort_order) VALUES (v_list_main, 'Q1', '#22c55e', 6) RETURNING id INTO v_label_q1;
  INSERT INTO aqd_labels (list_id, name, color, sort_order) VALUES (v_list_main, 'Ops', '#06b6d4', 7) RETURNING id INTO v_label_ops;
  INSERT INTO aqd_labels (list_id, name, color, sort_order) VALUES (v_list_main, 'Legal', '#64748b', 8) RETURNING id INTO v_label_legal;
  RAISE NOTICE '✓ Created 8 labels';

  -- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  -- ┃ STEP 4: CREATE WEEKS                                                       ┃
  -- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  
  -- Archived week (2 weeks ago)
  INSERT INTO aqd_weeks (list_id, week_number, year, start_date, end_date, status, checked_out_by, checked_out_at, performance_summary)
  VALUES (
    v_list_main,
    CASE WHEN v_current_week_num > 2 THEN v_current_week_num - 2 ELSE 52 + v_current_week_num - 2 END,
    CASE WHEN v_current_week_num > 2 THEN v_current_year ELSE v_current_year - 1 END,
    v_old_week_start, v_old_week_end, 'archived',
    v_user_1, now() - INTERVAL '14 days',
    '{"resolved": 7, "carried": 2, "unresolved": 1, "completion_rate": 70}'::jsonb
  )
  RETURNING id INTO v_week_archived;
  RAISE NOTICE '✓ Archived week: %', v_week_archived;

  -- Previous week (for checkout testing)
  INSERT INTO aqd_weeks (list_id, week_number, year, start_date, end_date, status, performance_summary)
  VALUES (
    v_list_main,
    CASE WHEN v_current_week_num > 1 THEN v_current_week_num - 1 ELSE 52 END,
    CASE WHEN v_current_week_num > 1 THEN v_current_year ELSE v_current_year - 1 END,
    v_prev_week_start, v_prev_week_end, 'archived',
    '{"resolved": 5, "carried": 3, "unresolved": 2, "completion_rate": 50}'::jsonb
  )
  RETURNING id INTO v_week_previous;
  RAISE NOTICE '✓ Previous week: %', v_week_previous;

  -- Current week (active)
  INSERT INTO aqd_weeks (list_id, week_number, year, start_date, end_date, status)
  VALUES (v_list_main, v_current_week_num, v_current_year, v_week_start, v_week_end, 'active')
  RETURNING id INTO v_week_current;
  RAISE NOTICE '✓ Current week: %', v_week_current;
  
  -- Secondary list week
  INSERT INTO aqd_weeks (list_id, week_number, year, start_date, end_date, status)
  VALUES (v_list_secondary, v_current_week_num, v_current_year, v_week_start, v_week_end, 'active')
  RETURNING id INTO v_week_secondary;

  -- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  -- ┃ STEP 5: CREATE ITEMS - CURRENT WEEK (Top 10 + Overflow)                    ┃
  -- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  
  -- Item 1: COMPLETED + TaskHub + Labels + Notes
  INSERT INTO aqd_items (list_id, week_id, rank, title, description, status, assignee_id, taskhub_key, due_date, created_by)
  VALUES (v_list_main, v_week_current, 1, 
    'Finalize Q1 budget forecast with department heads',
    'Review all department submissions and consolidate into master budget document.',
    'completed', v_user_1, 'PLN-001', v_today + 2, v_user_1
  ) RETURNING id INTO v_item_1;

  -- Item 2: IN_PROGRESS + TaskHub + Assignee
  INSERT INTO aqd_items (list_id, week_id, rank, title, description, status, assignee_id, taskhub_key, due_date, created_by)
  VALUES (v_list_main, v_week_current, 2,
    'Review sales pipeline for February targets',
    'Analyze current pipeline health and identify at-risk deals.',
    'in_progress', v_user_2, 'PLN-002', v_today + 3, v_user_1
  ) RETURNING id INTO v_item_2;

  -- Item 3: NOT_STARTED + CARRYOVER (UNCONFIRMED) ← Tests carryover banner
  INSERT INTO aqd_items (list_id, week_id, rank, title, description, status, assignee_id, due_date, is_carryover, carryover_from_week_id, carryover_count, carryover_confirmed, created_by)
  VALUES (v_list_main, v_week_current, 3,
    'Complete vendor contract negotiations',
    'Finalize terms with top 3 vendors. Legal review pending.',
    'not_started', v_user_1, v_today + 5, 
    true, v_week_previous, 1, false, v_user_1
  ) RETURNING id INTO v_item_3;

  -- Item 4: IN_PROGRESS + TaskHub
  INSERT INTO aqd_items (list_id, week_id, rank, title, description, status, assignee_id, taskhub_key, created_by)
  VALUES (v_list_main, v_week_current, 4,
    'Architecture review for Phase 2 migration',
    'Document current state and proposed future architecture.',
    'in_progress', v_user_3, 'PLN-004', v_user_1
  ) RETURNING id INTO v_item_4;

  -- Item 5: NOT_STARTED (no TaskHub, no due date)
  INSERT INTO aqd_items (list_id, week_id, rank, title, description, status, assignee_id, created_by)
  VALUES (v_list_main, v_week_current, 5,
    'Interview senior engineering candidates',
    'Conduct final round interviews for 3 shortlisted candidates.',
    'not_started', v_user_2, v_user_1
  ) RETURNING id INTO v_item_5;

  -- Item 6: COMPLETED + TaskHub + Multi-labels
  INSERT INTO aqd_items (list_id, week_id, rank, title, description, status, assignee_id, taskhub_key, created_by)
  VALUES (v_list_main, v_week_current, 6,
    'Submit compliance documentation to regulatory body',
    'All quarterly compliance reports ready for submission.',
    'completed', v_user_1, 'PLN-006', v_user_1
  ) RETURNING id INTO v_item_6;

  -- Item 7: IN_PROGRESS + CARRYOVER (CONFIRMED) ← Tests confirmed carryover display
  INSERT INTO aqd_items (list_id, week_id, rank, title, description, status, is_carryover, carryover_from_week_id, carryover_count, carryover_confirmed, created_by)
  VALUES (v_list_main, v_week_current, 7,
    'Prepare board presentation deck',
    'Q1 results and Q2 outlook presentation.',
    'in_progress', true, v_week_previous, 2, true, v_user_1
  ) RETURNING id INTO v_item_7;

  -- Item 8: NOT_STARTED + Due Date
  INSERT INTO aqd_items (list_id, week_id, rank, title, description, status, assignee_id, due_date, created_by)
  VALUES (v_list_main, v_week_current, 8,
    'Review and approve marketing campaign assets',
    'Final approval needed for Q2 campaign launch materials.',
    'not_started', v_user_2, v_today + 4, v_user_1
  ) RETURNING id INTO v_item_8;

  -- Item 9: COMPLETED + TaskHub
  INSERT INTO aqd_items (list_id, week_id, rank, title, status, taskhub_key, created_by)
  VALUES (v_list_main, v_week_current, 9,
    'Deploy hotfix for customer portal authentication',
    'completed', 'PLN-009', v_user_1
  ) RETURNING id INTO v_item_9;

  -- Item 10: NOT_STARTED (minimal - no assignee, no due date, no description)
  INSERT INTO aqd_items (list_id, week_id, rank, title, status, created_by)
  VALUES (v_list_main, v_week_current, 10,
    'Schedule quarterly all-hands meeting',
    'not_started', v_user_1
  ) RETURNING id INTO v_item_10;

  -- Item 11: OVERFLOW - NOT_STARTED
  INSERT INTO aqd_items (list_id, week_id, rank, title, description, status, assignee_id, created_by)
  VALUES (v_list_main, v_week_current, 11,
    'Update employee handbook with new policies',
    'Include remote work guidelines and updated PTO policy.',
    'not_started', v_user_3, v_user_1
  ) RETURNING id INTO v_item_11;

  -- Item 12: OVERFLOW - IN_PROGRESS
  INSERT INTO aqd_items (list_id, week_id, rank, title, status, taskhub_key, created_by)
  VALUES (v_list_main, v_week_current, 12,
    'Research competitor pricing strategies',
    'in_progress', 'PLN-012', v_user_1
  ) RETURNING id INTO v_item_12;

  RAISE NOTICE '✓ Created 12 items (10 top + 2 overflow)';

  -- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  -- ┃ STEP 6: ASSIGN LABELS TO ITEMS                                             ┃
  -- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  
  -- Item 1: Finance + Q1 (2 labels)
  INSERT INTO aqd_item_labels (item_id, label_id) VALUES (v_item_1, v_label_finance);
  INSERT INTO aqd_item_labels (item_id, label_id) VALUES (v_item_1, v_label_q1);
  
  -- Item 2: Sales + Urgent (2 labels)
  INSERT INTO aqd_item_labels (item_id, label_id) VALUES (v_item_2, v_label_sales);
  INSERT INTO aqd_item_labels (item_id, label_id) VALUES (v_item_2, v_label_urgent);
  
  -- Item 3: Legal + Ops (2 labels)
  INSERT INTO aqd_item_labels (item_id, label_id) VALUES (v_item_3, v_label_legal);
  INSERT INTO aqd_item_labels (item_id, label_id) VALUES (v_item_3, v_label_ops);
  
  -- Item 4: Tech (1 label)
  INSERT INTO aqd_item_labels (item_id, label_id) VALUES (v_item_4, v_label_tech);
  
  -- Item 5: HR (1 label)
  INSERT INTO aqd_item_labels (item_id, label_id) VALUES (v_item_5, v_label_hr);
  
  -- Item 6: Legal + Finance (2 labels)
  INSERT INTO aqd_item_labels (item_id, label_id) VALUES (v_item_6, v_label_legal);
  INSERT INTO aqd_item_labels (item_id, label_id) VALUES (v_item_6, v_label_finance);
  
  -- Item 7: Finance (1 label)
  INSERT INTO aqd_item_labels (item_id, label_id) VALUES (v_item_7, v_label_finance);
  
  -- Item 8: Sales (1 label)
  INSERT INTO aqd_item_labels (item_id, label_id) VALUES (v_item_8, v_label_sales);
  
  -- Item 9: Tech + Urgent (2 labels)
  INSERT INTO aqd_item_labels (item_id, label_id) VALUES (v_item_9, v_label_tech);
  INSERT INTO aqd_item_labels (item_id, label_id) VALUES (v_item_9, v_label_urgent);
  
  -- Item 10: NO LABELS (tests empty label state)
  
  -- Item 11: HR + Ops (2 labels)
  INSERT INTO aqd_item_labels (item_id, label_id) VALUES (v_item_11, v_label_hr);
  INSERT INTO aqd_item_labels (item_id, label_id) VALUES (v_item_11, v_label_ops);
  
  -- Item 12: Sales (1 label)
  INSERT INTO aqd_item_labels (item_id, label_id) VALUES (v_item_12, v_label_sales);

  RAISE NOTICE '✓ Assigned labels to items';

  -- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  -- ┃ STEP 7: CREATE NOTES                                                       ┃
  -- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  
  -- Notes on Item 1 (3 notes - tests multiple notes)
  INSERT INTO aqd_item_notes (item_id, content, created_by) VALUES
    (v_item_1, 'Initial draft completed. Waiting for department head feedback.', v_user_1);
  INSERT INTO aqd_item_notes (item_id, content, created_by) VALUES
    (v_item_1, 'CFO approved the preliminary numbers.', v_user_2);
  INSERT INTO aqd_item_notes (item_id, content, created_by) VALUES
    (v_item_1, 'Final version submitted and approved. ✅', v_user_1);

  -- Notes on Item 2 (1 note)
  INSERT INTO aqd_item_notes (item_id, content, created_by) VALUES
    (v_item_2, 'Identified 3 at-risk deals totaling $450K.', v_user_2);

  -- Notes on Item 4 (2 notes)
  INSERT INTO aqd_item_notes (item_id, content, created_by) VALUES
    (v_item_4, 'Current architecture documented. Working on migration path.', v_user_3);
  INSERT INTO aqd_item_notes (item_id, content, created_by) VALUES
    (v_item_4, 'Need input from DevOps team.', v_user_3);

  -- Notes on Item 9 (2 notes)
  INSERT INTO aqd_item_notes (item_id, content, created_by) VALUES
    (v_item_9, 'Hotfix deployed to staging. Running security scans.', v_user_1);
  INSERT INTO aqd_item_notes (item_id, content, created_by) VALUES
    (v_item_9, 'Production deployment complete. Monitoring for 24h.', v_user_1);

  RAISE NOTICE '✓ Created 8 notes';

  -- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  -- ┃ STEP 8: CREATE HISTORY ENTRIES                                             ┃
  -- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  
  -- Item 1 status changes (not_started → in_progress → completed)
  INSERT INTO aqd_item_history (item_id, field_name, old_value, new_value, changed_by, changed_at) VALUES
    (v_item_1, 'status', 'not_started', 'in_progress', v_user_1, now() - INTERVAL '3 days');
  INSERT INTO aqd_item_history (item_id, field_name, old_value, new_value, changed_by, changed_at) VALUES
    (v_item_1, 'status', 'in_progress', 'completed', v_user_1, now() - INTERVAL '1 day');

  -- Item 2 status change
  INSERT INTO aqd_item_history (item_id, field_name, old_value, new_value, changed_by, changed_at) VALUES
    (v_item_2, 'status', 'not_started', 'in_progress', v_user_2, now() - INTERVAL '2 days');

  -- Item 6 status changes
  INSERT INTO aqd_item_history (item_id, field_name, old_value, new_value, changed_by, changed_at) VALUES
    (v_item_6, 'status', 'not_started', 'in_progress', v_user_1, now() - INTERVAL '4 days');
  INSERT INTO aqd_item_history (item_id, field_name, old_value, new_value, changed_by, changed_at) VALUES
    (v_item_6, 'status', 'in_progress', 'completed', v_user_1, now() - INTERVAL '2 days');

  -- Item 9 status changes
  INSERT INTO aqd_item_history (item_id, field_name, old_value, new_value, changed_by, changed_at) VALUES
    (v_item_9, 'status', 'not_started', 'in_progress', v_user_1, now() - INTERVAL '1 day');
  INSERT INTO aqd_item_history (item_id, field_name, old_value, new_value, changed_by, changed_at) VALUES
    (v_item_9, 'status', 'in_progress', 'completed', v_user_1, now() - INTERVAL '6 hours');

  -- Rank change (tests reorder history)
  INSERT INTO aqd_item_history (item_id, field_name, old_value, new_value, changed_by, changed_at) VALUES
    (v_item_2, 'rank', '5', '2', v_user_1, now() - INTERVAL '2 days');

  RAISE NOTICE '✓ Created 8 history entries';

  -- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  -- ┃ STEP 9: PREVIOUS WEEK ITEMS (for checkout history)                         ┃
  -- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  
  INSERT INTO aqd_items (list_id, week_id, rank, title, status, checkout_decision, created_by) VALUES
    (v_list_main, v_week_previous, 1, 'Previous: Completed task', 'completed', 'resolved', v_user_1);
  INSERT INTO aqd_items (list_id, week_id, rank, title, status, checkout_decision, created_by) VALUES
    (v_list_main, v_week_previous, 2, 'Previous: Carried to current week', 'in_progress', 'carry', v_user_1);
  INSERT INTO aqd_items (list_id, week_id, rank, title, status, checkout_decision, created_by) VALUES
    (v_list_main, v_week_previous, 3, 'Previous: Left behind', 'not_started', 'leave', v_user_1);

  RAISE NOTICE '✓ Created previous week items';

  -- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  -- ┃ STEP 10: SECONDARY LIST DATA                                               ┃
  -- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  
  INSERT INTO aqd_items (list_id, week_id, rank, title, status, created_by) VALUES
    (v_list_secondary, v_week_secondary, 1, 'Complete AWS certification course', 'in_progress', v_user_1);
  INSERT INTO aqd_items (list_id, week_id, rank, title, status, created_by) VALUES
    (v_list_secondary, v_week_secondary, 2, 'Read "Designing Data-Intensive Applications"', 'not_started', v_user_1);
  INSERT INTO aqd_items (list_id, week_id, rank, title, status, created_by) VALUES
    (v_list_secondary, v_week_secondary, 3, 'Practice system design interviews', 'not_started', v_user_1);

  RAISE NOTICE '✓ Created secondary list items';

  -- ═══════════════════════════════════════════════════════════════════════════════
  -- SUMMARY
  -- ═══════════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Task¹⁰ SEED DATA COMPLETE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  • 2 lists (pinned + regular)';
  RAISE NOTICE '  • 8 labels (all colors)';
  RAISE NOTICE '  • 4 weeks (2 archived, 2 active)';
  RAISE NOTICE '  • 18 items total';
  RAISE NOTICE '  • 15 label assignments';
  RAISE NOTICE '  • 8 notes';
  RAISE NOTICE '  • 8 history entries';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';

END;
$$;