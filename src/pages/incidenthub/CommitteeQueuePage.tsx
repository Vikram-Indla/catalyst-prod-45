/**
 * CommitteeQueuePage — governance queue for incidents awaiting committee decision.
 * Data: useCommitteeQueue() (real incidents/committee/votes join + veto/majority logic).
 */

import { useState } from 'react';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { CommitteeQueueTable } from '@/components/committee/CommitteeQueueTable';
import { CommitteeQueueDrawer } from '@/components/committee/CommitteeQueueDrawer';
import { useCommitteeQueue, type CommitteeQueueItem } from '@/hooks/useCommitteeQueue';

export default function CommitteeQueuePage() {
  const { data: items, isLoading } = useCommitteeQueue();
  const [selected, setSelected] = useState<CommitteeQueueItem | null>(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ProjectPageHeader projectKey="INCIDENTS" hubType="incident" />
      <div className="flex-1 min-h-0 px-6 pt-2 pb-4">
        <CommitteeQueueTable
          items={items || []}
          isLoading={isLoading}
          onRowClick={setSelected}
        />
      </div>
      <CommitteeQueueDrawer
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        item={selected}
      />
    </div>
  );
}
