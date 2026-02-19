import { useParams } from 'react-router-dom';
import { Settings } from 'lucide-react';

export default function ProjectSettingsPageNew() {
  const { key } = useParams<{ key: string }>();

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center gap-3 mb-6">
        <Settings size={22} color="#2563EB" strokeWidth={1.75} />
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif", letterSpacing: '-0.3px' }}>
          Project Settings
        </h1>
        <span
          className="rounded"
          style={{ fontSize: 11, fontWeight: 600, color: '#64748B', background: '#F1F5F9', padding: '2px 8px' }}
        >
          {key?.toUpperCase()}
        </span>
      </div>

      <div
        className="flex flex-col items-center justify-center rounded-xl"
        style={{
          padding: '80px 40px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
        }}
      >
        <Settings size={48} color="#94A3B8" strokeWidth={1.25} />
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginTop: 16 }}>
          Project Configuration
        </h3>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, textAlign: 'center', maxWidth: 400 }}>
          Workflow statuses, work types, labels, components, and member management will be configured here.
        </p>
      </div>
    </div>
  );
}
