import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface Metrics {
  vw: number;
  vh: number;
  topNav: { w: number; h: number };
  sidebar: { w: number; h: number };
  content: { w: number; h: number };
  cards: { w: number; h: number; count: number };
  unusedRight: number;
  unusedBottom: number;
  utilized: number;
}

function measure(): Metrics {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Top nav: first child of the shell or element with role=banner / sticky top
  const topNavEl = document.querySelector('[data-debug="topnav"]') ||
    document.querySelector('header') ||
    document.querySelector('nav');
  const topNav = topNavEl ? { w: topNavEl.getBoundingClientRect().width, h: topNavEl.getBoundingClientRect().height } : { w: vw, h: 48 };

  // Sidebar
  const sidebarEl = document.querySelector('[data-debug="sidebar"]') ||
    document.querySelector('aside') ||
    // fallback: first flex child that is narrow
    (() => {
      const main = document.querySelector('main');
      if (main?.previousElementSibling) {
        const r = main.previousElementSibling.getBoundingClientRect();
        if (r.width < 300 && r.height > 200) return main.previousElementSibling;
      }
      return null;
    })();
  const sidebarRect = sidebarEl ? (sidebarEl as Element).getBoundingClientRect() : { width: 0, height: 0, right: 0 };
  const sidebar = { w: sidebarRect.width, h: sidebarRect.height };

  // Content area
  const contentEl = document.querySelector('[data-debug="content"]') || document.querySelector('main');
  const contentRect = contentEl ? contentEl.getBoundingClientRect() : { width: vw - sidebar.w, height: vh - topNav.h, right: vw, bottom: vh };
  const content = { w: contentRect.width, h: contentRect.height };

  // Cards inside content
  const cardEls = contentEl
    ? contentEl.querySelectorAll('[data-debug="card"], .rounded-xl, [class*="rounded-xl"]')
    : document.querySelectorAll('.rounded-xl');
  let cardArea = 0;
  let maxCardW = 0;
  let maxCardH = 0;
  cardEls.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > 50 && r.height > 20) {
      cardArea += r.width * r.height;
      maxCardW = Math.max(maxCardW, r.width);
      maxCardH = Math.max(maxCardH, r.height);
    }
  });

  const unusedRight = Math.max(0, vw - (sidebarRect as DOMRect).right - (maxCardW || content.w));
  const unusedBottom = Math.max(0, vh - topNav.h - content.h);

  const topNavArea = topNav.w * topNav.h;
  const sidebarArea = sidebar.w * sidebar.h;
  const utilized = Math.min(100, ((topNavArea + sidebarArea + cardArea) / (vw * vh)) * 100);

  return {
    vw, vh, topNav, sidebar, content,
    cards: { w: maxCardW, h: maxCardH, count: cardEls.length },
    unusedRight, unusedBottom, utilized,
  };
}

function pct(part: number, whole: number) {
  if (!whole) return '0';
  return ((part / whole) * 100).toFixed(1);
}

function applyOutlines(on: boolean) {
  const style = on ? (sel: string, color: string) => {
    document.querySelectorAll(sel).forEach(el => {
      (el as HTMLElement).style.outline = `2px dashed ${color}`;
      (el as HTMLElement).dataset.debugOutline = '1';
    });
  } : () => {};

  // Clear previous
  document.querySelectorAll('[data-debug-outline]').forEach(el => {
    (el as HTMLElement).style.outline = '';
    delete (el as HTMLElement).dataset.debugOutline;
  });

  if (!on) return;

  // Orange: top nav
  const topNav = document.querySelector('header') || document.querySelector('nav');
  if (topNav) { (topNav as HTMLElement).style.outline = '2px dashed #F97316'; (topNav as HTMLElement).dataset.debugOutline = '1'; }

  // Green: sidebar
  const main = document.querySelector('main');
  const sidebar = main?.previousElementSibling;
  if (sidebar && sidebar.getBoundingClientRect().width < 300) {
    (sidebar as HTMLElement).style.outline = '2px dashed #22C55E';
    (sidebar as HTMLElement).dataset.debugOutline = '1';
  }

  // Red: content area
  if (main) { (main as HTMLElement).style.outline = '2px dashed #EF4444'; (main as HTMLElement).dataset.debugOutline = '1'; }

  // Blue: cards
  if (main) {
    main.querySelectorAll('.rounded-xl').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 50 && r.height > 20) {
        (el as HTMLElement).style.outline = '2px dashed #3B82F6';
        (el as HTMLElement).dataset.debugOutline = '1';
      }
    });
  }
}

export function ViewportDebug() {
  const [visible, setVisible] = useState(true);
  const [m, setM] = useState<Metrics | null>(null);

  const refresh = useCallback(() => setM(measure()), []);

  useEffect(() => {
    if (!visible) { applyOutlines(false); return; }
    refresh();
    applyOutlines(true);
    window.addEventListener('resize', refresh);
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => {
      window.removeEventListener('resize', refresh);
      observer.disconnect();
      applyOutlines(false);
    };
  }, [visible, refresh]);

  if (!visible || !m) return null;

  const rows = [
    ['VIEWPORT', `${m.vw} × ${m.vh} px`],
    ['TOP NAV', `${Math.round(m.topNav.h)}px = ${pct(m.topNav.h, m.vh)}%`],
    ['SIDEBAR', `${Math.round(m.sidebar.w)}px = ${pct(m.sidebar.w, m.vw)}%`],
    ['CONTENT', `${Math.round(m.content.w)} × ${Math.round(m.content.h)}px = ${pct(m.content.w * m.content.h, m.vw * m.vh)}%`],
    ['CARDS', `${Math.round(m.cards.w)}px wide (${m.cards.count} found) = ${pct(m.cards.w, m.content.w)}% of content`],
    ['UNUSED R', `${Math.round(m.unusedRight)}px = ${pct(m.unusedRight, m.vw)}%`],
    ['UNUSED B', `${Math.round(m.unusedBottom)}px = ${pct(m.unusedBottom, m.vh)}%`],
    ['UTILIZED', `${m.utilized.toFixed(1)}%`],
    ['WHITESPACE', `${(100 - m.utilized).toFixed(1)}%`],
  ];

  return (
    <div
      style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
        width: 300, background: '#0F172A', color: '#F8FAFC',
        borderRadius: 8, padding: 16,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
        lineHeight: 1.6, boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      <button
        onClick={() => setVisible(false)}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8',
        }}
      >
        <X size={14} />
      </button>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em', marginBottom: 8 }}>
        VIEWPORT DEBUG
      </div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-2">
          <span style={{ color: '#64748B' }}>{label}</span>
          <span style={{ color: label === 'UTILIZED' ? '#22C55E' : label === 'WHITESPACE' ? '#F97316' : '#F8FAFC' }}>
            {value}
          </span>
        </div>
      ))}
      <div style={{ marginTop: 8, fontSize: 9, color: '#475569', borderTop: '1px solid #1E293B', paddingTop: 6 }}>
        <span style={{ color: '#EF4444' }}>■</span> content{' '}
        <span style={{ color: '#3B82F6' }}>■</span> cards{' '}
        <span style={{ color: '#22C55E' }}>■</span> sidebar{' '}
        <span style={{ color: '#F97316' }}>■</span> topnav
      </div>
    </div>
  );
}
