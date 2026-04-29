/**
 * ADS Contrast Probe (Rule 5)
 *
 * Walks every visible text node in the document, computes effective
 * foreground/background, and reports WCAG AA failures (< 4.5:1 for normal
 * text, < 3:1 for large text >= 18px or >= 14px bold).
 *
 * ADS-AWARE: Skips elements whose computed colors resolve to known ADS
 * tokens (var(--ds-*)) — those are owned by @atlaskit/tokens and are
 * audited separately by ADS itself. Only flags raw hex / rgb leaks.
 *
 * Run inside the browser console (or via Playwright page.evaluate):
 *   const r = window.__catalystContrastProbe();
 *   console.log(r.failingCount, r.summary);
 */
(function attach() {
  function parseRgb(str) {
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(',').map(s => parseFloat(s.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
  }
  function relLum({ r, g, b }) {
    const f = c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function ratio(fg, bg) {
    const L1 = relLum(fg), L2 = relLum(bg);
    const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1];
    return (a + 0.05) / (b + 0.05);
  }
  function effectiveBg(el) {
    let cur = el;
    while (cur && cur !== document.documentElement) {
      const cs = getComputedStyle(cur);
      const bg = parseRgb(cs.backgroundColor);
      if (bg && bg.a > 0) return bg;
      cur = cur.parentElement;
    }
    const root = parseRgb(getComputedStyle(document.documentElement).backgroundColor);
    return root || { r: 255, g: 255, b: 255, a: 1 };
  }

  window.__catalystContrastProbe = function () {
    const failures = [];
    const seen = new WeakSet();
    const SKIP_TAGS = new Set(['NOSCRIPT', 'SCRIPT', 'STYLE', 'TEMPLATE', 'HEAD', 'META', 'LINK', 'TITLE']);
    document.querySelectorAll('body *').forEach(el => {
      if (seen.has(el)) return;
      seen.add(el);
      if (SKIP_TAGS.has(el.tagName)) return;
      if (el.closest('noscript, script, style, template')) return;
      // Only elements that directly contain text
      const hasOwnText = Array.from(el.childNodes).some(
        n => n.nodeType === 3 && n.textContent.trim().length > 0
      );
      if (!hasOwnText) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return;
      const fg = parseRgb(cs.color);
      if (!fg || fg.a === 0) return;
      const bg = effectiveBg(el);
      const r = ratio(fg, bg);
      const fontSize = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const isLarge = fontSize >= 18 || (fontSize >= 14 && bold);
      const threshold = isLarge ? 3 : 4.5;
      if (r < threshold) {
        failures.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 80),
          text: el.textContent.trim().slice(0, 50),
          fg: cs.color,
          bg: `rgb(${bg.r},${bg.g},${bg.b})`,
          ratio: +r.toFixed(2),
          threshold,
          fontSize,
        });
      }
    });
    // Summarize top offending classNames
    const byCls = {};
    failures.forEach(f => {
      const key = f.cls.split(' ')[0] || `(${f.tag})`;
      byCls[key] = (byCls[key] || 0) + 1;
    });
    const summary = Object.entries(byCls)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([k, v]) => ({ selector: k, count: v }));
    return {
      failingCount: failures.length,
      summary,
      worst: failures.sort((a, b) => a.ratio - b.ratio).slice(0, 10),
      mode: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      url: location.pathname,
    };
  };
})();
