/**
 * ReleaseOpsComingSoonPage — temporary placeholder for Release Operations
 * surfaces whose nav item exists (per handoff §6) but whose page is built in a
 * later phase (Calendar → Phase 11, SOP Templates → Phase 9, Settings →
 * Phase 14). Keeps the sidebar IA complete without dead 404 links.
 *
 * Replace each route's element with the real page as that phase lands.
 */
import { EmptyState } from '@/components/ads/EmptyState';

interface ReleaseOpsComingSoonPageProps {
  title: string;
  description?: string;
}

export default function ReleaseOpsComingSoonPage({
  title,
  description = 'This Release Operations surface is being rebuilt and will arrive in a later phase.',
}: ReleaseOpsComingSoonPageProps) {
  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--ds-surface, #FFFFFF)',
      }}
    >
      <EmptyState header={title} description={description} />
    </div>
  );
}
