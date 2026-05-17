/**
 * ComponentLivePreview contract test (2026-05-17, Step 8).
 *
 * Renders the actual canonical component in a side-by-side light + dark
 * frame. v1 ships fixtures for atoms and the simpler molecules that render
 * without app-level providers (QueryClient, AuthProvider, etc.). Organisms
 * that need provider mocking render a "Preview deferred to v2" placeholder.
 *
 * RED until Step 8 ships the file + fixtures.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const COMPONENT = resolve(__dirname, '..', 'ComponentLivePreview.tsx');
const FIXTURES = resolve(__dirname, '..', 'componentPreviewFixtures.tsx');

const componentSrc = (): string => readFileSync(COMPONENT, 'utf8');
const fixturesSrc = (): string => readFileSync(FIXTURES, 'utf8');

describe('ComponentLivePreview — contract', () => {
  it('component file exists', () => {
    expect(existsSync(COMPONENT)).toBe(true);
  });

  it('fixtures file exists', () => {
    expect(existsSync(FIXTURES)).toBe(true);
  });

  it('exports a ComponentLivePreview default component', () => {
    expect(componentSrc()).toMatch(/export\s+default\s+function\s+ComponentLivePreview/);
  });

  it('renders light + dark themed frames via data-color-mode', () => {
    const s = componentSrc();
    expect(s).toMatch(/data-color-mode=['"]light['"]/);
    expect(s).toMatch(/data-color-mode=['"]dark['"]/);
  });

  it('consumes the previewFixtures registry', () => {
    expect(componentSrc()).toMatch(/previewFixtures/);
  });

  it('fixtures registry covers at least the seeded atoms', () => {
    const s = fixturesSrc();
    // Each atom in components.registry.ts (status=canonical, category=atom)
    // must have a fixture entry.
    expect(s).toMatch(/['"]catalyst-status-pill['"]/);
    expect(s).toMatch(/['"]jira-issue-type-icon['"]/);
  });

  it('uses ADS tokens (no raw hex)', () => {
    const s = componentSrc();
    const stripped = s.replace(/token\(\s*['"][^'"]+['"]\s*,\s*['"]#[0-9A-Fa-f]+['"]\s*\)/g, 'TOKEN');
    const hex = stripped.match(/#[0-9A-Fa-f]{3,8}\b/g) ?? [];
    expect(hex, `raw hex leaked: ${hex.join(', ')}`).toEqual([]);
  });
});
