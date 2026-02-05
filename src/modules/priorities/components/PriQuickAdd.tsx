// ============================================================
// File: src/modules/priorities/components/PriQuickAdd.tsx
// ============================================================

import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import styles from '../styles/priorities.module.css';

interface PriQuickAddProps {
  onAdd: (title: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PriQuickAdd({
  onAdd,
  placeholder = 'Add a priority...',
  disabled = false,
}: PriQuickAddProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
      setValue('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className={styles['pri-quick-add']}>
      <span className={styles['pri-quick-add-icon']}>
        <Plus size={16} />
      </span>
      <input
        ref={inputRef}
        className={styles['pri-quick-add-input']}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
        }}
        placeholder={placeholder}
        disabled={disabled}
      />
      <span className={styles['pri-quick-add-hint']}>
        Press Enter
      </span>
    </div>
  );
}
