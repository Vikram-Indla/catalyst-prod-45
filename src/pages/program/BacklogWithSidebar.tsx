import { ProgramPageLayout } from '@/components/program/ProgramPageLayout';
import ProgramBacklog from './ProgramBacklog';

export default function BacklogWithSidebar() {
  return (
    <ProgramPageLayout>
      <ProgramBacklog />
    </ProgramPageLayout>
  );
}
