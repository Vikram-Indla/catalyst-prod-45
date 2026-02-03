// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ QUICK ADD COMPONENT
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

  return (
    <form 
      className={`t10-quick-add ${isFocused ? 't10-quick-add--focused' : ''}`}
      onSubmit={handleSubmit}
    >
      <Plus className="t10-quick-add__icon" />
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
      />
      {value.trim() && (
        <button 
          type="submit" 
          className="t10-btn t10-btn--sm t10-btn--primary"
          disabled={disabled}
        >
          Add
        </button>
      )}
    </form>
  );
}

export default T10QuickAdd;
