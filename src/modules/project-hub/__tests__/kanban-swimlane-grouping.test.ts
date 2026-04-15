import { describe, it, expect } from 'vitest';
import type { BoardIssue, PhBoardColumn, Swimlane } from '../types/kanban';

// Replicate the swimlane grouping logic from KanbanBoardPage
function buildSwimlanes(filtered: BoardIssue[], columns: PhBoardColumn[]): Swimlane[] {
  const epicMap = new Map<string, BoardIssue[]>();
  filtered.forEach((issue) => {
    const k = issue.epicId ?? '__no_epic__';
    if (!epicMap.has(k)) epicMap.set(k, []);
    epicMap.get(k)!.push(issue);
  });

  return Array.from(epicMap.entries()).map(([epicId, epicIssues]) => {
    const first = epicIssues[0];
    return {
      epicId,
      epicKey: first?.epicKey ?? epicId,
      epicName: first?.epicName ?? 'No Epic',
      epicStatus: 'In Progress' as const,
      totalCount: epicIssues.length,
      columns: columns.map((col) => ({
        column: col,
        issues: epicIssues.filter((i) => i.boardColumnId === col.id),
      })),
    };
  });
}

const cols: PhBoardColumn[] = [
  { id: 'col-1', boardId: 'b1', name: 'To Do', statusMapping: [], position: 0, isDoneColumn: false },
  { id: 'col-2', boardId: 'b1', name: 'In Progress', statusMapping: [], position: 1, isDoneColumn: false },
  { id: 'col-3', boardId: 'b1', name: 'Done', statusMapping: [], position: 2, isDoneColumn: true },
];

const makeIssue = (id: string, epicId: string, colId: string): BoardIssue => ({
  id, summary: `Issue ${id}`, type: 'Story', priority: 'Medium', status: 'To Do',
  epicId, epicKey: `EP-${epicId}`, epicName: `Epic ${epicId}`, boardColumnId: colId,
});

describe('Swimlane grouping (UC D01-D08)', () => {
  // D01: issues grouped by epic
  it('D01: groups issues by epicId', () => {
    const issues = [
      makeIssue('1', 'e1', 'col-1'),
      makeIssue('2', 'e1', 'col-2'),
      makeIssue('3', 'e2', 'col-1'),
    ];
    const lanes = buildSwimlanes(issues, cols);
    expect(lanes).toHaveLength(2);
    expect(lanes[0].epicId).toBe('e1');
    expect(lanes[0].totalCount).toBe(2);
    expect(lanes[1].epicId).toBe('e2');
    expect(lanes[1].totalCount).toBe(1);
  });

  // D02: swimlane header data
  it('D02: swimlane has key, name, count', () => {
    const issues = [makeIssue('1', 'e1', 'col-1')];
    const lanes = buildSwimlanes(issues, cols);
    expect(lanes[0].epicKey).toBe('EP-e1');
    expect(lanes[0].epicName).toBe('Epic e1');
    expect(lanes[0].totalCount).toBe(1);
  });

  // D07: empty swimlane after filtering
  it('D07: no swimlane created for empty epic group', () => {
    const lanes = buildSwimlanes([], cols);
    expect(lanes).toHaveLength(0);
  });

  // D08: progress bar reflects done count
  it('D08: done count calculation', () => {
    const issues = [
      makeIssue('1', 'e1', 'col-1'),
      makeIssue('2', 'e1', 'col-3'), // done column
      makeIssue('3', 'e1', 'col-3'), // done column
    ];
    const lanes = buildSwimlanes(issues, cols);
    const doneCount = lanes[0].columns.reduce(
      (acc, sc) => acc + (sc.column.isDoneColumn ? sc.issues.length : 0), 0
    );
    expect(doneCount).toBe(2);
    expect(lanes[0].totalCount).toBe(3);
    const progressPct = (doneCount / lanes[0].totalCount) * 100;
    expect(Math.round(progressPct)).toBe(67);
  });

  // UC-006: filter then group order
  it('UC-006: filter runs before group — correct pipeline', () => {
    const allIssues = [
      makeIssue('1', 'e1', 'col-1'),
      makeIssue('2', 'e1', 'col-2'),
      makeIssue('3', 'e2', 'col-1'),
    ];
    // Simulate filtering to only e1 issues
    const filtered = allIssues.filter((i) => i.epicId === 'e1');
    const lanes = buildSwimlanes(filtered, cols);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].epicId).toBe('e1');
    expect(lanes[0].totalCount).toBe(2);
  });

  // Issues without epic go to __no_epic__
  it('Issues without epicId grouped under __no_epic__', () => {
    const issues = [
      { ...makeIssue('1', 'e1', 'col-1') },
      { ...makeIssue('2', 'e1', 'col-2'), epicId: undefined },
    ];
    const lanes = buildSwimlanes(issues, cols);
    expect(lanes).toHaveLength(2);
    const noEpicLane = lanes.find((l) => l.epicId === '__no_epic__');
    expect(noEpicLane).toBeDefined();
    expect(noEpicLane!.epicName).toBe('No Epic');
  });
});
