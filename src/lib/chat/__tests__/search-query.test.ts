import { describe, it, expect } from 'vitest';
import { parseChatSearchQuery } from '../search-query';

describe('parseChatSearchQuery', () => {
  it('returns plain text when no operators', () => {
    expect(parseChatSearchQuery('deploy status')).toEqual({
      text: 'deploy status',
      phrases: [],
      exclude: [],
      from: [],
      channels: [],
      keys: [],
    });
  });

  it('parses from:@name operator', () => {
    const r = parseChatSearchQuery('from:@vikram deploy');
    expect(r.from).toEqual(['vikram']);
    expect(r.text).toBe('deploy');
  });

  it('parses from: without @', () => {
    expect(parseChatSearchQuery('from:vikram').from).toEqual(['vikram']);
  });

  it('parses in:#channel operator', () => {
    const r = parseChatSearchQuery('in:#bau-general release');
    expect(r.channels).toEqual(['bau-general']);
    expect(r.text).toBe('release');
  });

  it('parses key:BAU-123 operator uppercased', () => {
    const r = parseChatSearchQuery('key:bau-123 fix');
    expect(r.keys).toEqual(['BAU-123']);
    expect(r.text).toBe('fix');
  });

  it('parses quoted exact phrases', () => {
    const r = parseChatSearchQuery('"exact phrase" other');
    expect(r.phrases).toEqual(['exact phrase']);
    expect(r.text).toBe('other');
  });

  it('parses -term exclusions', () => {
    const r = parseChatSearchQuery('deploy -staging -test');
    expect(r.exclude).toEqual(['staging', 'test']);
    expect(r.text).toBe('deploy');
  });

  it('combines all operators', () => {
    const r = parseChatSearchQuery('from:@ana in:#bau key:BAU-5 "hot fix" -old urgent');
    expect(r).toEqual({
      text: 'urgent',
      phrases: ['hot fix'],
      exclude: ['old'],
      from: ['ana'],
      channels: ['bau'],
      keys: ['BAU-5'],
    });
  });

  it('handles multiple from: operators', () => {
    expect(parseChatSearchQuery('from:@a from:@b').from).toEqual(['a', 'b']);
  });

  it('does not treat hyphenated words as exclusions', () => {
    const r = parseChatSearchQuery('group-dm message');
    expect(r.exclude).toEqual([]);
    expect(r.text).toBe('group-dm message');
  });

  it('handles empty and whitespace input', () => {
    expect(parseChatSearchQuery('').text).toBe('');
    expect(parseChatSearchQuery('   ').text).toBe('');
  });

  it('ignores unterminated quote, treats as plain text', () => {
    const r = parseChatSearchQuery('"unterminated phrase');
    expect(r.phrases).toEqual([]);
    expect(r.text).toBe('unterminated phrase');
  });
});
