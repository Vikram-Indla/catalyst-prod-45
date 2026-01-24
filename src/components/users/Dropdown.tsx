import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  allLabel?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  allLabel
}) => {
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

  const displayValue = value || (allLabel ? allLabel : placeholder);

  return (
    <div className={`ct-dropdown ${isOpen ? 'open' : ''}`} ref={ref}>
      <button
        className="ct-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{displayValue}</span>
        <ChevronDown className="chevron" />
      </button>
      
      <div className="ct-dropdown-panel" role="listbox">
        {allLabel && (
          <div
            className={`ct-dropdown-item ${!value ? 'selected' : ''}`}
            onClick={() => { onChange(''); setIsOpen(false); }}
            role="option"
            aria-selected={!value}
          >
            <span className="checkmark">{!value ? '✓' : ''}</span>
            {allLabel}
          </div>
        )}
        {options.map(option => (
          <div
            key={option}
            className={`ct-dropdown-item ${option === value ? 'selected' : ''}`}
            onClick={() => { onChange(option); setIsOpen(false); }}
            role="option"
            aria-selected={option === value}
          >
            <span className="checkmark">{option === value ? '✓' : ''}</span>
            {option}
          </div>
        ))}
      </div>
    </div>
  );
};
