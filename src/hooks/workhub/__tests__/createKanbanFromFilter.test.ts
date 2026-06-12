/**
 * remapStatusMappings — column_id remap for cloning a board's status mappings
 * onto a freshly-created filter board (Step 5a of the filter→Kanban vertical).
 *
 * When we clone the project's primary board, its board_columns get NEW ids.
 * Each board_status_mappings row points at a column_id; those references must be
 * rewritten old→new, or the clone's status→column wiring breaks.
 *
 * Contract (this test is the spec — implementation follows):
 *   - Rewrites column_id via the old→new id map.
 *   - Preserves status_id / status_name / bucket_type / order_index unchanged.
 *   - Keeps a null column_id as null (unmapped status).
 *   - Drops any mapping whose column_id was NOT cloned (avoids an FK to a
 *     column that doesn't exist on the new board).
 */
import { describe, it, expect } from 'vitest';
import { remapStatusMappings, type SourceMapping } from '@/hooks/workhub/useCreateKanbanFromFilter';

const mappings: SourceMapping[] = [
  { status_id: 's1', status_name: 'Open',        bucket_type: 'todo',     column_id: 'colA', order_index: 0 },
  { status_id: 's2', status_name: 'In Progress', bucket_type: 'progress', column_id: 'colB', order_index: 1 },
  { status_id: 's3', status_name: 'Unmapped',    bucket_type: 'todo',     column_id: null,   order_index: 2 },
  { status_id: 's4', status_name: 'Ghost',       bucket_type: 'done',     column_id: 'colX', order_index: 3 },
];

const oldToNew: Record<string, string> = { colA: 'newA', colB: 'newB' };

describe('remapStatusMappings', () => {
  it('rewrites column_id old→new and preserves the other fields', () => {
    const out = remapStatusMappings(mappings, oldToNew);
    expect(out).toContainEqual({ status_id: 's1', status_name: 'Open', bucket_type: 'todo', column_id: 'newA', order_index: 0 });
    expect(out).toContainEqual({ status_id: 's2', status_name: 'In Progress', bucket_type: 'progress', column_id: 'newB', order_index: 1 });
  });

  it('keeps a null column_id as null', () => {
    const out = remapStatusMappings(mappings, oldToNew);
    expect(out.find(m => m.status_id === 's3')?.column_id).toBeNull();
  });

  it('drops mappings whose column was not cloned (no dangling FK)', () => {
    const out = remapStatusMappings(mappings, oldToNew);
    expect(out.find(m => m.status_id === 's4')).toBeUndefined();
    expect(out).toHaveLength(3);
  });
});
