/**
 * Home-root breadcrumb lock.
 *
 * 2026-06-18 — the only constant "way home" from inside a hub was the corner
 * Catalyst logo; the breadcrumb rooted at "Projects"/"Products", not Home.
 * Decision (nav mental-model): every hub breadcrumb starts with a clickable
 * Home crumb → /for-you. One click, no new icon. This pinned the root crumb.
 *
 * Updated 2026-07-09: ProjectPageHeader.tsx's docblock now documents a later,
 * explicit reversal for entity-scoped hubs — "Breadcrumb: entity name acts
 * as root (no 'Home / Hub' prefix)" — because repeating "Home / Hub / Entity"
 * on every project/product page crumb was noise once the entity crumb itself
 * links back to the hub root. Global hubs (incident/release/test/folio/
 * strata) root at their own hub label instead. Rendering also moved from
 * literal `<BreadcrumbsItem text=... href=... />` JSX to a config array
 * (`BreadcrumbItem[]`) fed to the canonical `<Breadcrumbs items={...} />`.
 * The two ProjectPageHeader assertions below are updated to match this
 * current, documented structure; GlobalPageHeader (a different component)
 * still roots at Home and is unaffected.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = readFileSync(resolve(__dirname, '../ProjectPageHeader.tsx'), 'utf8');
const GLOBAL = readFileSync(resolve(__dirname, '../GlobalPageHeader.tsx'), 'utf8');

describe('GlobalPageHeader — breadcrumb roots at Home', () => {
  it('renders a clickable Home link to /for-you before the segments', () => {
    expect(GLOBAL).toMatch(/<Link\s+to="\/for-you"/);
    const homeIdx = GLOBAL.indexOf('to="/for-you"');
    const mapIdx = GLOBAL.indexOf('breadcrumbSegments.map');
    expect(homeIdx).toBeGreaterThan(-1);
    expect(homeIdx).toBeLessThan(mapIdx);
  });
});

describe('ProjectPageHeader — breadcrumb root (entity-first, no Home prefix)', () => {
  it('entity-scoped breadcrumb items root at the entity itself, not a Home crumb', () => {
    expect(SRC).toMatch(/key:\s*"entity",\s*\n\s*text:\s*projectName,\s*\n\s*href:\s*entityHref,/);
    expect(SRC).not.toMatch(/<BreadcrumbsItem text="Home" href="\/for-you" \/>/);
  });

  it('global-hub breadcrumb items root at the hub label (rootLabel), before any trail', () => {
    const rootIdx = SRC.indexOf('key: "root", text: rootLabel, href: rootHref');
    const trailIdx = SRC.indexOf('...trailItems');
    expect(rootIdx).toBeGreaterThan(-1);
    expect(trailIdx).toBeGreaterThan(-1);
    expect(rootIdx).toBeLessThan(trailIdx);
  });
});

describe('ProjectPageHeader — global-hub mode (incident/release)', () => {
  it('accepts incident + release as hubType', () => {
    expect(SRC).toMatch(/hubType\?:\s*"project"\s*\|\s*"product"\s*\|\s*"incident"\s*\|\s*"release"/);
  });

  it('declares Incidents + Releases roots with global-hub hrefs', () => {
    expect(SRC).toMatch(/incident:\s*\{\s*label:\s*"Incidents",\s*href:\s*"\/incident-hub"/);
    expect(SRC).toMatch(/release:\s*\{\s*label:\s*"Releases",\s*href:\s*"\/release-hub\/overview"/);
  });

  it('omits the entity crumb for global hubs', () => {
    // Rendering moved from a literal `!isGlobalHub && !trail && <BreadcrumbsItem .../>`
    // JSX guard to a ternary building the `breadcrumbItems` config array: the
    // isGlobalHub branch omits the `key: "entity"` object entirely.
    const ternaryIdx = SRC.indexOf('const breadcrumbItems: BreadcrumbItem[] = isGlobalHub');
    const entityKeyIdx = SRC.indexOf('key: "entity"');
    expect(ternaryIdx).toBeGreaterThan(-1);
    expect(entityKeyIdx).toBeGreaterThan(-1);
    expect(ternaryIdx).toBeLessThan(entityKeyIdx);
  });

  it('skips the DB name lookup for global hubs', () => {
    expect(SRC).toMatch(/enabled:\s*!!projectKey\s*&&\s*!isGlobalHub/);
  });

  it('shows no star on global hubs', () => {
    expect(SRC).toMatch(/isGlobalHub\s*\?\s*undefined\s*:\s*surfaceStarType/);
  });
});
