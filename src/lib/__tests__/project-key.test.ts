import { describe, it, expect } from 'vitest';
import { padProjectKey } from '../project-key';

describe('padProjectKey — nav project key is always >= 3 chars', () => {
  it('extends a 2-char key with the next letter from the project name', () => {
    expect(padProjectKey('IN', 'Inspection Project')).toBe('INS');
  });

  it('leaves a 3-char key untouched', () => {
    expect(padProjectKey('BAU', 'Business as Usual')).toBe('BAU');
  });

  it('truncates a longer key to 3 chars', () => {
    expect(padProjectKey('PROD', 'Products')).toBe('PRO');
  });

  it('appends name letters when the name does not start with the key', () => {
    expect(padProjectKey('AB', 'Marketing')).toBe('ABM');
  });

  it('pads with X when no name letters are available', () => {
    expect(padProjectKey('IN', '')).toBe('INX');
  });

  it('ignores non-alphanumeric characters in the key and name', () => {
    expect(padProjectKey('I-N', 'In-spection')).toBe('INS');
  });
});
