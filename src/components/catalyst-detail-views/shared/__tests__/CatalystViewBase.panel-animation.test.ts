/**
 * Guard: panelMode MODAL must NOT carry the cv-panel-in animation as an
 * inline React style property.
 *
 * Root cause (2026-05-24): when navigating between tickets of different
 * types (e.g. QA Bug → Story), CatalystDetailRouter unmounts the old
 * CatalystView* and mounts the new one. The freshly-mounted CatalystViewBase
 * applied `animation: 'cv-panel-in 200ms ease-out'` to its MODAL div,
 * causing a translateX(20px)→translateX(0) slide that made the panel appear
 * to jump sideways — visible as "shaking/dancing" in the allwork split view.
 *
 * The fix: remove `animation: 'cv-panel-in ...'` from the panelMode MODAL
 * style object. The @keyframes definition itself stays (it may be referenced
 * elsewhere or re-added for other purposes). Only the inline-style usage
 * in the React constant is banned.
 */
import * as fs from 'fs';
import * as path from 'path';

const FILE_PATH = path.resolve(
  __dirname,
  '../CatalystViewBase.tsx',
);

const source = fs.readFileSync(FILE_PATH, 'utf-8');

describe('CatalystViewBase panelMode — no slide-in animation on remount', () => {
  it('does not apply cv-panel-in as a React inline style (only the @keyframes definition is allowed)', () => {
    // The @keyframes line is: `'@keyframes cv-panel-in { from ...`
    // The banned inline-style line is: `animation: 'cv-panel-in 200ms ease-out'`
    // After stripping every @keyframes declaration, no remaining reference to
    // cv-panel-in as an animation: value should exist.
    const withoutKeyframes = source
      .split('\n')
      .filter(line => !line.includes('@keyframes cv-panel-in'))
      .join('\n');

    // The inline-style usage pattern: animation: 'cv-panel-in
    expect(withoutKeyframes).not.toMatch(/animation:\s*['"]cv-panel-in/);
  });
});
