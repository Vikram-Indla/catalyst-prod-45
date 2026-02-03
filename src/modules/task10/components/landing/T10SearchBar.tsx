// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ SEARCH BAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { Search } from 'lucide-react';

interface T10SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function T10SearchBar({ 
  value, 
  onChange, 
  placeholder = 'Search lists...' 
}: T10SearchBarProps) {
  return (
    <div className="t10-search-bar">
      <Search className="t10-search-bar__icon" />
      <input
        type="text"
        className="t10-search-bar__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default T10SearchBar;
