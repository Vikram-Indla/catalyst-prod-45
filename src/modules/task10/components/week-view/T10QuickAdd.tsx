// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ QUICK ADD COMPONENT
// Reference: Dashed circle icon, "Add a priority or paste TaskHub key...", "Enter to add"
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
  placeholder = 'Add a priority or paste TaskHub key...', 
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

  return (
    <form 
      className="t10-quick-add"
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
      {/* Dashed circle that becomes solid blue on focus */}
      <div 
        style={{
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
        }}
      >
        <Plus 
          size={18} 
          style={{ 
            color: isFocused ? '#2563eb' : '#9ca3af',
            transition: 'color 0.2s ease',
          }} 
        />
      </div>
      
      <input
        type="text"
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
      
      {/* Hint text */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          flexShrink: 0,
        }}
      >
        <span 
          style={{ 
            padding: '4px 8px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            fontSize: '12px', 
            color: '#6b7280',
            fontWeight: 500,
          }}
        >
          Enter
        </span>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>to add</span>
      </div>
    </form>
  );
}

export default T10QuickAdd;
