/**
 * ReqAssistIntakeDrawer — Right-side overlay drawer (Stage A shell)
 * Opens for document intake actions (upload, generate, import).
 */
import React from 'react';

interface ReqAssistIntakeDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function ReqAssistIntakeDrawer({ open, onClose }: ReqAssistIntakeDrawerProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Req Assist Intake"
      className="req-assist-intake-drawer"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '480px',
        background: 'hsl(var(--background))',
        borderLeft: '1px solid hsl(var(--border))',
        zIndex: 50,
        padding: '2rem',
      }}
    >
      <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
        Intake
      </h2>
    </div>
  );
}
