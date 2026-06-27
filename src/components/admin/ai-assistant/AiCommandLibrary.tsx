import React, { useState } from 'react';
import { Lozenge } from '@/components/ads';
import { COMMAND_CATALOG, CommandCategory, T, RISK_LOZENGE, RiskLevel } from './aiAdminAssistant.types';

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
        background: T.sunken,
      }}
    >
      <div
        style={{
          padding: '10px 14px 8px',
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: T.subtlest, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Command Library
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {CATEGORY_ORDER.map(cat => {
          const section = COMMAND_CATALOG[cat];
          const isOpen = expanded.has(cat);
          return (
            <div key={cat}>
              {/* Category header */}
              <button
                onClick={() => toggle(cat)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  borderBottom: `1px solid ${T.borderSubtle}`,
                  padding: '7px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                  color: T.subtle,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span>{section.label}</span>
                <span style={{ fontSize: 10, color: T.subtlest, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>
                  ▶
                </span>
              </button>

              {/* Command list */}
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
                    padding: '6px 14px 6px 20px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    opacity: isDisabled ? 0.5 : 1,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isDisabled) (e.currentTarget as HTMLElement).style.background = T.hover; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                >
                  <span style={{ flex: 1, fontSize: 12, color: T.text, lineHeight: '16px' }}>
                    {cmd.label}
                  </span>
                  <span style={{ flexShrink: 0, display: 'inline-block' }}>
                    <Lozenge
                      appearance={RISK_LOZENGE[cmd.risk as RiskLevel].appearance}
                      isBold={RISK_LOZENGE[cmd.risk as RiskLevel].isBold}
                    >
                      {cmd.risk}
                    </Lozenge>
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '8px 14px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: T.subtlest }}>
          Click any command to fill the composer
        </span>
      </div>
    </div>
  );
}
