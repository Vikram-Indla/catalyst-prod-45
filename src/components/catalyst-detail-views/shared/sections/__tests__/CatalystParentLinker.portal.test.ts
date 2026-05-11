/**
 * CatalystParentLinker — picker dropdown must be portaled to document.body
 *
 * Vikram defect 2026-05-10: "When I click Priority, it does not work. When I
 * click it, it shows a very long text box, which is wrong."
 *
 * Root cause: the parent picker's dropdown was rendered with
 * `position: absolute; top: 100%; left: 0; right: 0` INSIDE the trigger's
 * relative container. That placed the dropdown visually over the next
 * FieldRow (Priority). With z-index 100, clicks on the visually-Priority
 * pixels landed on the picker dropdown (higher z-index), so the
 * click-outside handler treated them as "inside" the picker and never
 * closed. User perceived clicking Priority as opening a search input.
 *
 * Fix (option A): render the dropdown via createPortal to document.body
 * using position:fixed coordinates from the trigger's getBoundingClientRect.
 * Breaks the stacking context so sibling rows (Priority) receive clicks
 * correctly. Pattern matches CLAUDE.md 2026-05-08 (GlobalSearchPanel
 * filter chips + WatchersChip self-rolled popover).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
  resolve(__dirname, '../CatalystParentLinker.tsx'),
  'utf-8',
);

describe('CatalystParentLinker — portal dropdown (option A)', () => {
  it('imports createPortal from react-dom', () => {
    expect(
      /import\s+\{\s*createPortal\s*\}\s+from\s+['"]react-dom['"]/.test(src),
      'CatalystParentLinker must import createPortal from react-dom to portal the picker dropdown.',
    ).toBe(true);
  });

  it('uses createPortal for all picker dropdown render calls', () => {
    // Each of the 3 picker variants (BusinessRequestParentPicker,
    // SingleParentPicker, MultiLinkPicker) must call createPortal at least
    // once. Sum should be 3.
    const calls = (src.match(/createPortal\(/g) ?? []).length;
    expect(
      calls,
      'CatalystParentLinker must call createPortal for all 3 picker variants. ' +
      'Each variant\'s dropdown must be portaled to document.body so it does ' +
      'not visually overlap sibling rows (Priority, etc).',
    ).toBeGreaterThanOrEqual(3);
  });

  it('no picker dropdown uses position:absolute top:100% (old in-place positioning)', () => {
    // The pre-fix pattern was `position: 'absolute', left: 0, right: 0, top: '100%'`
    // which placed the dropdown inside the trigger's relative container.
    // After portal conversion, dropdowns use `position: 'fixed'` with computed
    // top/left from getBoundingClientRect.
    expect(
      /position: ['"]absolute['"], left: 0, right: 0, top: ['"]100%['"]/.test(src),
      'CatalystParentLinker must not use position:absolute top:100% for picker ' +
      'dropdowns. Use createPortal + position:fixed with getBoundingClientRect.',
    ).toBe(false);
  });

  it('portal dropdowns are tagged with data-cv-parent-picker for click-outside guards', () => {
    const tags = (src.match(/data-cv-parent-picker="true"/g) ?? []).length;
    expect(
      tags,
      'Each portaled dropdown must carry data-cv-parent-picker="true" so any ' +
      'global click-outside handler can identify it.',
    ).toBeGreaterThanOrEqual(3);
  });

  it('uses a single usePickerPosition helper for trigger rect tracking', () => {
    expect(
      /function\s+usePickerPosition\b/.test(src),
      'CatalystParentLinker must define a usePickerPosition helper that computes ' +
      'the trigger getBoundingClientRect and tracks resize/scroll.',
    ).toBe(true);
  });

  it('all click-outside handlers guard both triggerRef and portalRef', () => {
    // After the conversion, every variant\'s click-outside handler must
    // check both refs. Look for the canonical pattern.
    const triggerChecks = (src.match(/triggerRef\.current\?\.contains/g) ?? []).length;
    const portalChecks = (src.match(/portalRef\.current\?\.contains/g) ?? []).length;
    expect(
      triggerChecks,
      'All 3 picker variants must guard click-outside via triggerRef.current?.contains',
    ).toBeGreaterThanOrEqual(3);
    expect(
      portalChecks,
      'All 3 picker variants must guard click-outside via portalRef.current?.contains',
    ).toBeGreaterThanOrEqual(3);
  });
});
