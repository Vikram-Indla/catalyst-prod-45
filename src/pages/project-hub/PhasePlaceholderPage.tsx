import { useParams } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface PhasePageProps {
  title: string;
  phase: string;
  icon: LucideIcon;
  description: string;
}

export default function PhasePlaceholderPage({ title, phase, icon: Icon, description }: PhasePageProps) {
  const { key } = useParams<{ key: string }>();

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center gap-3 mb-6">
        <Icon size={22} color="#2563EB" strokeWidth={1.75} />
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif", letterSpacing: '-0.3px' }}>
          {title}
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
        <Icon size={48} color="#94A3B8" strokeWidth={1.25} />
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginTop: 16 }}>
          {title}
        </h3>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, textAlign: 'center', maxWidth: 400 }}>
          {description}
        </p>
        <span
          className="inline-flex items-center gap-1 mt-4 rounded-full"
          style={{
            fontSize: 11,
            fontWeight: 500,
            padding: '4px 12px',
            background: '#EFF6FF',
            color: '#2563EB',
          }}
        >
          Coming in {phase}
        </span>
      </div>
    </div>
  );
}
