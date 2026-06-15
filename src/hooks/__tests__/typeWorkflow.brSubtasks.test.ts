/**
 * BR subtask categories (2026-06-15): the 5 BR subtask types must be
 * manageable in /admin/workflows. WorkflowAdminPage renders one tab per
 * entry in useTypeWorkflow.WORK_ITEM_TYPES, so the 5 categories must be
 * listed there. (Runtime status flow uses the hardcoded To Do/In Progress/
 * Done fallback — Q2: show tabs, keep runtime flow.)
 */
import { describe, it, expect } from 'vitest';
import { WORK_ITEM_TYPES } from '@/hooks/useTypeWorkflow';

describe('useTypeWorkflow WORK_ITEM_TYPES — BR subtask categories', () => {
  it.each(['BRD Task', 'Business Gap', 'Change Request', 'UAT Finding', 'Figma'])(
    'includes %s as a manageable workflow type',
    (t) => {
      expect(WORK_ITEM_TYPES as readonly string[]).toContain(t);
    },
  );
});
