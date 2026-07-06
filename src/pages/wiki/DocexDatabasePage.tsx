/**
 * DocexDatabasePage — /docex/:workspaceSlug/db/:dbSlug
 * (CAT-DOCEX-DB-COEDIT-20260705-001 D2). Full-page database surface.
 */
import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ads';
import { Skeleton } from '@/components/ui/skeleton';
import { Routes } from '@/lib/routes';
import { useWikiWorkspaceBySlug } from '@/hooks/useWiki';
import { useDocexDatabaseBySlug } from '@/hooks/useDocexDatabase';
import { DatabaseSurface } from '@/components/wiki-hub/database/DatabaseSurface';

export default function DocexDatabasePage() {
  const { workspaceSlug, dbSlug } = useParams<{ workspaceSlug: string; dbSlug: string }>();
  const { data: workspace, isLoading: wsLoading } = useWikiWorkspaceBySlug(workspaceSlug);
  const { data: database, isLoading: dbLoading } = useDocexDatabaseBySlug(workspace?.id, dbSlug);

  if (wsLoading || dbLoading) {
    return (
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 40px' }}>
        <Skeleton style={{ height: 32, width: 280, borderRadius: 6, marginBottom: 20 }} />
        <Skeleton style={{ height: 360, borderRadius: 8 }} />
      </div>
    );
  }

  if (!workspace || !database) {
    return (
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 40px' }}>
        <p style={{ color: 'var(--ds-text)', font: 'var(--ds-font-body-large)', margin: 0 }}>
          Database not found.
        </p>
        <Link to={Routes.docex.root()} style={{ color: 'var(--ds-text-brand)', font: 'var(--ds-font-body)' }}>
          Back to Folio
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 40px 96px' }}>
      <Breadcrumbs
        items={[
          { key: 'folio', text: 'Folio', href: Routes.folio.root() },
          { key: 'ws', text: workspace.name, href: Routes.docex.workspace(workspace.slug) },
          { key: 'db', text: database.name },
        ]}
        LinkComponent={Link as never}
        aria-label="Database location"
      />
      {/* ads-scanner:ignore-next-line — ADS heading token shorthand (font:) */}
      <h1 style={{ font: 'var(--ds-font-heading-large)', color: 'var(--ds-text)', margin: '12px 0 16px' }}>
        {database.icon ? `${database.icon} ` : ''}
        {database.name}
      </h1>
      <DatabaseSurface database={database} />
    </div>
  );
}
