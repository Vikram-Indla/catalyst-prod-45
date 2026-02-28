import React from 'react';
import { Sparkles } from 'lucide-react';

interface KBIntelligenceButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export function KBIntelligenceButton({ isOpen, onClick }: KBIntelligenceButtonProps) {
  return (
    <>
      <button
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 32,
          padding: '0 14px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.5px',
          textTransform: 'uppercase' as const,
          border: 'none',
          cursor: 'pointer',
          transition: 'all 200ms ease',
          background: isOpen ? '#2563EB' : 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
          color: '#FFFFFF',
          boxShadow: isOpen ? 'none' : undefined,
          animation: isOpen ? 'none' : 'intelligence-pulse 3s infinite',
          transform: 'scale(1)',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.03)';
          e.currentTarget.style.boxShadow = '0 0 0 6px rgba(37,99,235,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '';
        }}
      >
        <Sparkles size={13} />
        KB
      </button>
      <style>{`
        @keyframes intelligence-pulse {
          0% { box-shadow: 0 0 0 0 rgba(37,99,235,0.4); }
          70% { box-shadow: 0 0 0 8px rgba(37,99,235,0); }
          100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
        }
      `}</style>
    </>
  );
}

export default KBIntelligenceButton;
