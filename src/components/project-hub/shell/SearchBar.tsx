import { Search } from 'lucide-react';

export function SearchBar() {
  return (
    <div
      className="flex items-center gap-2 rounded-md"
      style={{
        height: 32,
        padding: '0 10px',
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 6,
        minWidth: 200,
      }}
    >
      <Search size={14} color="#94A3B8" strokeWidth={2} />
      <span
        className="flex-1"
        style={{
          fontSize: 12,
          color: '#94A3B8',
          fontFamily: "'Inter', sans-serif",
          userSelect: 'none',
        }}
      >
        Search anything...
      </span>
      <kbd
        style={{
          fontSize: 10,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          color: '#94A3B8',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 4,
          padding: '1px 5px',
          lineHeight: '16px',
        }}
      >
        ⌘K
      </kbd>
    </div>
  );
}
