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
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          height: 32,
          padding: '0 14px 0 12px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.02em',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 200ms ease',
          background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
          color: '#FFFFFF',
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
        <Sparkles size={14} strokeWidth={2} />
        <span>Knowledge Assist</span>
        {/* Green pulse dot */}
        {!isOpen && (
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#16A34A',
            animation: 'ka-btn-pulse 2s infinite',
          }} />
        )}
      </button>
      <style>{`
        @keyframes ka-btn-pulse {
          0% { box-shadow: 0 0 0 0 rgba(22,163,74,0.5); }
          70% { box-shadow: 0 0 0 6px rgba(22,163,74,0); }
          100% { box-shadow: 0 0 0 0 rgba(22,163,74,0); }
        }
      `}</style>
    </>
  );
}

export default KBIntelligenceButton;
