// Filter components - matching HTML specification exactly

import React, { useState, useRef, useEffect } from 'react';
import { KANBAN_COLORS, TeamMember, GroupByOption, ScoringFilter, GROUP_BY_OPTIONS } from '../types';
import { KanbanIcons } from './KanbanIcons';

// Quick Filter Avatars
interface QuickFilterAvatarsProps {
  members: TeamMember[];
  selected: string[];
  onToggle: (id: string) => void;
}

export function QuickFilterAvatars({ members, selected, onToggle }: QuickFilterAvatarsProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {members.map(member => (
        <div
          key={member.id}
          onClick={() => onToggle(member.id)}
          style={{
            padding: '3px',
            borderRadius: '50%',
            border: selected.includes(member.id) ? `2px solid ${KANBAN_COLORS.gold}` : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              backgroundColor: member.color,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              border: '2px solid white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
            title={member.name}
          >
            {member.initials}
          </div>
        </div>
      ))}
    </div>
  );
}

// Filter Dropdown
interface FilterDropdownProps {
  label: string;
  options: { id: string; label?: string; name?: string; color?: string; icon?: string }[];
  selected?: string[];
  onToggle?: (id: string) => void;
  colorKey?: string;
  icon?: string;
  singleSelect?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  tooltip?: string;
}

export function FilterDropdown({ 
  label, 
  options, 
  selected = [], 
  onToggle, 
  colorKey, 
  icon, 
  singleSelect = false, 
  value, 
  onChange,
  tooltip
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = singleSelect ? (value && value !== 'all' && value !== 'none') : selected?.length > 0;
  const showIconOnly = !label;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={tooltip}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: showIconOnly ? '4px' : '8px',
          padding: showIconOnly ? '6px 8px' : '8px 14px',
          border: `1px solid ${isActive ? KANBAN_COLORS.gold : KANBAN_COLORS.borderDefault}`,
          borderRadius: '6px',
          backgroundColor: isActive ? KANBAN_COLORS.bgSelected : KANBAN_COLORS.bgCard,
          color: isActive ? KANBAN_COLORS.gold : KANBAN_COLORS.textSecondary,
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {icon && <span style={{ fontSize: '14px' }}>{icon}</span>}
        {label}
        {!singleSelect && selected?.length > 0 && (
          <span style={{
            padding: '2px 6px',
            borderRadius: '10px',
            backgroundColor: KANBAN_COLORS.gold,
            color: 'white',
            fontSize: '10px',
            fontWeight: 700,
          }}>
            {selected.length}
          </span>
        )}
        <KanbanIcons.ChevronDown />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '6px',
          minWidth: '220px',
          backgroundColor: KANBAN_COLORS.bgCard,
          border: `1px solid ${KANBAN_COLORS.borderLight}`,
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 100,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '8px', maxHeight: '320px', overflowY: 'auto' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  if (singleSelect) {
                    onChange?.(opt.id);
                    setIsOpen(false);
                  } else {
                    onToggle?.(opt.id);
                  }
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: (singleSelect ? value === opt.id : selected?.includes(opt.id)) 
                    ? KANBAN_COLORS.bgSelected 
                    : 'transparent',
                  color: KANBAN_COLORS.textPrimary,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.1s',
                }}
              >
                {!singleSelect && (
                  <input
                    type="checkbox"
                    checked={selected?.includes(opt.id)}
                    onChange={() => onToggle?.(opt.id)}
                    style={{ accentColor: KANBAN_COLORS.gold, width: '16px', height: '16px' }}
                  />
                )}
                {colorKey && (opt as any)[colorKey] && (
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: (opt as any)[colorKey],
                  }} />
                )}
                {opt.icon && <span style={{ fontSize: '14px' }}>{opt.icon}</span>}
                <span style={{ fontWeight: (singleSelect ? value === opt.id : selected?.includes(opt.id)) ? 600 : 400 }}>
                  {opt.label || opt.name}
                </span>
              </button>
            ))}
          </div>
          {!singleSelect && selected?.length > 0 && (
            <div style={{ padding: '8px', borderTop: `1px solid ${KANBAN_COLORS.borderLight}` }}>
              <button
                onClick={() => {
                  selected.forEach(id => onToggle?.(id));
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: KANBAN_COLORS.textMuted,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Group By Dropdown
interface GroupByDropdownProps {
  value: GroupByOption;
  onChange: (value: GroupByOption) => void;
  iconOnly?: boolean;
}

export function GroupByDropdown({ value, onChange, iconOnly }: GroupByDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = GROUP_BY_OPTIONS.find(o => o.id === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Group By"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: iconOnly ? '4px' : '8px',
          padding: iconOnly ? '6px 8px' : '8px 14px',
          border: `1px solid ${value !== 'none' ? KANBAN_COLORS.gold : KANBAN_COLORS.borderDefault}`,
          borderRadius: '6px',
          backgroundColor: value !== 'none' ? KANBAN_COLORS.bgSelected : KANBAN_COLORS.bgCard,
          color: value !== 'none' ? KANBAN_COLORS.gold : KANBAN_COLORS.textSecondary,
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        <KanbanIcons.GroupBy />
        {!iconOnly && <span>Group: {selected?.label}</span>}
        <KanbanIcons.ChevronDown />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '6px',
          minWidth: '200px',
          backgroundColor: KANBAN_COLORS.bgCard,
          border: `1px solid ${KANBAN_COLORS.borderLight}`,
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 100,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '8px' }}>
            {GROUP_BY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setIsOpen(false); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: value === opt.id ? KANBAN_COLORS.bgSelected : 'transparent',
                  color: value === opt.id ? KANBAN_COLORS.gold : KANBAN_COLORS.textPrimary,
                  fontSize: '13px',
                  fontWeight: value === opt.id ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.1s',
                }}
              >
                <span style={{ fontSize: '16px' }}>{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
