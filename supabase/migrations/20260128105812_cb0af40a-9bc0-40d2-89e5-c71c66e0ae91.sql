-- Reset the sequence to start from 56 (after max PLN-55)
ALTER SEQUENCE planner_task_key_seq RESTART WITH 56;

-- Fix the incorrectly generated PLN-1 task to PLN-56
UPDATE planner_tasks 
SET task_key = 'PLN-56'
WHERE task_key = 'PLN-1';