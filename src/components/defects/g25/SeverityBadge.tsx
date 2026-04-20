import { Lozenge, type LozengeAppearance } from '@/components/ads';

const config: Record<string, { label: string; appearance: LozengeAppearance }> = {
  critical: { label: 'Critical', appearance: 'removed' },
  high: { label: 'High', appearance: 'moved' },
  medium: { label: 'Medium', appearance: 'inprogress' },
  low: { label: 'Low', appearance: 'success' },
};

export function SeverityBadge({ severity }: { severity: string }) {
  const c = config[severity] || config.medium;
  return <Lozenge appearance={c.appearance}>{c.label}</Lozenge>;
}
