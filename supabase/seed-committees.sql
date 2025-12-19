-- Seed data for incident committees with mixed states
-- Run: Copy and paste into Supabase SQL Editor

-- Get some existing incident IDs (assumes incidents exist)
DO $$
DECLARE
  inc1 UUID;
  inc2 UUID;
  inc3 UUID;
  inc4 UUID;
  inc5 UUID;
  inc6 UUID;
  comm1 UUID;
  comm2 UUID;
  comm3 UUID;
  comm4 UUID;
  user1 UUID;
  user2 UUID;
  user3 UUID;
  member1 UUID;
  member2 UUID;
  member3 UUID;
BEGIN
  -- Get first 6 incidents
  SELECT id INTO inc1 FROM incidents WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1 OFFSET 0;
  SELECT id INTO inc2 FROM incidents WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1 OFFSET 1;
  SELECT id INTO inc3 FROM incidents WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1 OFFSET 2;
  SELECT id INTO inc4 FROM incidents WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1 OFFSET 3;
  SELECT id INTO inc5 FROM incidents WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1 OFFSET 4;
  SELECT id INTO inc6 FROM incidents WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1 OFFSET 5;

  -- Get some user profiles
  SELECT id INTO user1 FROM incident_user_profiles LIMIT 1 OFFSET 0;
  SELECT id INTO user2 FROM incident_user_profiles LIMIT 1 OFFSET 1;
  SELECT id INTO user3 FROM incident_user_profiles LIMIT 1 OFFSET 2;

  -- 1. "Not applicable" - committee with 0 approvers (incidents 1 & 2)
  IF inc1 IS NOT NULL THEN
    INSERT INTO incident_committees (id, incident_id, status, required_approvals)
    VALUES (gen_random_uuid(), inc1, 'pending', 1)
    RETURNING id INTO comm1;
    
    UPDATE incidents SET committee_id = comm1 WHERE id = inc1;
  END IF;

  IF inc2 IS NOT NULL THEN
    INSERT INTO incident_committees (id, incident_id, status, required_approvals)
    VALUES (gen_random_uuid(), inc2, 'pending', 1)
    RETURNING id INTO comm2;
    
    UPDATE incidents SET committee_id = comm2 WHERE id = inc2;
  END IF;

  -- 2. "In progress" - committee with some pending votes (incidents 3 & 4)
  IF inc3 IS NOT NULL AND user1 IS NOT NULL AND user2 IS NOT NULL THEN
    INSERT INTO incident_committees (id, incident_id, status, required_approvals)
    VALUES (gen_random_uuid(), inc3, 'pending', 2)
    RETURNING id INTO comm3;
    
    UPDATE incidents SET committee_id = comm3 WHERE id = inc3;
    
    -- Add 2 members, 1 voted, 1 pending
    INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
    VALUES (gen_random_uuid(), comm3, user1, false, 'reviewer')
    RETURNING id INTO member1;
    
    INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
    VALUES (gen_random_uuid(), comm3, user2, false, 'reviewer')
    RETURNING id INTO member2;
    
    INSERT INTO committee_votes (committee_id, member_id, vote, voted_at)
    VALUES (comm3, member1, 'approved', NOW());
    
    INSERT INTO committee_votes (committee_id, member_id, vote)
    VALUES (comm3, member2, 'pending');
  END IF;

  -- 3. "Approved" - committee with majority approvals (incident 5)
  IF inc5 IS NOT NULL AND user1 IS NOT NULL AND user2 IS NOT NULL THEN
    INSERT INTO incident_committees (id, incident_id, status, required_approvals)
    VALUES (gen_random_uuid(), inc5, 'approved', 2)
    RETURNING id INTO comm4;
    
    UPDATE incidents SET committee_id = comm4 WHERE id = inc5;
    
    INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
    VALUES (gen_random_uuid(), comm4, user1, false, 'reviewer')
    RETURNING id INTO member1;
    
    INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
    VALUES (gen_random_uuid(), comm4, user2, false, 'reviewer')
    RETURNING id INTO member2;
    
    INSERT INTO committee_votes (committee_id, member_id, vote, voted_at)
    VALUES (comm4, member1, 'approved', NOW() - INTERVAL '1 day');
    
    INSERT INTO committee_votes (committee_id, member_id, vote, voted_at)
    VALUES (comm4, member2, 'approved', NOW() - INTERVAL '1 day');
  END IF;

  -- 4. "Rejected" with veto (incident 6)
  IF inc6 IS NOT NULL AND user1 IS NOT NULL AND user3 IS NOT NULL THEN
    INSERT INTO incident_committees (id, incident_id, status, required_approvals)
    VALUES (gen_random_uuid(), inc6, 'rejected', 2)
    RETURNING id INTO comm4;
    
    UPDATE incidents SET committee_id = comm4 WHERE id = inc6;
    
    INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
    VALUES (gen_random_uuid(), comm4, user1, false, 'reviewer')
    RETURNING id INTO member1;
    
    INSERT INTO committee_members (id, committee_id, user_id, has_veto, role)
    VALUES (gen_random_uuid(), comm4, user3, true, 'veto_holder')
    RETURNING id INTO member2;
    
    INSERT INTO committee_votes (committee_id, member_id, vote, voted_at)
    VALUES (comm4, member1, 'approved', NOW() - INTERVAL '2 days');
    
    INSERT INTO committee_votes (committee_id, member_id, vote, voted_at)
    VALUES (comm4, member2, 'vetoed', NOW() - INTERVAL '1 day');
  END IF;

  RAISE NOTICE 'Seed data inserted for committee states';
END $$;
