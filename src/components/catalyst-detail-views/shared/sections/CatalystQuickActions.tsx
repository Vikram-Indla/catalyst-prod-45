/**
 * CANONICAL — Quick actions menu (+ and AI buttons) for all CatalystView* components.
 * Change here → updates all work item types.
 *
 * Matches Jira's + button below the title with dropdown:
 *   - Create child work item
 *   - Link work item
 *   - Add attachment
 *   - Add web link
 *   - Add design
 *
 * Also includes the AI Sparkles button matching StoryDetailModal parity.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Plus, CheckSquare, Link2, Paperclip, Globe, Palette, Search, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface CatalystQuickActionsProps {
  onCreateChild?: () => void;
  onLinkItem?: () => void;
  onAddAttachment?: () => void;
  onAddWebLink?: () => void;
  onAddDesign?: () => void;
  onAiImprove?: () => void;
}

export function CatalystQuickActions({
  onCreateChild,
  onLinkItem,
  onAddAttachment,
  onAddWebLink,
  onAddDesign,
  onAiImprove,
}: CatalystQuickActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [search, setSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu && !showAiMenu) return;
    const h = (e: MouseEvent) => {
      if (showMenu && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setSearch('');
      }
      if (showAiMenu && aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) {
        setShowAiMenu(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showMenu, showAiMenu]);

  const textColor = 'rgb(41, 42, 46)';
  const hoverBg = 'rgba(11, 18, 14, 0.06)';
  const borderColor = 'rgba(11, 18, 14, 0.14)';

  const menuItems = [
    { id: 'child', icon: <CheckSquare size={16} color={textColor} />, label: 'Create child work item', section: 'primary', action: () => { setShowMenu(false); setSearch(''); onCreateChild ? onCreateChild() : toast('Create child — scroll to Child work items section'); } },
    { id: 'link', icon: <Link2 size={16} color={textColor} />, label: 'Link work item', section: 'primary', action: () => { setShowMenu(false); setSearch(''); onLinkItem ? onLinkItem() : toast.info('Link work item — coming soon'); } },
    { id: 'attachment', icon: <Paperclip size={16} color={textColor} />, label: 'Add attachment', section: 'secondary', action: () => { setShowMenu(false); setSearch(''); onAddAttachment ? onAddAttachment() : toast.info('Add attachment — coming soon'); } },
    { id: 'weblink', icon: <Globe size={16} color={textColor} />, label: 'Add web link', section: 'secondary', action: () => { setShowMenu(false); setSearch(''); onAddWebLink ? onAddWebLink() : toast.info('Add web link — coming soon'); } },
    { id: 'design', icon: <Palette size={16} color={textColor} />, label: 'Add design', section: 'secondary', action: () => { setShowMenu(false); setSearch(''); onAddDesign ? onAddDesign() : toast.info('Add design — coming soon'); } },
  ];

  const q = search.toLowerCase();
  const filtered = q ? menuItems.filter(i => i.label.toLowerCase().includes(q)) : menuItems;
  const primary = filtered.filter(i => i.section === 'primary');
  const secondary = filtered.filter(i => i.section === 'secondary');

  const btnStyle: React.CSSProperties = {
    width: 28, height: 28, border: '1px solid #DFE1E6', background: '#FAFBFC',
    borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#5E6C84', transition: 'background 0.15s, border-color 0.15s',
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', height: 40, padding: '8px 16px',
    fontSize: 14, fontWeight: 400, color: textColor, background: 'transparent',
    border: 'none', borderRadius: 0, cursor: 'pointer', width: '100%',
    boxSizing: 'border-box', fontFamily: 'inherit', textAlign: 'left',
  };

  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
      {/* + Add button */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={btnStyle}
          onMouseEnter={e => { e.currentTarget.style.background = '#EBECF0'; e.currentTarget.style.borderColor = '#C1C7D0'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FAFBFC'; e.currentTarget.style.borderColor = '#DFE1E6'; }}
          title="Add"
        >
          <Plus size={14} />
        </button>

        {showMenu && (
          <div style={{
            position: 'absolute', left: 0, top: 34, background: '#FFFFFF', borderRadius: 4,
            boxShadow: 'rgba(30,31,33,0.15) 0px 8px 12px, rgba(30,31,33,0.31) 0px 0px 1px',
            width: 266, zIndex: 400, padding: 0,
            animation: 'cv-slide-down 0.15s ease-out',
          }}>
            {/* Search */}
            <div style={{ margin: '4px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: `0.5px solid ${borderColor}`, borderRadius: 3, padding: '1px 0' }}>
                <Search size={14} color={textColor} style={{ marginLeft: 8, flexShrink: 0 }} />
                <input
                  type="text" placeholder="Find menu item" value={search}
                  onChange={e => setSearch(e.target.value)} autoFocus
                  style={{ background: 'transparent', border: 'none', outline: 'none', padding: '4px 4px 4px 8px', fontSize: 14, color: textColor, width: '100%', height: 28, fontFamily: 'inherit' }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textColor, display: 'flex', padding: 0, marginRight: 6 }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Primary */}
            {primary.length > 0 && primary.map(item => (
              <button key={item.id} onClick={item.action} style={itemStyle}
                onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: 8 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            ))}

            {/* Separator */}
            {primary.length > 0 && secondary.length > 0 && (
              <div style={{ height: 0.5, background: borderColor }} />
            )}

            {/* Secondary */}
            {secondary.length > 0 && secondary.map(item => (
              <button key={item.id} onClick={item.action} style={itemStyle}
                onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: 8 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            ))}

            {filtered.length === 0 && (
              <div style={{ padding: '12px 16px', fontSize: 13, color: '#6B778C', textAlign: 'center' }}>No items match</div>
            )}
          </div>
        )}
      </div>

      {/* AI Sparkles button — Jira parity with StoryDetailModal */}
      <div ref={aiMenuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setShowAiMenu(o => !o)}
          style={{
            width: 28, height: 28, border: '1px solid #DEEBFF', background: '#EFF6FF',
            borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#2563EB', transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#DEEBFF'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; }}
          title="Catalyst Intelligence"
        >
          <Sparkles size={14} />
        </button>
        {showAiMenu && (
          <div style={{
            position: 'absolute', left: 0, top: 34, background: '#FFF',
            border: '1px solid #DFE1E6', borderRadius: 8,
            boxShadow: '0 8px 28px rgba(9,30,66,0.22)', padding: '12px 0 8px',
            zIndex: 50, minWidth: 280, animation: 'cv-slide-down 0.15s ease-out',
          }}>
            <div style={{ padding: '0 16px 10px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Catalyst Intelligence
            </div>
            {[
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E6C84" strokeWidth="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, label: 'Improve description', action: () => { setShowAiMenu(false); onAiImprove ? onAiImprove() : toast.info('AI improve — coming soon'); } },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E6C84" strokeWidth="1.8"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>, label: 'Summarize comments', action: () => { setShowAiMenu(false); toast.info('Summarize comments — coming soon'); } },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E6C84" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, label: 'Find similar items', action: () => { setShowAiMenu(false); toast.info('Find similar items — coming soon'); } },
            ].map((item, i) => (
              <button key={i} onClick={item.action}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 16px', background: 'none', border: 'none', fontSize: 14, color: '#172B4D', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >{item.icon}<span>{item.label}</span></button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
