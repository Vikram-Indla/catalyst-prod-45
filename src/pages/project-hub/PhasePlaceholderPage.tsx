import { useParams } from 'react-router-dom';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { LucideIcon, List } from 'lucide-react';

interface PhasePageProps {
  title: string;
  phase: string;
  icon?: LucideIcon;
  description: string;
}

export default function PhasePlaceholderPage({ title, phase, icon: Icon = List, description }: PhasePageProps) {
  const { key } = useParams<{ key: string }>();

  return (
    <div className="ph-content-wrapper" style={{ fontFamily: 'var(--ds-font-family-body)' }}>
      <div className="ph-inner-content">
        <CatalystPageHeader title={title} />

        <div
          className="flex flex-col items-center justify-center ph-card"
          style={{ padding: '80px 40px' }}
        >
          <Icon size={48} color="#CBD5E1" strokeWidth={1.25} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg-1, #0F172A)', marginTop: 16, fontFamily: 'var(--ds-font-family-heading)' }}>
            {title}
          </h3>
          <p style={{ fontSize: 14, color: '#64748B', marginTop: 4, textAlign: 'center', maxWidth: 400 }}>
            {description}
          </p>
          <span
            className="inline-flex items-center gap-1 mt-4 rounded-full"
            style={{ fontSize: 11, fontWeight: 500, padding: '4px 12px', background: '#EFF6FF', color: '#2563EB' }}
          >
            Coming in {phase}
          </span>
        </div>
      </div>
    </div>
  );
}
