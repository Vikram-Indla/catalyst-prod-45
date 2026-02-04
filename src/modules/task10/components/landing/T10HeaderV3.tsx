// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10HeaderV3
// Purpose: Minimal header with Task¹⁰ logo and New List button
// Matches reference screenshot
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Plus } from 'lucide-react';

interface T10HeaderV3Props {
  onNewList: () => void;
}

export function T10HeaderV3({ onNewList }: T10HeaderV3Props) {
  return (
    <header 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Icon Badge */}
        <div
          style={{
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#3b82f6',
            borderRadius: '10px',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: 800,
          }}
        >
          10
        </div>
        
        {/* Text */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span 
            style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              color: '#0f172a',
              lineHeight: 1.2,
            }}
          >
            Task<sup style={{ fontSize: '11px', color: '#3b82f6', position: 'relative', top: '-4px' }}>10</sup>
          </span>
          <span 
            style={{ 
              fontSize: '12px', 
              color: '#94a3b8',
              marginTop: '2px',
            }}
          >
            Priority Management
          </span>
        </div>
      </div>

      {/* New List Button */}
      <button
        type="button"
        onClick={onNewList}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 16px',
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 500,
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
      >
        <Plus size={16} />
        New List
      </button>
    </header>
  );
}

export default T10HeaderV3;
