import { describe, it, expect } from 'vitest';
import { extractTicketKeys, splitByTicketKeys, TICKET_KEY_RE, isFullTicketKey } from '../ticket-refs';

describe('ticket-refs', () => {
  it('extracts unique ticket keys from text', () => {
    expect(extractTicketKeys('see BAU-5757 and INV-12, also BAU-5757')).toEqual([
      'BAU-5757',
      'INV-12',
    ]);
  });

  it('returns empty array when no keys', () => {
    expect(extractTicketKeys('hello world 123-456 bau-12')).toEqual([]);
  });

  it('does not match lowercase or mid-word keys', () => {
    expect(extractTicketKeys('xBAU-12 abc-1')).toEqual([]);
  });

  it('splits text into segments keeping keys', () => {
    expect(splitByTicketKeys('fix BAU-1 now')).toEqual([
      { type: 'text', value: 'fix ' },
      { type: 'key', value: 'BAU-1' },
      { type: 'text', value: ' now' },
    ]);
  });

  it('handles text with no keys as single segment', () => {
    expect(splitByTicketKeys('no keys here')).toEqual([
      { type: 'text', value: 'no keys here' },
    ]);
  });

  it('regex is global and matches full key pattern', () => {
    expect('MWR-947'.match(TICKET_KEY_RE)).toEqual(['MWR-947']);
  });

  it('isFullTicketKey accepts exactly one full key', () => {
    expect(isFullTicketKey('BAU-5757')).toBe(true);
    expect(isFullTicketKey(' bau-5757 ')).toBe(true);
    expect(isFullTicketKey('fix BAU-1')).toBe(false);
    expect(isFullTicketKey('BAU-1 BAU-2')).toBe(false);
    expect(isFullTicketKey('hello')).toBe(false);
  });
});
