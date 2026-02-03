// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ QUICK ADD COMPONENT
// Dashed circle icon that turns solid blue on focus
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Plus } from 'lucide-react';

interface T10QuickAddProps {
  onAdd: (title: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function T10QuickAdd({ 
  onAdd, 
  placeholder = 'Add new priority item...', 
  disabled = false 
}: T10QuickAddProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      setValue('');
      (e.target as HTMLInputElement).blur();
    }
  };

  // Dynamic icon styles based on focus state
  const iconContainerStyle: React.CSSProperties = {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s ease',
    border: isFocused ? '2px solid #2563eb' : '2px dashed #d1d5db',
    backgroundColor: isFocused ? '#eff6ff' : 'transparent',
  };

  const iconStyle: React.CSSProperties = {
    width: '18px',
    height: '18px',
    color: isFocused ? '#2563eb' : '#9ca3af',
    transition: 'color 0.2s ease',
  };

  return (
    <form 
      className={`t10-quick-add ${isFocused ? 't10-quick-add--focused' : ''}`}
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 18px',
        background: '#ffffff',
        border: isFocused ? '1px solid #2563eb' : '1px solid #e5e7eb',
        borderRadius: '10px',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Dashed circle that becomes solid on focus */}
      <div style={iconContainerStyle}>
        <Plus style={iconStyle} />
      </div>
      
      <input
        type="text"
        className="t10-quick-add__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          fontSize: '14px',
          color: '#1f2937',
          background: 'transparent',
        }}
      />
      
      {/* Hint or Add button */}
      {value.trim() ? (
        <button 
          type="submit" 
          className="t10-btn t10-btn--sm t10-btn--primary"
          disabled={disabled}
          style={{
            padding: '6px 12px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 500,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Add
        </button>
      ) : (
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Press Enter</span>
      )}
    </form>
  );
}

export default T10QuickAdd;
