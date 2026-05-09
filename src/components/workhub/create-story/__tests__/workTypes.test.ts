/**
 * CreateStoryModal — work-type deprecation tests.
 *
 * Vikram directive 2026-05-09:
 *   - 'API Requirement' → DEPRECATED (remove from project hub create modal)
 *   - 'Task'            → DEPRECATED from project hub (belongs to task module)
 *
 * These types must not appear in the WORK_TYPES tuple or the
 * WORK_TYPE_TO_SCHEME_ISSUE_TYPE mapping in useCreateStory.ts.
 */
import { describe, it, expect } from 'vitest';

// We import only the type-mapping constant from the hook (no React context needed).
import { WORK_TYPE_TO_SCHEME_ISSUE_TYPE_FOR_TEST } from '../useCreateStory';

describe('Work type deprecations (Vikram directive 2026-05-09)', () => {
  it('WORK_TYPE_TO_SCHEME_ISSUE_TYPE does not contain API Requirement', () => {
    expect('API Requirement' in WORK_TYPE_TO_SCHEME_ISSUE_TYPE_FOR_TEST).toBe(false);
  });

  it('WORK_TYPE_TO_SCHEME_ISSUE_TYPE does not contain Task', () => {
    expect('Task' in WORK_TYPE_TO_SCHEME_ISSUE_TYPE_FOR_TEST).toBe(false);
  });
});
