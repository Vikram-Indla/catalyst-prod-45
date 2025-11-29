import { BacklogStateProvider } from '@/modules/backlog/hooks/useBacklogState';
import { BacklogWorkspace } from '@/modules/backlog/components/BacklogWorkspace';

export default function BacklogEpics() {
  return (
    <BacklogStateProvider>
      <BacklogWorkspace />
    </BacklogStateProvider>
  );
}
