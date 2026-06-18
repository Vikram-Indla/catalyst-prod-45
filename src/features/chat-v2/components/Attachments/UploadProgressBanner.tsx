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
          'repeating-linear-gradient(135deg, var(--cv2-accent, #1264A3) 0 14px, var(--cv2-accent-strong, #0B4F84) 14px 28px)',
        color: '#FFFFFF',
        fontFamily: 'var(--cv2-font)',
        fontSize: 14,
        fontWeight: 700,
        textAlign: 'center',
        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        animation: 'cv2-upload-bar-slide 1.2s linear infinite',
        zIndex: 30,
      }}
    >
      {label}
    </div>
  );
}
