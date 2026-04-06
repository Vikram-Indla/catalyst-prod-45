/**
 * WorkHubInlineCreate — Inline row creation (Stage D: wired to real mutation)
 * 36px, shows "+ Add [type]" placeholder, expands to input on click
 */
import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';

interface WorkHubInlineCreateProps {
  defaultType: string;
  groupCategory?: string;
  onSubmit: (summary: string, type: string) => void;
}

export default function WorkHubInlineCreate({ defaultType, groupCategory, onSubmit }: WorkHubInlineCreateProps) {
  const [active, setActive] = useState(false);
  const [summary, setSummary] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (active && inputRef.current) inputRef.current.focus();
  }, [active]);

  const handleSubmit = () => {
    if (!summary.trim()) return;
    onSubmit(summary.trim(), defaultType);
    setSummary('');
    // Stay in create mode for rapid entry — input stays focused
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCancel = () => {
    setActive(false);
    setSummary('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
    if (e.key === 'Escape') handleCancel();
  };

  if (!active) {
    return (
      <div
        onClick={() => setActive(true)}
        style={{
          display: 'flex', alignItems: 'center', height: 50, maxHeight: 50,
          padding: '0 12px 0 56px', gap: 6, cursor: 'pointer',
          borderBottom: '0.75px solid var(--bd-subtle, #292929)',
        }}
      >
        <Plus size={14} color="#94A3B8" />
        <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>Add {defaultType.toLowerCase()}</span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', height: 50, maxHeight: 50,
      padding: '0 12px 0 56px', gap: 8,
      borderBottom: '0.75px solid var(--bd-subtle, #292929)',
      background: 'rgba(37,99,235,0.04)',
    }}>
      <input
        ref={inputRef}
        value={summary}
        onChange={e => setSummary(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What needs to be done?"
        style={{
          flex: 1, border: 'none', background: 'transparent', outline: 'none',
          fontSize: 13, color: 'var(--fg-1)', fontFamily: 'Inter, sans-serif',
        }}
      />
      <button onClick={handleCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: 12, color: 'var(--fg-3)' }}>Cancel</button>
      <button onClick={handleSubmit} disabled={!summary.trim()} style={{
        padding: '4px 12px', fontSize: 12, fontWeight: 600, color: 'var(--bg-app)',
        background: summary.trim() ? 'var(--cp-blue)' : 'var(--fg-4)', border: 'none', borderRadius: 4, cursor: summary.trim() ? 'pointer' : 'default',
      }}>Create</button>
    </div>
  );
}
