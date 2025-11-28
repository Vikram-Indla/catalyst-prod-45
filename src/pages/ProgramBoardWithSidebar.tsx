import { useParams } from 'react-router-dom';
import { ProgramRoomSidebar } from '@/components/program/ProgramRoomSidebar';
import ProgramBoardNew from './ProgramBoardNew';

export default function ProgramBoardWithSidebar() {
  const { programId } = useParams<{ programId: string }>();

  if (!programId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">No program selected</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <ProgramRoomSidebar programId={programId} />
      <div className="flex-1 overflow-hidden">
        <ProgramBoardNew />
      </div>
    </div>
  );
}
