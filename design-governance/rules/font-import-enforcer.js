/**
 * Font Import Enforcer
 *
 * Bans every font source EXCEPT the Atlassian Design System CDN.
 * Scans .css, .html, .tsx, .ts, .jsx for:
 *   - @import url(<non-atlassian font CDN>)
 *   - @font-face { src: url(<non-atlassian CDN>) }
 *   - <link rel="stylesheet" href="<non-atlassian font CDN>">
 *   - <link rel="preconnect" href="<non-atlassian font CDN>">
 *
 * Allowed font CDNs (from CLAUDE.md FONTS BANNED EXCEPT ADS rule):
 *   - ds-cdn.prod-east.frontend.public.atl-paas.net  (Atlassian official)
 *   - *.atlassian.com
 *   - *.atlassian.design
 *
 * Banned CDNs (non-exhaustive): fonts.googleapis.com, fonts.gstatic.com,
 *   use.typekit.net, use.fontawesome.com, fontlibrary.org, fontshare.com,
 *   rsms.me/inter, cdn.jsdelivr.net/npm/@fontsource, unpkg.com/@fontsource.
 *
 * @font-face declarations are also banned when their src URL is non-Atlassian.
 * Self-hosted @font-face (relative path or no URL) is flagged too — the only
 * approved path to add a font is the Atlassian CDN.
 */

import fs from 'fs';
import path from 'path';

const ALLOWED_FONT_HOSTS = [
  'ds-cdn.prod-east.frontend.public.atl-paas.net',
  'atlassian.com',
  'atlassian.design',
  'atl-paas.net',
];

const FONT_CDN_PATTERNS = [
  /fonts\.googleapis\.com/i,
  /fonts\.gstatic\.com/i,
  /use\.typekit\.net/i,
  /p\.typekit\.net/i,
  /use\.fontawesome\.com/i,
  /fontlibrary\.org/i,
  /fontshare\.com/i,
  /rsms\.me\/inter/i,
  /fontsource/i,
  /cdnfonts\.com/i,
];

const SCANNED_EXTENSIONS = ['.css', '.html', '.tsx', '.ts', '.jsx'];

class FontImportEnforcer {
  constructor() {
    this.violations = [];
  }

  isAllowedHost(url) {
    return ALLOWED_FONT_HOSTS.some(host => url.includes(host));
  }

  isBannedFontCdn(url) {
    return FONT_CDN_PATTERNS.some(pat => pat.test(url));
  }

  scanFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (!SCANNED_EXTENSIONS.includes(ext)) return;

    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes('ads-scanner:ignore-file')) return;

    const lines = content.split('\n');
    let inBlockComment = false;

    lines.forEach((line, idx) => {
      // Skip inline `// ads-scanner:ignore-line` (mirrors the color gate).
      if (line.includes('ads-scanner:ignore-line')) return;
      if (idx > 0 && lines[idx - 1].includes('ads-scanner:ignore-next-line')) return;

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

      // 1) @import url(...) — flag any URL not on Atlassian CDN
      const importMatch = line.match(/@import\s+url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
      if (importMatch) {
        const url = importMatch[1];
        if (!this.isAllowedHost(url)) {
          this.violations.push({
            file: filePath,
            line: idx + 1,
            type: 'BANNED_FONT_IMPORT',
            content: line.trim().slice(0, 120),
            url,
            fix: 'Remove @import. Only Atlassian CDN (ds-cdn.prod-east.frontend.public.atl-paas.net) is allowed for fonts.',
          });
        }
      }

      // 2) @font-face — flag whole declaration; check src URL on subsequent
      //    lines. We approximate by flagging the @font-face line and letting
      //    a follow-up src check on the same line catch inline form.
      //    A @font-face block is allowed ONLY if the src URL is Atlassian.
      if (/@font-face\s*\{/i.test(line)) {
        // Look ahead up to 10 lines for src: url(...)
        let srcUrl = null;
        for (let j = idx; j < Math.min(idx + 10, lines.length); j++) {
          const srcMatch = lines[j].match(/src\s*:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
          if (srcMatch) { srcUrl = srcMatch[1]; break; }
        }
        if (srcUrl && !this.isAllowedHost(srcUrl)) {
          this.violations.push({
            file: filePath,
            line: idx + 1,
            type: 'BANNED_FONT_FACE',
            content: line.trim().slice(0, 120),
            url: srcUrl,
            fix: 'Self-hosted or non-Atlassian @font-face is banned. Load Atlassian Sans/Mono from ds-cdn.prod-east.frontend.public.atl-paas.net only.',
          });
        }
        if (!srcUrl) {
          this.violations.push({
            file: filePath,
            line: idx + 1,
            type: 'BANNED_FONT_FACE',
            content: line.trim().slice(0, 120),
            fix: '@font-face without a recognised src URL. Only Atlassian CDN @font-face is allowed.',
          });
        }
      }

      // 3) <link rel="stylesheet|preconnect|preload" href="<font cdn>">
      const linkMatch = line.match(/<link[^>]+href\s*=\s*['"]([^'"]+)['"]/i);
      if (linkMatch) {
        const url = linkMatch[1];
        const isFontish = this.isBannedFontCdn(url) || /font|typekit|webfont/i.test(url);
        if (isFontish && !this.isAllowedHost(url)) {
          this.violations.push({
            file: filePath,
            line: idx + 1,
            type: 'BANNED_FONT_LINK',
            content: line.trim().slice(0, 140),
            url,
            fix: 'Remove <link> to non-Atlassian font CDN. Atlassian CDN only.',
          });
        }
      }

      // 4) Raw URL string referencing a banned font CDN anywhere
      //    (catches dynamic `loadFont('https://fonts.googleapis.com/...')`)
      if (this.isBannedFontCdn(line) && !line.includes('ads-scanner:ignore')) {
        // Avoid double-flagging if already caught by import/link/font-face
        const alreadyFlagged = this.violations.some(v =>
          v.file === filePath && v.line === idx + 1,
        );
        if (!alreadyFlagged) {
          this.violations.push({
            file: filePath,
            line: idx + 1,
            type: 'BANNED_FONT_CDN_URL',
            content: line.trim().slice(0, 140),
            fix: 'Remove reference to non-Atlassian font CDN.',
          });
        }
      }
    });
  }

  scanDirectory(dirPath) {
    const walk = (dir) => {
      fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') return;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile() && SCANNED_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
          this.scanFile(full);
        }
      });
    };
    walk(dirPath);
    return this.violations;
  }

  report() {
    if (this.violations.length === 0) {
      console.log('✅ Font Import Enforcer: PASSED (0 violations)');
      return { passed: true, violations: [] };
    }
    console.log(`⚠️  Font Import Enforcer: ${this.violations.length} violations found\n`);
    this.violations.slice(0, 10).forEach(v => {
      console.log(`  [${v.type}] ${path.basename(v.file)}:${v.line}`);
      if (v.url) console.log(`    URL: ${v.url}`);
      console.log(`    Fix: ${v.fix}\n`);
    });
    if (this.violations.length > 10) {
      console.log(`  ... and ${this.violations.length - 10} more`);
    }
    return { passed: false, violations: this.violations };
  }
}

export default FontImportEnforcer;
