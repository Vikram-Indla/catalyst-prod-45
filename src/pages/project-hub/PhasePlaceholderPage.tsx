import { useParams } from 'react-router-dom';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { LucideIcon, List } from '@/lib/atlaskit-icons';

interface PhasePageProps {
  title: string;
  phase: string;
  icon?: LucideIcon;
  description: string;
}

export default function PhasePlaceholderPage({ title, phase, icon: Icon = List, description }: PhasePageProps) {
  const { key } = useParams<{ key: string }>();

  return (
    <div className="ph-content-wrapper" style={{ fontFamily: 'var(--cp-font-body)' }}>
      <div className="ph-inner-content">
        <CatalystPageHeader title={title} />

        <div
          className="flex flex-col items-center justify-center ph-card"
          style={{ padding: '48px 40px' }}
        >
          <Icon size={48} color="var(--ds-text-disabled)" strokeWidth={1.25} />
          <h3 style={{ fontSize: 'var(--ds-font-size-600)', fontWeight: 600, color: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1)))', marginTop: 16, fontFamily: 'var(--cp-font-heading)' }}>
            {title}
          </h3>
          <p style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', marginTop: 4, textAlign: 'center', maxWidth: 400 }}>
            {description}
          </p>
          <span
            className="inline-flex items-center gap-1 mt-4 rounded-full"
            style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 500, padding: '4px 12px', background: 'var(--ds-background-selected)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' }}
          >
            Coming in {phase}
          </span>
        </div>
      </div>
    </div>
  );
}
