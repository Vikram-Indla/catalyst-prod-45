/**
 * itemPassesFilters — assignee/reporter must match BOTH account id and display
 * name (Phase C / G2, Path B).
 *
 * Saved filters can carry either an account id ("712020:...") or a display
 * name in the assignee/reporter facet, depending on how the JQL was authored.
 * The client predicate must pass an item when EITHER representation matches,
 * so account-id JQL ("assignee = \"712020:...\"") filters correctly instead of
 * silently returning nothing.
 */
import { describe, it, expect } from 'vitest';
import { itemPassesFilters, EMPTY_FILTERS } from '../AllWorkToolbar';
import type { WorkItem } from '@/types/workItem.types';

const item = (over: Partial<WorkItem>): WorkItem =>
  ({
    sprintRelease: null,
    parentKey: null,
    assignee: undefined,
    assigneeId: null,
    rawType: null,
    labels: [],
    statusName: null,
    priority: null,
    reporter: undefined,
    reporterId: null,
    severity: null,
    ...over,
  } as unknown as WorkItem);

const ACC = '712020:c0113e0c-ee77-4f30-82ea-1626526f4f39';

describe('itemPassesFilters — assignee id/name tolerance', () => {
  const it1 = item({ assigneeId: ACC, assignee: { id: ACC, name: 'Jane Doe' } as any });

  it('passes when the facet holds the account id', () => {
    expect(itemPassesFilters(it1, { ...EMPTY_FILTERS, assignee: [ACC] })).toBe(true);
  });

  it('passes when the facet holds the display name', () => {
    expect(itemPassesFilters(it1, { ...EMPTY_FILTERS, assignee: ['Jane Doe'] })).toBe(true);
  });

  it('fails when neither id nor name matches', () => {
    expect(itemPassesFilters(it1, { ...EMPTY_FILTERS, assignee: ['Someone Else'] })).toBe(false);
  });
});

describe('itemPassesFilters — reporter id/name tolerance', () => {
  const it1 = item({ reporterId: ACC, reporter: { id: ACC, name: 'Jane Doe' } });

  it('passes when the facet holds the reporter account id', () => {
    expect(itemPassesFilters(it1, { ...EMPTY_FILTERS, reporter: [ACC] })).toBe(true);
  });

  it('passes when the facet holds the reporter display name', () => {
    expect(itemPassesFilters(it1, { ...EMPTY_FILTERS, reporter: ['Jane Doe'] })).toBe(true);
  });
});
