/**
 * ADS Token Scanner
 * Detects hardcoded colors, hardcoded spacing, and non-ADS component usage
 */

import fs from 'fs';
import path from 'path';

class ADSTokenScanner {
  constructor() {
    this.violations = [];
    this.rawHexPattern = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;
    this.hardcodedPxPattern = /:\s*(\d+)px\b/g;

    // Tailwind utility classes. ALL must be replaced by ADS tokens or
    // inline ADS-styled props. Catches the full surface area, not just
    // colors. We match these only inside className="…" / className={…}
    // strings — bare identifiers in code (e.g. a JS variable called
    // `text-sm`) are ignored by anchoring on className context.
    //
    // Categories:
    //  - color:        text-{slate,red,green,blue,gray,yellow,orange,indigo,…}-{50..950}
    //                  bg-{slate,red,green,blue,gray,…}-{50..950}
    //                  border-{slate,red,green,blue,gray,…}-{50..950}
    //  - typography:   text-{xs,sm,base,lg,xl,2xl,3xl,4xl,5xl,6xl,7xl,8xl,9xl}
    //                  font-{thin,extralight,light,normal,medium,semibold,bold,extrabold,black}
    //                  uppercase / lowercase / capitalize / italic / not-italic
    //                  tracking-* / leading-*
    //  - spacing:      p-* / px-* / py-* / pt-* / pb-* / pl-* / pr-*
    //                  m-* / mx-* / my-* / mt-* / mb-* / ml-* / mr-*
    //                  gap-* / gap-x-* / gap-y-* / space-x-* / space-y-*
    //  - layout chrome rounded-* / shadow-* / border / border-* (sides only)
    //
    // The "size N" tail can be a digit, fraction (1/2), or arbitrary
    // bracket value ([14px]).
    this.tailwindUtilityRegex = /className\s*=\s*[{"']([^"'}]*?)["'}]/g;
    this.tailwindBannedTokens = [
      // typography
      /\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/,
      /\bfont-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/,
      /\b(?:uppercase|lowercase|capitalize|italic|not-italic)\b/,
      /\btracking-(?:tighter|tight|normal|wide|wider|widest|\[[^\]]+\])\b/,
      /\bleading-(?:none|tight|snug|normal|relaxed|loose|\d+|\[[^\]]+\])\b/,
      // color
      /\btext-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
      /\bbg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?\b/,
      /\bborder-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
      // spacing
      /\b[pm](?:[xytlbr])?-(?:\d+|\d+\.\d+|\[[^\]]+\])\b/,
      /\b(?:gap|space)(?:-[xy])?-(?:\d+|\[[^\]]+\])\b/,
      // chrome
      /\brounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full))?\b/,
      /\bshadow(?:-(?:sm|md|lg|xl|2xl|inner|none))?\b/,
    ];
    // ── 2026-05-19 — Whitelisted external packages ───────────────────
    // These scopes are trusted and should never be flagged as banned components.
    // @atlaskit/* is the canonical design system. @Catalyst/* are Catalyst's
    // internal packages and are trusted equally.
    this.allowedExternalScopes = ['@atlaskit', '@Catalyst'];

    this.bannedComponents = [
      'react-select',
      'react-modal',
      'react-dropdown',
      'react-datepicker',
      'rc-select',
      'antd',
      'material-ui',
      'chakra-ui'
    ];
    this.bannedFields = [
      'StoryPoints',
      'MDTRef',
      'AssessmentFeature',
      'ServiceNow',
      'CatalystStoryPoints',
      'CatalystMDTRef',
      'CatalystAssessment'
    ];

    // ── 2026-05-19 — additional rules ───────────────────────────────
    // Raw rgb()/rgba()/hsl()/hsla() outside var() fallbacks. ADS canon is
    // var(--ds-*) for every color; raw color functions slip past the hex
    // regex above and need their own check.
    // Note: this.rgbHslPattern is tested against a string that has had all
    // var() and token() expressions removed via removeVarExpressions() so
    // rgba() used as var() fallback values (e.g. box-shadow chains) are not
    // flagged as violations.
    this.rgbHslPattern = /\b(?:rgb|rgba|hsl|hsla)\(\s*\d/;
    // Banned toast libraries. Catalyst standardizes on @atlaskit/flag.
    this.bannedToastImports = [
      /from\s+['"]sonner['"]/,
      /from\s+['"]react-hot-toast['"]/,
      /from\s+['"]react-toastify['"]/,
    ];
    // Banned column-header string literals — catches hand-rolled
    // <th>Story Points</th> that slips past the component-name check.
    this.bannedColumnHeaders = [
      'Story Points',
      'MDT Ref',
      'Service Now',
      'ServiceNow#',
      'Assessment Feature',
      'Space URL',
      'Templates',
    ];
    // Atlaskit version drift — legacy @atlaskit/button import (not /new).
    this.atlaskitLegacyImport = /from\s+['"]@atlaskit\/button['"](?!\/new)/;
    // External .css imports outside the ADS allowlist.
    this.cssImportPattern = /import\s+['"][^'"]+\.css['"]/;
    this.allowedCssImports = ['ads-reset', 'atlaskit', '@atlaskit', 'tokens.css', 'ask-caty-input.css'];
  }

  /**
   * Remove all var() and token() expressions from a string, including nested
   * color functions like rgba() that appear as fallback values inside var().
   * Uses paren-depth tracking to correctly handle nesting such as:
   *   var(--ds-shadow-overlay, 0 4px rgba(9,30,66,0.15), 0 0 rgba(9,30,66,0.31))
   * Returns the string with var()/token() blocks excised so callers can check
   * for raw rgba()/hex that are truly outside any ADS token wrapper.
   */
  removeVarExpressions(str) {
    let result = '';
    let i = 0;
    while (i < str.length) {
      // Find the next var( or token( whichever comes first
      let nextIdx = str.length;
      for (const prefix of ['var(', 'token(']) {
        const idx = str.indexOf(prefix, i);
        if (idx !== -1 && idx < nextIdx) nextIdx = idx;
      }
      result += str.slice(i, nextIdx);
      if (nextIdx === str.length) break;
      // Skip past the entire function call by counting parens depth
      let depth = 0;
      let j = nextIdx;
      while (j < str.length) {
        if (str[j] === '(') depth++;
        else if (str[j] === ')') {
          depth--;
          if (depth === 0) { j++; break; }
        }
        j++;
      }
      i = j;
    }
    return result;
  }

  scanFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts') && !filePath.endsWith('.jsx')) {
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Ignore-marker support — escape hatch for intentional design-system
    // exemplars (components-preview gallery, on-purpose hex demos, etc.).
    //
    //   // ads-scanner:ignore-next-line
    //   <div style={{ color: '#FF0000' }}>this hex is shown ON PURPOSE</div>
    //
    //   // ads-scanner:ignore-file        ← put at the very top of a file
    //   ...whole file exempted...
    //
    // Use sparingly. Every ignore marker is a TODO to either delete the
    // demo code or replace it with a proper ADS-token example.
    if (content.includes('ads-scanner:ignore-file')) {
      return;
    }

    // Track whether the parser is inside a /* ... */ block comment so we
    // can skip block-comment lines entirely. JSDoc headers regularly
    // document Jira tokens by their rgb()/hex values for reference —
    // flagging those would be a false positive.
    let inBlockComment = false;

    lines.forEach((line, index) => {
      // Skip lines flagged by the preceding `// ads-scanner:ignore-next-line`
      // marker. The marker must be the immediately preceding line.
      if (index > 0 && lines[index - 1].includes('ads-scanner:ignore-next-line')) {
        return;
      }

      // Track block-comment state. A single line can both open and close
      // a block, or open it and continue — handle both.
      const trimmed = line.trim();
      const opensBlock = line.includes('/*') && !line.includes('*/');
      const closesBlock = line.includes('*/') && !line.includes('/*');
      const isStandaloneBlockLine = trimmed.startsWith('*') || trimmed.startsWith('/*');
      if (inBlockComment || isStandaloneBlockLine) {
        if (closesBlock) inBlockComment = false;
        else if (opensBlock) inBlockComment = true;
        return; // skip every line inside a block comment
      }
      if (opensBlock) inBlockComment = true;

      // Check for raw hex colors — but ONLY hex that is NOT inside a CSS
      // var() fallback chain. `var(--ds-foo, #BAR)` is the ADS-canonical
      // pattern (token first, hex fallback for browsers without CSS
      // custom-property support or SSR). Strip those before scanning.
      const stripped = line
        .replace(/var\([^)]*\)/g, '') // remove every var(...) expression
        // Also strip @atlaskit/tokens token(...) calls — same ADS-canonical
        // pattern. `token('color.text', '#172B4D')` means "use ADS token,
        // fallback to hex if the runtime can't resolve it" — flagging the
        // fallback hex is a false positive identical to var() fallback.
        .replace(/\btoken\([^)]*\)/g, '')
        .replace(/\/\/.*$/, ''); // strip line comments
      if (this.rawHexPattern.test(stripped)) {
        // Exclude allowed patterns
        if (!line.trim().startsWith('//') && !line.includes('whitelist')) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            type: 'RAW_HEX',
            content: line.trim(),
            fix: 'Use ADS token: var(--ds-text), var(--ds-background-*), etc.'
          });
        }
      }

      // Inline rgb()/rgba()/hsl()/hsla() not wrapped in var(). Use
      // removeVarExpressions() which handles nested parens correctly —
      // e.g. var(--ds-shadow-overlay, 0 4px rgba(9,30,66,0.15)) won't
      // fire because the rgba() is inside the var() fallback chain.
      const strippedForRgb = this.removeVarExpressions(
        line.replace(/\/\/.*$/, '').replace(/\btoken\([^)]*\)/g, ''),
      );
      if (
        this.rgbHslPattern.test(strippedForRgb) &&
        !line.trim().startsWith('//') &&
        !line.includes('whitelist')
      ) {
        this.violations.push({
          file: filePath,
          line: index + 1,
          type: 'RAW_RGB_HSL',
          content: line.trim(),
          fix: 'Use ADS token. Wrap raw rgb()/hsl() inside a var() fallback chain.'
        });
      }

      // Banned toast libraries. Catalyst standard is @atlaskit/flag.
      for (const rule of this.bannedToastImports) {
        if (rule.test(line)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            type: 'BANNED_TOAST',
            content: line.trim(),
            fix: 'Replace toast library with @atlaskit/flag.'
          });
          break;
        }
      }

      // Banned column header strings.
      for (const header of this.bannedColumnHeaders) {
        const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`<(?:th|TableHead|Th)[^>]*>\\s*${escaped}\\s*<`, 'i');
        if (re.test(line)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            type: 'BANNED_COLUMN_HEADER',
            content: line.trim(),
            tokenFound: header,
            fix: `Remove "${header}" column entirely. Banned platform-wide per CLAUDE.md.`
          });
        }
      }

      // Atlaskit legacy import (not /new).
      if (this.atlaskitLegacyImport.test(line)) {
        this.violations.push({
          file: filePath,
          line: index + 1,
          type: 'ATLASKIT_LEGACY',
          content: line.trim(),
          fix: 'Migrate to @atlaskit/button/new API.'
        });
      }

      // Non-ADS .css file imports.
      if (this.cssImportPattern.test(line)) {
        const allowed = this.allowedCssImports.some(a => line.includes(a));
        if (!allowed) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            type: 'CSS_FILE_IMPORT',
            content: line.trim(),
            fix: 'Replace .css import with CSS-in-JS using ADS tokens.'
          });
        }
      }

      // Check for hardcoded px spacing in padding/margin properties.
      // Per CLAUDE.md the canonical Catalyst spacing grid is direct px
      // values 0/4/8/12/16/24/32 (12 is on the Jira grid for half-step
      // alignment of nav items). Off-grid values like 7px, 13px, 18px are
      // violations.
      //
      // We extract the padding/margin VALUE specifically (not numbers from
      // unrelated properties on the same line such as border widths or icon
      // sizes) and check each shorthand component against the grid.
      const VALID_GRID = new Set([0, 4, 8, 12, 16, 24, 32, 40, 48]);
      const spacingMatches = [
        ...line.matchAll(/(?:padding|margin)(?:Top|Bottom|Left|Right|Inline|Block)?\s*:\s*['"]?([^'"`,}]+)['"]?/g),
      ];
      for (const m of spacingMatches) {
        const value = m[1];
        if (value.includes('var(') || value.includes('token(') || value.includes('calc(')) continue;
        // Extract every number in the shorthand value
        const nums = [...value.matchAll(/(-?\d+)(?:px)?/g)].map(n => parseInt(n[1]));
        const hasOffGrid = nums.some(n => !VALID_GRID.has(Math.abs(n)));
        if (hasOffGrid) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            type: 'HARDCODED_PX',
            content: line.trim(),
            fix: 'Use spacing grid: 0/4/8/12/16/24/32/40/48 px direct, or var(--ds-space-*).'
          });
          break;
        }
      }

      // Check for banned Tailwind utility classes inside className="…".
      // Only fires when the violating token is part of a className context —
      // strings elsewhere are ignored. Each className string is checked
      // independently so we can pinpoint the exact violating token.
      const matches = [...line.matchAll(this.tailwindUtilityRegex)];
      for (const m of matches) {
        const classes = m[1];
        for (const rule of this.tailwindBannedTokens) {
          const hit = classes.match(rule);
          if (hit) {
            this.violations.push({
              file: filePath,
              line: index + 1,
              type: 'TAILWIND_CLASS',
              content: line.trim(),
              tokenFound: hit[0],
              fix: `Replace Tailwind utility "${hit[0]}" with ADS token or inline style: fontSize/fontWeight/padding/margin/color from ADS tokens (var(--ds-*)).`
            });
            // Only report the first hit per className= to avoid spam — the
            // developer will see the offending block and clean all utilities.
            break;
          }
        }
      }

      // Check for banned component imports
      // But whitelist allowed external scopes (@atlaskit, @Catalyst)
      const isAllowedScope = this.allowedExternalScopes.some(scope =>
        line.includes(`from '${scope}/`) || line.includes(`from "${scope}/`)
      );

      if (!isAllowedScope) {
        this.bannedComponents.forEach(banned => {
          if (line.includes(`from '${banned}'`) || line.includes(`from "${banned}"`)) {
            this.violations.push({
              file: filePath,
              line: index + 1,
              type: 'BANNED_COMPONENT',
              content: line.trim(),
              fix: `Replace ${banned} with @atlaskit/* equivalent`
            });
          }
        });
      }

      // Check for banned field components
      this.bannedFields.forEach(banned => {
        if ((line.includes(`<${banned}`) || line.includes(`import ${banned}`) || line.includes(`.${banned}`)) && !line.trim().startsWith('//')) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            type: 'BANNED_FIELD',
            content: line.trim(),
            fix: `${banned} is permanently banned from Catalyst. Remove or replace with approved field.`
          });
        }
      });

      // Check for hand-rolled menus/dropdowns (menuitem without aria-role)
      if ((line.includes('onClick') && line.includes('menu')) && !line.includes('@atlaskit/dropdown-menu')) {
        if (line.includes('useState') || line.includes('showMenu') || line.includes('toggleMenu')) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            type: 'HAND_ROLLED_MENU',
            content: line.trim(),
            fix: 'Use @atlaskit/dropdown-menu instead of hand-rolled menu implementation'
          });
        }
      }
    });
  }

  scanDirectory(dirPath) {
    const files = this.walkDir(dirPath);
    files.forEach(file => this.scanFile(file));
    return this.violations;
  }

  walkDir(dirPath) {
    const files = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    entries.forEach(entry => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...this.walkDir(fullPath));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    });

    return files;
  }

  report() {
    if (this.violations.length === 0) {
      console.log('✅ ADS Token Scanner: PASSED (0 violations)');
      return { passed: true, violations: [] };
    }

    console.log(`⚠️  ADS Token Scanner: ${this.violations.length} violations found\n`);
    this.violations.forEach(v => {
      console.log(`  [${v.type}] ${v.file}:${v.line}`);
      console.log(`    Content: ${v.content}`);
      console.log(`    Fix: ${v.fix}\n`);
    });

    return { passed: false, violations: this.violations };
  }
}

export default ADSTokenScanner;
