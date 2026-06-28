-- Phase 4 (work-item canon): make defect severity 5-level.
-- Add 'blocker' to the tm_defect_severity enum so QA Bug create can offer the
-- full canonical scale (Blocker/Critical/Major/Minor/Trivial — see
-- work-item-canon WORK_ITEM_SEVERITIES). App keeps its UPPERCASE DefectSeverity
-- ↔ lowercase-enum bridge (severityToDb/FromDb). Applied to cyij + lmqw.
--
-- Replaces the old lossy 4-option create scale (critical/high/medium/low,
-- relabelled high->MAJOR / medium->MINOR) with direct 5-level selection.

alter type tm_defect_severity add value if not exists 'blocker' before 'critical';
