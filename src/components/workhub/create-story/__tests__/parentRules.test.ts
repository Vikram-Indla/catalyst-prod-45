/**
 * Bucket E — parent hierarchy rules (Vikram directive 2026-05-09).
 *
 * Confirmed rules:
 *   Epic              → ['Business Request']
 *   Feature           → ['Epic', 'Business Request']
 *   Story             → ['Feature', 'Epic']
 *   Business Gap      → ['Business Request', 'Epic']
 *   Change Request    → ['Epic', 'Business Request', 'Feature']
 *   Production Incident → ['Business Request', 'Story', 'Feature', 'Epic']
 *   QA Bug            → ['Feature', 'Story']
 *   Business Request  → []  (top-level, no parent)
 */
import { describe, it, expect } from 'vitest';
import { PARENT_TYPE_RULES } from '../CreateStoryModal';

describe('PARENT_TYPE_RULES (Bucket E)', () => {
  it('Epic can only be parented to Business Request', () => {
    expect(PARENT_TYPE_RULES['Epic']).toEqual(['Business Request']);
  });

  it('Feature can be parented to Epic or Business Request', () => {
    expect(PARENT_TYPE_RULES['Feature']).toEqual(expect.arrayContaining(['Epic', 'Business Request']));
    expect(PARENT_TYPE_RULES['Feature']).toHaveLength(2);
  });

  it('Story can be parented to Feature or Epic', () => {
    expect(PARENT_TYPE_RULES['Story']).toEqual(expect.arrayContaining(['Feature', 'Epic']));
    expect(PARENT_TYPE_RULES['Story']).toHaveLength(2);
  });

  it('Business Gap can be parented to Business Request or Epic', () => {
    expect(PARENT_TYPE_RULES['Business Gap']).toEqual(expect.arrayContaining(['Business Request', 'Epic']));
    expect(PARENT_TYPE_RULES['Business Gap']).toHaveLength(2);
  });

  it('Change Request can be parented to Epic, Business Request, or Feature', () => {
    expect(PARENT_TYPE_RULES['Change Request']).toEqual(expect.arrayContaining(['Epic', 'Business Request', 'Feature']));
    expect(PARENT_TYPE_RULES['Change Request']).toHaveLength(3);
  });

  it('Production Incident can be parented to Business Request, Story, Feature, or Epic', () => {
    expect(PARENT_TYPE_RULES['Production Incident']).toEqual(
      expect.arrayContaining(['Business Request', 'Story', 'Feature', 'Epic'])
    );
    expect(PARENT_TYPE_RULES['Production Incident']).toHaveLength(4);
  });

  it('QA Bug can be parented to Feature or Story', () => {
    expect(PARENT_TYPE_RULES['QA Bug']).toEqual(expect.arrayContaining(['Feature', 'Story']));
    expect(PARENT_TYPE_RULES['QA Bug']).toHaveLength(2);
  });

  it('Business Request has no parent (top-level)', () => {
    expect(PARENT_TYPE_RULES['Business Request']).toEqual([]);
  });
});
