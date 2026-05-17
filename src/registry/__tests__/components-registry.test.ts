/**
 * Components registry contract test (2026-05-17).
 *
 * The registry at src/registry/components.registry.ts is the single source of
 * truth for Catalyst's component library. This test guards the contract:
 *
 *   1. Every entry has the required shape (id, name, category, status, version).
 *   2. IDs are unique.
 *   3. Every BANNED item from CLAUDE.md is present with status='banned' and
 *      a banned_anchor pointing back to the lesson.
 *   4. Canonical components from CANONICAL_COMPONENTS.md are present:
 *      JiraTable, CanonicalDescriptionField, rich-text, dynamic-table.
 *   5. Semver-valid versions.
 *
 * RED until Step 4 writes the registry file.
 */
import { describe, it, expect } from 'vitest';

import {
  componentsRegistry,
  type ComponentRegistryEntry,
} from '@/registry/components.registry';

const SEMVER = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
const CLAUDE_ANCHOR = /^\d{4}-\d{2}-\d{2}/;

/** Permanently banned per CLAUDE.md — every entry must appear with status='banned'. */
const BANNED_IDS = [
  'mdt-ref',
  'service-now-number',
  'assessment-feature',
  'story-points',
  'development-section',
  'automation-section',
  'ai-sparkles-inline',
  'notion-integration',
];

const CANONICAL_IDS = [
  'jira-table',
  'canonical-description-field',
  'rich-text-editor',
  'dynamic-table',
];

describe('components.registry — contract', () => {
  it('every entry has required shape', () => {
    for (const entry of componentsRegistry) {
      expect(entry.id, `entry missing id: ${JSON.stringify(entry)}`).toBeTruthy();
      expect(entry.name, `${entry.id}: name`).toBeTruthy();
      expect(['atom', 'molecule', 'organism', 'page', 'pattern']).toContain(entry.category);
      expect(['canonical', 'deprecated', 'banned', 'observed']).toContain(entry.status);
      expect(entry.version).toMatch(SEMVER);
    }
  });

  it('IDs are unique', () => {
    const ids = componentsRegistry.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every banned item from CLAUDE.md is present with status=banned', () => {
    for (const id of BANNED_IDS) {
      const entry = componentsRegistry.find(e => e.id === id);
      expect(entry, `banned entry missing: ${id}`).toBeDefined();
      expect(entry?.status).toBe('banned');
      expect(entry?.banned_anchor, `${id}: banned_anchor missing`).toMatch(CLAUDE_ANCHOR);
      expect(entry?.banned_reason, `${id}: banned_reason missing`).toBeTruthy();
    }
  });

  it('every canonical component from CANONICAL_COMPONENTS.md is present', () => {
    for (const id of CANONICAL_IDS) {
      const entry = componentsRegistry.find(e => e.id === id);
      expect(entry, `canonical entry missing: ${id}`).toBeDefined();
      expect(entry?.status).toMatch(/canonical|deprecated/);
    }
  });

  it('canonical entries declare a file_path', () => {
    const canonicals = componentsRegistry.filter(e => e.status === 'canonical');
    for (const entry of canonicals) {
      expect(entry.file_path, `${entry.id}: file_path missing`).toBeTruthy();
    }
  });

  it('exports a TypeScript type for ComponentRegistryEntry', () => {
    const sample: ComponentRegistryEntry = componentsRegistry[0];
    expect(sample).toBeDefined();
  });
});
