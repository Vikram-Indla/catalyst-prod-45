/**
 * ThemeAlignmentView — Placeholder for D3 network visualization
 */
import { Network } from 'lucide-react';

export function ThemeAlignmentView() {
  return (
    <div
      className="rounded-xl border flex flex-col items-center justify-center"
      style={{
        background: '#FFFFFF', borderColor: '#E2E8F0',
        minHeight: 400, padding: 40, textAlign: 'center',
      }}
    >
      <div className="rounded-2xl flex items-center justify-center mb-4" style={{ width: 72, height: 72, background: '#F1F5F9' }}>
        <Network size={32} color="#94A3B8" strokeWidth={1.4} />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>Alignment Map</h3>
      <p style={{ fontSize: 13, color: '#64748B', maxWidth: 400, lineHeight: 1.5 }}>
        Interactive network visualization showing Theme → Goals → KRs → Initiatives → Epics hierarchy.
        Requires D3.js in production build.
      </p>
    </div>
  );
}
