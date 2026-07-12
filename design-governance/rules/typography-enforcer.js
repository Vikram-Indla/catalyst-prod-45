/**
 * Typography Enforcer
 * Ensures heading/body text matches ADS specifications
 */

import fs from 'fs';
import path from 'path';

class TypographyEnforcer {
  constructor() {
    this.violations = [];
    // Per CLAUDE.md (2026-05-19), admin H1 is Jira-parity 24/653 — not the
    // legacy 28/600. Each rule accepts an array of (fontSize, fontWeight)
    // pairs so both the Jira-parity tokens AND older sweep tokens pass.
    this.rules = {
      h1: [
        { fontSize: '24px', fontWeight: '653' }, // Jira admin parity
        { fontSize: '24px', fontWeight: '600' }, // acceptable alternate
        { fontSize: '28px', fontWeight: '600' }, // legacy ADS scale
      ],
      h2: [
        { fontSize: '20px', fontWeight: '653' },
        { fontSize: '20px', fontWeight: '600' },
        { fontSize: '16px', fontWeight: '653' }, // Jira section header (inside content panels)
        { fontSize: '16px', fontWeight: '600' },
      ],
      h3: [{ fontSize: '16px', fontWeight: '600' }, { fontSize: '16px', fontWeight: '653' }, { fontSize: '14px', fontWeight: '600' }],
      body: [{ fontSize: '14px', fontWeight: '400' }],
      small: [{ fontSize: '12px', fontWeight: '400' }],
    };
  }

  scanFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.tsx')) {
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Same ignore-marker scheme as ads-token-scanner. See its scanFile
    // for the full description.
    if (content.includes('ads-scanner:ignore-file')) {
      return;
    }

    let inBlockComment = false;

    lines.forEach((line, index) => {
      // Skip lines carrying an inline `// ads-scanner:ignore-line` marker
      // (mirrors the color gate, which honors both same-line and next-line).
      if (line.includes('ads-scanner:ignore-line')) {
        return;
      }
      if (index > 0 && lines[index - 1].includes('ads-scanner:ignore-next-line')) {
        return;
      }
      // Skip /* ... */ block-comment lines (JSDoc headers etc.).
      const trimmed = line.trim();
      const opensBlock = line.includes('/*') && !line.includes('*/');
      const closesBlock = line.includes('*/') && !line.includes('/*');
      const isStandaloneBlockLine = trimmed.startsWith('*') || trimmed.startsWith('/*');
      if (inBlockComment || isStandaloneBlockLine) {
        if (closesBlock) inBlockComment = false;
        else if (opensBlock) inBlockComment = true;
        return;
      }
      if (opensBlock) inBlockComment = true;
      // Check for h1/h2/h3 tags
      ['h1', 'h2', 'h3'].forEach(tag => {
        if (line.includes(`<${tag}`) && line.includes('style=')) {
          // Parse inline styles
          const styleMatch = line.match(/style=\{?\s*{([^}]+)}\s*\}?/);
          if (styleMatch) {
            const styles = styleMatch[1];
            const rules = this.rules[tag];
            // Match against ANY of the accepted rule pairs. Each rule pair
            // is satisfied if BOTH its fontSize AND fontWeight appear in
            // the inline style (in any order, with optional quotes).
            const matchesAny = rules.some(r => {
              // Accept fontSize: 24, fontSize: '24px', fontSize: "24px"
              const sizeNum = r.fontSize.replace('px', '');
              const sizeRe = new RegExp(
                `fontSize\\s*:\\s*['"]?${sizeNum}(?:px)?['"]?`,
              );
              const weightRe = new RegExp(
                `fontWeight\\s*:\\s*['"]?${r.fontWeight}['"]?`,
              );
              return sizeRe.test(styles) && weightRe.test(styles);
            });
            if (!matchesAny) {
              const acceptedList = rules
                .map(r => `${r.fontSize}/${r.fontWeight}`)
                .join(' or ');
              this.violations.push({
                file: filePath,
                line: index + 1,
                type: 'TYPOGRAPHY_MISMATCH',
                tag: tag,
                content: line.trim().substring(0, 80),
                expected: acceptedList,
                fix: `Apply ADS token: ${acceptedList}`,
              });
            }
          }
        }
      });

      // Check for text-transform: uppercase (banned) — supports BOTH
      // CSS kebab-case (`text-transform: uppercase`) AND React inline
      // camelCase (`textTransform: 'uppercase'`) AND Tailwind className
      // `uppercase`. Sentence-case is the only allowed label form per
      // CLAUDE.md.
      const hasInlineUppercase =
        (line.includes('text-transform') || line.includes('textTransform')) &&
        line.includes('uppercase');
      const hasTailwindUppercase =
        /className\s*=\s*[{"'][^"'}]*\buppercase\b/.test(line);
      if (hasInlineUppercase || hasTailwindUppercase) {
        this.violations.push({
          file: filePath,
          line: index + 1,
          type: 'UPPERCASE_LABEL',
          content: line.trim(),
          fix: 'Remove text-transform/uppercase utility; use sentence-case in label strings'
        });
      }

      // Check for font-size hardcoding. Only flag when the fontSize VALUE
      // itself uses a px literal — e.g. `fontSize: '14px'`. Do NOT fire on
      // lines where px appears only in unrelated properties on the same line
      // (e.g. lineHeight: '20px' on the same line as fontSize: 14).
      if (line.includes('fontSize:') && !line.includes('var(')) {
        const fsSizeMatch = line.match(/fontSize:\s*['"](\d+px)['"]/);
        if (fsSizeMatch) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            type: 'HARDCODED_FONTSIZE',
            content: line.trim(),
            fix: 'Use ADS typography token or named size from ads-config.json'
          });
        }
      }

      // Check for hardcoded fontWeight. Allowed: the standard 100-step CSS
      // scale (300/400/500/600/700/900) PLUS the Jira-derived weights
      // probed live from atlassian.design (653 = Jira headers/lozenges,
      // 800 = Jira table column heads in some surfaces). These are
      // ADS-canonical for parity work and explicitly approved by Vikram.
      if (line.includes('fontWeight:') && !line.includes('var(')) {
        const match = line.match(/fontWeight:\s*['"]?(\d+)['"]?/);
        if (match) {
          const weight = parseInt(match[1]);
          const ALLOWED_WEIGHTS = [300, 400, 500, 600, 653, 700, 800, 900];
          if (!ALLOWED_WEIGHTS.includes(weight)) {
            this.violations.push({
              file: filePath,
              line: index + 1,
              type: 'INVALID_FONTWEIGHT',
              content: line.trim(),
              expected: `fontWeight should be one of ${ALLOWED_WEIGHTS.join(', ')}`,
              fix: 'Use valid ADS font weight: 400 (normal), 500 (medium), 600 (semibold), 653 (Jira semibold-emphasis), 700 (bold)'
            });
          }
        }
      }

      // Check for banned font families. 2026-06-09 ADS compliance sweep —
      // extended ban list to include Inter, Sora, Plus Jakarta Sans, JetBrains
      // Mono (Catalyst pre-ADS picks). Only Atlassian Sans + canonical fallback
      // system stack permitted (atlassian.design/foundations/typography).
      if ((line.includes('fontFamily') || line.includes('font-family')) && !line.includes('var(')) {
        const bannedFonts = [
          'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier',
          'Inter', 'Sora', 'Plus Jakarta Sans', 'JetBrains Mono', 'Roboto', 'Open Sans',
        ];
        for (const font of bannedFonts) {
          if (line.includes(`'${font}'`) || line.includes(`"${font}"`) || line.match(new RegExp(`\\b${font}\\b`))) {
            this.violations.push({
              file: filePath,
              line: index + 1,
              type: 'BANNED_FONT_FAMILY',
              content: line.trim(),
              fix: `Replace '${font}' with the ADS Sans stack: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif' (or canonical mono stack).`
            });
          }
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
      console.log('✅ Typography Enforcer: PASSED (0 violations)');
      return { passed: true, violations: [] };
    }

    console.log(`⚠️  Typography Enforcer: ${this.violations.length} violations found\n`);
    this.violations.slice(0, 10).forEach(v => {
      console.log(`  [${v.type}] ${path.basename(v.file)}:${v.line}`);
      console.log(`    Expected: ${v.expected || 'sentence-case'}`);
      console.log(`    Fix: ${v.fix}\n`);
    });

    if (this.violations.length > 10) {
      console.log(`  ... and ${this.violations.length - 10} more violations`);
    }

    return { passed: false, violations: this.violations };
  }
}

export default TypographyEnforcer;
