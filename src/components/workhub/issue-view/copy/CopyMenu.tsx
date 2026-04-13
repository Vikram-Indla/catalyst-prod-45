/**
 * CopyMenu — Dropdown with 6 copy options + clipboard fallback modal
 * ════════════════════════════════════════════════════════════════════════════
 * Options: Copy key, summary, All work (plain), All work (markdown), Fields (CSV)
 * Clipboard fallback: opens modal with selectable textarea if writeText fails.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check, X } from 'lucide-react';
import {
  formatIssueKey, formatIssueSummary,
  formatAllWorkPlainText, formatAllWorkMarkdown, formatFieldsCsv,
} from './formatters';
import type { AllWorkItem } from '@/types/allwork.types';

interface CopyMenuProps {
  issueKey: string;
  item?: AllWorkItem | null;
  isDark: boolean;
}

type CopyKind = 'key' | 'summary' | 'allworkPlain' | 'allworkMd' | 'fieldsCsv';

export function CopyMenu({ issueKey, item, isDark }: CopyMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<CopyKind | null>(null);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Auto-select fallback textarea
  useEffect(() => {
    if (fallbackText && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [fallbackText]);

  // Clear "copied" feedback after 2s
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = useCallback(async (kind: CopyKind) => {
    if (!item) return;

    let text = '';
    switch (kind) {
      case 'key': text = formatIssueKey(item); break;
      case 'summary': text = formatIssueSummary(item); break;
      case 'allworkPlain': text = formatAllWorkPlainText(item, {}); break;
      case 'allworkMd': text = formatAllWorkMarkdown(item, {}); break;
      case 'fieldsCsv': text = formatFieldsCsv(item); break;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setOpen(false);
    } catch {
      // Clipboard API failed — open fallback modal
      setFallbackText(text);
      setOpen(false);
    }
  }, [item]);

  const menuItems: { kind: CopyKind; label: string }[] = [
    { kind: 'key', label: 'Copy issue key' },
    { kind: 'summary', label: 'Copy summary' },
    { kind: 'allworkPlain', label: 'Copy All work (plain text)' },
    { kind: 'allworkMd', label: 'Copy All work (markdown)' },
    { kind: 'fieldsCsv', label: 'Copy Fields (CSV)' },
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-body font-medium transition-colors border',
          isDark
            ? 'border-[#2E2E2E] text-[#A1A1A1] hover:bg-[#1F1F1F]'
            : 'border-[#DFE1E6] text-[#505258] hover:bg-[#F4F5F7]',
        )}
      >
        {copied ? <Check className="w-3.5 h-3.5 text-[#22A06B]" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          role="menu"
          aria-label="Copy options"
          className={cn(
            'absolute right-0 top-full mt-1 min-w-[220px] rounded-lg border shadow-md z-50 py-1',
            isDark ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[#DFE1E6]',
          )}
        >
          {menuItems.map(({ kind, label }) => (
            <button
              key={kind}
              role="menuitem"
              onClick={() => handleCopy(kind)}
              disabled={!item}
              className={cn(
                'w-full text-left px-3 py-2 text-xs font-body transition-colors',
                isDark
                  ? 'text-[#EDEDED] hover:bg-[#1F1F1F] disabled:text-[#878787]'
                  : 'text-[#292A2E] hover:bg-[#F4F5F7] disabled:text-[#6B6E76]',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Fallback modal */}
      {fallbackText !== null && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40">
          <div className={cn(
            'w-[min(640px,calc(100vw-32px))] rounded-xl border shadow-xl',
            isDark ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[#DFE1E6]',
          )}>
            <div className={cn(
              'flex items-center justify-between px-4 py-3 border-b',
              isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]',
            )}>
              <span className={cn('font-body text-sm font-medium', isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]')}>
                Copy manually
              </span>
              <button onClick={() => setFallbackText(null)} className={cn('p-1 rounded', isDark ? 'hover:bg-[#292929]' : 'hover:bg-[#F4F5F7]')}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <p className={cn('font-body text-xs mb-2', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
                Clipboard write failed. Select and copy manually:
              </p>
              <textarea
                ref={textareaRef}
                readOnly
                value={fallbackText}
                className={cn(
                  'w-full min-h-[200px] rounded-md border p-3 font-mono text-xs resize-y',
                  isDark ? 'bg-[#111111] border-[#2E2E2E] text-[#EDEDED]' : 'bg-[#F7F8F9] border-[#DFE1E6] text-[#292A2E]',
                )}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
