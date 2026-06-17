/**
 * Status Color Lock
 * ─────────────────
 * Hard gate for the THREE canonical work-item status-pill colors:
 *   gray  (To Do)        #DDDEE1  rgb(221,222,225)
 *   blue  (In Progress)  #8FB8F6  rgb(143,184,246)
 *   green (Done)         #94C748  rgb(148,199,72)
 *
 * The ONLY place these may be DEFINED is statusPalette.ts. Every other surface
 * must import statusBg / categoryBg / STATUS_CATEGORY_BG. This rule fails the
 * build if a known divergent status-pill color literal reappears, or if the
 * old admin status trio is hardcoded in any status-category context.
 *
 * Added 2026-06-17 after five renderers + the admin EditStatusModal each had
 * their own status green (pale rgb(186,240,199), rgb(179,223,114), admin
 * #64748B/#2563EB/#16A34A) diverging from canonical.
 */
import fs from 'fs';
import path from 'path';

// The canonical source — the one file allowed to define the literals.
const SOURCE_OF_TRUTH = 'statusPalette.ts';

// Divergent status-pill color literals — these were ONLY ever used as wrong
// status pills, so they are unconditionally banned (outside the source file).
const BANNED_LITERALS = [
  { re: /186\s*,\s*240\s*,\s*199/, why: 'stale pale done-green — import statusPalette (success = #94C748)' },
  { re: /179\s*,\s*223\s*,\s*114/, why: 'stale done-green — import statusPalette (success = #94C748)' },
  { re: /#B3DF72/i,                why: 'stale done-green hex — import statusPalette (#94C748)' },
  { re: /#BAF0C7/i,                why: 'stale done-green hex — import statusPalette (#94C748)' },
];

// Old admin status trio — common as standalone colors, so only flagged when the
// file is a status-category color definition (has a status-category marker).
const ADMIN_TRIO = /#64748B|#2563EB|#16A34A/i;
const STATUS_CTX = /status[_-]?categor|STATUS_CATEGORY|statusToLozenge|StatusLozenge|status[_-]?color/i;

class StatusColorLock {
  constructor() {
    this.violations = [];
  }

  scanFile(filePath) {
    if (!/\.(tsx?|jsx?|css)$/.test(filePath)) return;
    if (filePath.includes(SOURCE_OF_TRUTH)) return; // the source defines them
    if (filePath.includes('status-color-lock')) return; // this rule lists them

    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes('ads-scanner:ignore-file')) return;
    const lines = content.split('\n');
    const isStatusFile = STATUS_CTX.test(content);

    lines.forEach((line, i) => {
      if (i > 0 && lines[i - 1].includes('ads-scanner:ignore-next-line')) return;

      for (const b of BANNED_LITERALS) {
        if (b.re.test(line)) {
          this.violations.push({
            file: filePath, line: i + 1, type: 'STATUS_COLOR_LOCK',
            content: line.trim().slice(0, 80), fix: b.why,
          });
        }
      }

      if (isStatusFile && ADMIN_TRIO.test(line)) {
        this.violations.push({
          file: filePath, line: i + 1, type: 'STATUS_COLOR_LOCK',
          content: line.trim().slice(0, 80),
          fix: 'non-canonical status color in a status-category map — import STATUS_CATEGORY_BG from statusPalette',
        });
      }
    });
  }

  scanDirectory(dirPath) {
    this.walkDir(dirPath).forEach(f => this.scanFile(f));
    return this.violations;
  }

  walkDir(dirPath) {
    const files = [];
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const full = path.join(dirPath, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...this.walkDir(full));
      } else if (entry.isFile()) {
        files.push(full);
      }
    }
    return files;
  }

  report() {
    if (this.violations.length === 0) {
      console.log('✅ Status Color Lock: PASSED (0 violations)');
      return { passed: true, violations: [] };
    }
    console.log(`⚠️  Status Color Lock: ${this.violations.length} violations found\n`);
    this.violations.slice(0, 10).forEach(v => {
      console.log(`  [${v.type}] ${path.basename(v.file)}:${v.line}`);
      console.log(`    ${v.content}`);
      console.log(`    Fix: ${v.fix}\n`);
    });
    if (this.violations.length > 10) console.log(`  ... and ${this.violations.length - 10} more`);
    return { passed: false, violations: this.violations };
  }
}

export default StatusColorLock;
