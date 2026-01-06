/**
 * ThemeAuditOverlay — DEV-only runtime toggle for Catalyst V5 theme drift detection
 * 
 * Keyboard shortcut: Shift+T to toggle
 * 
 * When enabled:
 * - Outlines any element using raw colors (hex/rgb/hsl or Tailwind palette classes)
 *   with a red dashed outline
 * - Prints violations to console table with component info
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Patterns that indicate color drift (violations)
const VIOLATION_PATTERNS = {
  // Tailwind palette colors (non-token)
  tailwindPalette: /\b(text|bg|border|ring|divide)-(red|green|blue|yellow|amber|orange|purple|pink|indigo|violet|emerald|cyan|teal|rose|sky|lime|fuchsia|stone|gray|slate|zinc|neutral)-(50|100|200|300|400|500|600|700|800|900|950)\b/,
  // Hardcoded white with opacity
  whiteOpacity: /\b(text|bg|border|ring)-white\/([\d]+)\b/,
  // Raw white classes
  rawWhite: /\b(text-white|bg-white|border-white|ring-white)\b(?!\/)/,
};

// CSS property patterns for inline style violations
const INLINE_VIOLATIONS = {
  hexColor: /#[0-9a-fA-F]{3,8}/,
  rgbColor: /rgb\s*\(/,
  hslColor: /hsl\s*\(/,
  rgbaColor: /rgba\s*\(/,
  hslaColor: /hsla\s*\(/,
};

interface Violation {
  element: Element;
  type: string;
  value: string;
  path: string;
}

function getElementPath(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className.split(' ').filter(c => c && !c.startsWith('audit-'));
      if (classes.length > 0) {
        selector += `.${classes.slice(0, 2).join('.')}`;
      }
    }
    parts.unshift(selector);
    current = current.parentElement;
    if (parts.length > 4) break;
  }
  
  return parts.join(' > ');
}

function findViolations(): Violation[] {
  const violations: Violation[] = [];
  const allElements = document.querySelectorAll('*');
  
  allElements.forEach((element) => {
    const classList = element.className;
    if (typeof classList !== 'string') return;
    
    // Check if element is inside sidebar/aside (stricter rules)
    const isInSidebar = element.closest('aside, [data-sidebar], .sidebar') !== null;
    
    // Check class-based violations
    for (const [type, pattern] of Object.entries(VIOLATION_PATTERNS)) {
      const match = classList.match(pattern);
      if (match) {
        violations.push({
          element,
          type: isInSidebar ? `sidebar:${type}` : `class:${type}`,
          value: match[0],
          path: getElementPath(element),
        });
      }
    }
    
    // Check inline style violations
    const style = element.getAttribute('style');
    if (style) {
      for (const [type, pattern] of Object.entries(INLINE_VIOLATIONS)) {
        const match = style.match(pattern);
        if (match) {
          violations.push({
            element,
            type: isInSidebar ? `sidebar-inline:${type}` : `inline:${type}`,
            value: match[0],
            path: getElementPath(element),
          });
        }
      }
    }
    
    // Extra sidebar-specific checks
    if (isInSidebar) {
      // Check for forbidden opacity classes
      if (classList.match(/opacity-(10|20|30|40|50)\b/)) {
        violations.push({
          element,
          type: 'sidebar:low-opacity',
          value: classList.match(/opacity-\d+/)?.[0] || 'opacity class',
          path: getElementPath(element),
        });
      }
    }
  });
  
  return violations;
}

export function ThemeAuditOverlay() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  
  // Only enable in development
  if (import.meta.env.PROD) return null;
  
  const runAudit = useCallback(() => {
    const found = findViolations();
    setViolations(found);
    
    // Log to console
    if (found.length > 0) {
      console.group(`🎨 Theme Audit: ${found.length} violations found`);
      console.table(found.map(v => ({
        Type: v.type,
        Value: v.value,
        Path: v.path,
      })));
      console.groupEnd();
    } else {
      console.log('🎨 Theme Audit: ✅ No violations found');
    }
    
    // Apply visual indicators
    found.forEach(v => {
      (v.element as HTMLElement).style.outline = '2px dashed #ff4444';
      (v.element as HTMLElement).style.outlineOffset = '-2px';
      v.element.classList.add('audit-violation');
    });
    
    return found;
  }, []);
  
  const clearAudit = useCallback(() => {
    document.querySelectorAll('.audit-violation').forEach(el => {
      (el as HTMLElement).style.outline = '';
      (el as HTMLElement).style.outlineOffset = '';
      el.classList.remove('audit-violation');
    });
    setViolations([]);
  }, []);
  
  // Keyboard shortcut: Shift+T
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setIsEnabled(prev => {
          if (!prev) {
            setTimeout(runAudit, 100);
          } else {
            clearAudit();
          }
          return !prev;
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runAudit, clearAudit]);
  
  // Re-run audit when enabled and DOM changes
  useEffect(() => {
    if (!isEnabled) return;
    
    const observer = new MutationObserver(() => {
      clearAudit();
      runAudit();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    
    return () => observer.disconnect();
  }, [isEnabled, runAudit, clearAudit]);
  
  if (!isEnabled) return null;
  
  return createPortal(
    <>
      {/* Status badge */}
      <div
        className="fixed top-4 right-4 z-[99999] flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg font-mono text-xs"
        style={{
          backgroundColor: violations.length > 0 ? '#dc2626' : '#16a34a',
          color: 'white',
        }}
      >
        <span className="font-bold">🎨 AUDIT</span>
        <span>{violations.length} violations</span>
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="ml-2 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30"
        >
          {showPanel ? 'Hide' : 'Show'}
        </button>
        <button
          onClick={() => {
            clearAudit();
            setIsEnabled(false);
          }}
          className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30"
        >
          ✕
        </button>
      </div>
      
      {/* Violations panel */}
      {showPanel && violations.length > 0 && (
        <div
          className="fixed top-16 right-4 z-[99999] w-96 max-h-96 overflow-auto rounded-lg shadow-xl font-mono text-xs"
          style={{
            backgroundColor: '#1a1a1a',
            color: '#e5e5e5',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="sticky top-0 px-3 py-2 border-b border-white/10 bg-[#262626]">
            <strong>Violations ({violations.length})</strong>
          </div>
          <div className="divide-y divide-white/5">
            {violations.slice(0, 50).map((v, i) => (
              <div
                key={i}
                className="px-3 py-2 hover:bg-white/5 cursor-pointer"
                onClick={() => {
                  v.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  (v.element as HTMLElement).style.outline = '3px solid #ff0000';
                  setTimeout(() => {
                    (v.element as HTMLElement).style.outline = '2px dashed #ff4444';
                  }, 1000);
                }}
              >
                <div className="text-red-400 font-semibold">{v.type}</div>
                <div className="text-yellow-400">{v.value}</div>
                <div className="text-gray-500 truncate">{v.path}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

export default ThemeAuditOverlay;
