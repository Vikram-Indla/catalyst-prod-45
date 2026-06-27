import React, { useState } from 'react';
import { COMMAND_CATALOG, CommandCategory, T } from './aiAdminAssistant.types';

const CATEGORY_ORDER: CommandCategory[] = ['users', 'roles', 'permissions', 'passwords', 'departments'];

interface AiCommandLibraryProps {
  onSelect: (text: string) => void;
  isDisabled?: boolean;
}

export function AiCommandLibrary({ onSelect, isDisabled }: AiCommandLibraryProps) {
  const [expanded, setExpanded] = useState<Set<CommandCategory>>(new Set(['users', 'roles']));

  const toggle = (cat: CommandCategory) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(cat)) { next.delete(cat); } else { next.add(cat); }
      return next;
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        borderRight: `1px solid ${T.border}`,
        background: T.surface,
      }}
    >
      <div
        style={{
          padding: '12px 16px 10px',
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: T.subtle }}>
          Commands
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {CATEGORY_ORDER.map(cat => {
          const section = COMMAND_CATALOG[cat];
          const isOpen = expanded.has(cat);
          return (
            <div key={cat}>
              <button
                onClick={() => toggle(cat)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  borderBottom: `1px solid ${T.borderSubtle}`,
                  padding: '6px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: T.subtle,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.04em',
                }}
              >
                <span>{section.label}</span>
                <span style={{ fontSize: 10, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block', color: T.subtlest }}>
                  ▶
                </span>
              </button>

              {isOpen && section.commands.map(cmd => (
                <button
                  key={cmd.id}
                  onClick={() => !isDisabled && onSelect(cmd.fillText)}
                  disabled={isDisabled}
                  title={cmd.fillText}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    borderBottom: `1px solid ${T.borderSubtle}`,
                    padding: '7px 16px 7px 24px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (!isDisabled) (e.currentTarget as HTMLElement).style.background = T.hover; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                >
                  <span style={{ fontSize: 13, color: T.text, lineHeight: '18px', display: 'block' }}>
                    {cmd.label}
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '8px 16px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: T.subtlest }}>
          Click to fill the composer
        </span>
      </div>
    </div>
  );
}
