/**
 * VisionBanner — Displays the active Vision 2030 statement
 */

export function VisionBanner() {
  return (
    <div
      role="status"
      aria-label="Vision statement"
      className="flex items-center gap-2 rounded-lg"
      style={{
        background: 'var(--catalyst-primary-bg)',
        border: '1px solid var(--catalyst-primary)',
        padding: '8px 16px',
        marginBottom: '16px',
        fontSize: '12px',
        color: 'var(--catalyst-text-secondary)',
      }}
    >
      <span aria-hidden="true">🎯</span>
      <span>
        Vision 2030 — <strong style={{ fontWeight: 600 }}>Top-10 Global Manufacturing Hub by 2030</strong>
      </span>
    </div>
  );
}
