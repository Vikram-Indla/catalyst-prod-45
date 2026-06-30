import React from 'react';

interface UploadProgressBannerProps {
  label?: string;
}

export function UploadProgressBanner({ label = 'Processing uploaded file…' }: UploadProgressBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        top: 6,
        left: '50%',
        transform: 'translateX(-50%)',
        minWidth: 280,
        maxWidth: 'min(480px, 80%)',
        padding: '8px 14px',
        borderRadius: 4,
        background:
          'repeating-linear-gradient(135deg, var(--cv2-accent) 0 14px, var(--cv2-accent-strong) 14px 28px)',
        color: 'var(--ds-text-inverse)',
        fontFamily: 'var(--cv2-font)',
        font: 'var(--ds-font-body)',
        fontWeight: 700,
        textAlign: 'center',
        boxShadow: 'var(--ds-shadow-overlay)',
        animation: 'cv2-upload-bar-slide 1.2s linear infinite',
        zIndex: 30,
      }}
    >
      {label}
    </div>
  );
}
