import { useParams } from 'react-router-dom';

interface ProgramPageLayoutProps {
  children: React.ReactNode;
}

export function ProgramPageLayout({ children }: ProgramPageLayoutProps) {
  const { programId } = useParams<{ programId: string }>();

  if (!programId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">No program selected</p>
      </div>
    );
  }

  // Sidebar is rendered by JiraAlignShell, so just render children
  return <>{children}</>;
}
