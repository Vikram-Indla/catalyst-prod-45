
-- Seed weekly snapshots for Arslan Malik (rid=009, first resource)
WITH res AS (SELECT id FROM r360_resources WHERE rid = '009')
INSERT INTO r360_weekly_snapshots
  (resource_id, week_number, week_start, week_end, total_open, closed_this_week, in_review,
   pickup_speed_hours, in_progress_concurrent, closed_of_touched, total_touched,
   avg_cycle_time_days, oldest_item_age_days, oldest_item_key, closure_rate_pct)
SELECT res.id, wk, ws::DATE, we::DATE, to_o, clsd, ir, psh, ipc, cot, tt, act, oiad, oik, crp
FROM res, (VALUES
  (2,'2026-01-05','2026-01-09',4,1,0,38.0,1,1,3,4.1,0,NULL,25.0),
  (3,'2026-01-12','2026-01-16',5,0,0,38.0,1,0,2,4.1,0,NULL,0.0),
  (4,'2026-01-19','2026-01-23',5,2,0,38.0,1,2,4,4.1,0,NULL,40.0),
  (5,'2026-01-26','2026-01-30',6,1,0,38.0,1,1,3,4.1,0,NULL,16.7),
  (6,'2026-02-02','2026-02-06',7,3,0,38.0,1,3,5,4.1,0,NULL,42.9),
  (7,'2026-02-09','2026-02-13',8,5,0,38.0,1,5,7,4.1,0,NULL,62.5),
  (8,'2026-02-16','2026-02-20',9,8,0,38.0,1,8,10,4.1,0,NULL,88.9),
  (9,'2026-03-01','2026-03-05',8,1,0,44.0,3,1,7,5.2,14,'BAU-4804',11.1)
) AS t(wk,ws,we,to_o,clsd,ir,psh,ipc,cot,tt,act,oiad,oik,crp)
ON CONFLICT (resource_id, week_number) DO NOTHING;
