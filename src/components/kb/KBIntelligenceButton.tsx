import React from 'react';

interface KBIntelligenceButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export function KBIntelligenceButton({ isOpen, onClick }: KBIntelligenceButtonProps) {
  return (
    <>
      <button
        onClick={onClick}
        aria-label="Open Knowledge Assist"
        aria-expanded={isOpen}
        className="ka-trigger-btn"
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          height: 32,
          padding: '0 14px 0 12px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 650,
          letterSpacing: '0.02em',
          border: 'none',
          cursor: 'pointer',
          background: 'var(--cp-blue)',
          color: 'var(--bg-app)',
          fontFamily: "'Inter', system-ui, sans-serif",
          overflow: 'hidden',
          transition: 'transform 80ms, box-shadow 80ms',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '';
        }}
      >
        <span>KA</span>
        {/* Green pulse dot */}
        {!isOpen && (
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--sem-success)',
            animation: 'ka-btn-pulse 2s ease-in-out infinite',
          }} />
        )}
      </button>
      <style>{`
        .ka-trigger-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: conic-gradient(from 0deg, transparent, #2E2E2E, transparent, #454545, transparent);
          animation: ka-btn-conic 4s linear infinite;
          pointer-events: none;
        }
        @keyframes ka-btn-conic {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ka-btn-pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        .ka-trigger-btn:focus-visible {
          outline: 2px solid #2563EB;
          outline-offset: 2px;
        }
      `}</style>
    </>
  );
}

export default KBIntelligenceButton;
