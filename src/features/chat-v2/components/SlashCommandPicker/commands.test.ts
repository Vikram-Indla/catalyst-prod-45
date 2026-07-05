import { describe, it, expect } from 'vitest';
import { readSlashQuery, filterSlashCommands, BUILTIN_SLASH_COMMANDS, type SlashCommand } from './commands';

describe('readSlashQuery', () => {
  it('reads the command name when "/" is the first character', () => {
    expect(readSlashQuery('/shr', 4)).toBe('shr');
    expect(readSlashQuery('/', 1)).toBe('');
  });

  it('does not trigger when "/" is not at the absolute start', () => {
    expect(readSlashQuery('hi /shrug', 9)).toBeNull();
    expect(readSlashQuery(' /shrug', 7)).toBeNull();
  });

  it('stops once a space follows the command (args have begun)', () => {
    expect(readSlashQuery('/remind me', 10)).toBeNull();
    expect(readSlashQuery('/shrug ', 7)).toBeNull();
  });

  it('returns null for empty / caret-at-zero', () => {
    expect(readSlashQuery('', 0)).toBeNull();
    expect(readSlashQuery('/x', 0)).toBeNull();
  });
});

describe('filterSlashCommands', () => {
  const cmds: SlashCommand[] = [
    { id: 'huddle', kind: 'action', label: '/huddle', hint: '', run: () => {} },
    ...BUILTIN_SLASH_COMMANDS,
  ];

  it('returns all commands for an empty query', () => {
    expect(filterSlashCommands(cmds, '')).toHaveLength(cmds.length);
  });

  it('ranks prefix matches before substring matches', () => {
    // "flip" is a substring of tableflip AND unflip; neither starts with it.
    const r = filterSlashCommands(cmds, 'flip').map(c => c.id);
    expect(r).toEqual(expect.arrayContaining(['tableflip', 'unflip']));
    expect(r).not.toContain('huddle');
  });

  it('prefix beats substring in order', () => {
    const cs: SlashCommand[] = [
      { id: 'unflip', kind: 'insert', label: '/unflip', hint: '', text: 'x' },
      { id: 'flipper', kind: 'insert', label: '/flipper', hint: '', text: 'y' },
    ];
    // query "flip": "flipper" starts with it (prefix), "unflip" contains it.
    expect(filterSlashCommands(cs, 'flip').map(c => c.id)).toEqual(['flipper', 'unflip']);
  });

  it('is case-insensitive', () => {
    expect(filterSlashCommands(cmds, 'SHRUG').map(c => c.id)).toContain('shrug');
  });
});
