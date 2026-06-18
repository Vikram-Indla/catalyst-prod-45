import React from 'react';

interface DropzoneOverlayProps {
  workspaceTitle: string;
  recipientName?: string;
}

export function DropzoneOverlay({ workspaceTitle, recipientName }: DropzoneOverlayProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        zIndex: 50,
        pointerEvents: 'none',
        color: 'var(--cv2-text-strong)',
        fontFamily: 'var(--cv2-font)',
      }}
    >
      <DropzoneArt />
      <div style={{ textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, color: '#FFFFFF' }}>
          Upload to {workspaceTitle}
        </div>
        {recipientName && (
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
            Hold{' '}
            <kbd
              style={{
                display: 'inline-block',
                padding: '1px 6px',
                margin: '0 2px',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 3,
                fontFamily: 'var(--cv2-font)',
                fontSize: 12,
                fontWeight: 600,
                color: '#FFFFFF',
              }}
            >
              Shift
            </kbd>{' '}
            to share immediately with {recipientName}
          </div>
        )}
      </div>
    </div>
  );
}

function DropzoneArt() {
  return (
    <div style={{ position: 'relative', width: 220, height: 140 }}>
      {/* Purple video card behind-left */}
      <div
        style={{
          position: 'absolute',
          left: 6,
          top: 24,
          width: 96,
          height: 76,
          background: '#7E57C2',
          borderRadius: 10,
          transform: 'rotate(-10deg)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
        }}
      >
        <svg width={28} height={28} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      {/* Blue card behind-right */}
      <div
        style={{
          position: 'absolute',
          right: 6,
          top: 18,
          width: 92,
          height: 72,
          background: '#4FC3F7',
          borderRadius: 10,
          transform: 'rotate(8deg)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
        }}
      />
      {/* Front green image card */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 36,
          transform: 'translateX(-50%) rotate(-2deg)',
          width: 110,
          height: 84,
          background: '#FFFFFF',
          borderRadius: 10,
          boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '70%',
            background: 'linear-gradient(180deg, #AED581 0%, #66BB6A 100%)',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 6,
              right: 8,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#FFD54F',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.05)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
