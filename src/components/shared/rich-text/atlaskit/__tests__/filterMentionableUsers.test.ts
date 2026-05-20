import { describe, it, expect } from 'vitest';
import {
  filterMentionableUsers,
  sanitizeUserList,
  type MentionableUser,
} from '../catalystMentionProvider';

const u = (id: string, name: string, email: string | null = null): MentionableUser => ({
  id,
  name,
  email,
  avatarUrl: null,
  jiraAccountId: null,
});

describe('filterMentionableUsers', () => {
  const users: MentionableUser[] = [
    u('1', 'Ahmed Hassan', 'ahmed@x.com'),
    u('2', 'Habib Ali', 'habib@x.com'),
    u('3', 'Sara Ahmed', 'sara@x.com'),
    u('4', 'Vikram Indla', 'vikram@x.com'),
    u('5', 'Zara Khan', 'zara.k@x.com'),
  ];

  it('returns all users (capped at 8) for an empty query', () => {
    expect(filterMentionableUsers(users, '').map((x) => x.id)).toEqual([
      '1', '2', '3', '4', '5',
    ]);
  });

  it('is case-insensitive', () => {
    const ids = filterMentionableUsers(users, 'AH').map((x) => x.id);
    expect(ids).toContain('1'); // Ahmed Hassan
    expect(ids).toContain('3'); // Sara Ahmed (token starts with "ah")
  });

  it('ranks prefix matches before substring/token matches', () => {
    const ids = filterMentionableUsers(users, 'ah').map((x) => x.id);
    // "Ahmed Hassan" — name starts with "ah" (score 0) → first
    // "Sara Ahmed"   — token starts with "ah" (score 1) → after
    expect(ids[0]).toBe('1');
    expect(ids[1]).toBe('3');
  });

  it('matches by email local-part when name does not match', () => {
    const ids = filterMentionableUsers(users, 'vik').map((x) => x.id);
    expect(ids).toEqual(['4']);
  });

  it('returns [] when nothing matches', () => {
    expect(filterMentionableUsers(users, 'zzzznomatch')).toEqual([]);
  });

  it('caps at 8 results', () => {
    const many: MentionableUser[] = Array.from({ length: 20 }, (_, i) =>
      u(String(i), `Anna ${i}`, `anna${i}@x.com`),
    );
    expect(filterMentionableUsers(many, 'ann')).toHaveLength(8);
  });

  it('tolerates null email and matches by name only', () => {
    const noEmail: MentionableUser[] = [u('99', 'Solo Name', null)];
    expect(filterMentionableUsers(noEmail, 'solo').map((x) => x.id)).toEqual(['99']);
  });
});

describe('sanitizeUserList', () => {
  it('drops rows with empty id', () => {
    const list: MentionableUser[] = [
      u('', 'No Id'),
      u('1', 'Alice'),
    ];
    expect(sanitizeUserList(list).map((x) => x.id)).toEqual(['1']);
  });

  it('dedupes rows by id, keeping the first occurrence', () => {
    const list: MentionableUser[] = [
      u('1', 'Vikram Indla (current)'),
      u('1', 'Vikram Indla (stale)'),
      u('2', 'Other User'),
    ];
    const out = sanitizeUserList(list);
    expect(out.map((x) => x.id)).toEqual(['1', '2']);
    expect(out[0].name).toBe('Vikram Indla (current)');
  });
});
