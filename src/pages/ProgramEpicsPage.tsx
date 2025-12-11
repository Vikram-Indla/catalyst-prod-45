/**
 * Program Epics Page
 * Uses the Jira-style EpicListView with EpicDetailsPanel drawer.
 */
import { useParams } from 'react-router-dom';
import { EpicListView } from '@/modules/program-epics';

export default function ProgramEpicsPage() {
  const { programId } = useParams();
  
  return (
    <div className="h-full">
      <EpicListView programId={programId} />
    </div>
  );
}
