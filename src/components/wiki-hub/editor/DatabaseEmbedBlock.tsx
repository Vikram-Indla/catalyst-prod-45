/**
 * DatabaseEmbedBlock — a Folio database rendered inline inside a page
 * (CAT-FOLIO-NOTION-20260706 D7). Notion's "database inside a doc": the
 * block stores a databaseId prop and renders the full DatabaseSurface
 * (Table/Board/List/Gallery/Calendar + field editor). Non-editable region
 * so the interactive controls work without the editor intercepting.
 */
import { createReactBlockSpec } from '@blocknote/react';
import { DatabaseSurface } from '@/components/wiki-hub/database/DatabaseSurface';
import { useDocexDatabaseById } from '@/hooks/useDocexDatabase';

function DatabaseEmbed({ databaseId }: { databaseId: string }) {
  const { data: database, isLoading } = useDocexDatabaseById(databaseId || undefined);

  if (!databaseId || (!isLoading && !database)) {
    return (
      <div
        contentEditable={false}
        style={{
          border: '1px dashed var(--ds-border)',
          borderRadius: 8,
          padding: 16,
          color: 'var(--ds-text-subtlest)',
          font: 'var(--ds-font-body-small)',
        }}
      >
        Database not found.
      </div>
    );
  }

  return (
    <div
      contentEditable={false}
      style={{
        border: '1px solid var(--ds-border)',
        borderRadius: 8,
        padding: 12,
        background: 'var(--ds-surface)',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span aria-hidden>{database?.icon || '🗄️'}</span>
        <span style={{ font: 'var(--ds-font-heading-xsmall)', color: 'var(--ds-text)' }}>
          {database?.name ?? 'Database'}
        </span>
      </div>
      {isLoading || !database ? (
        <p style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body-small)', margin: 0 }}>Loading…</p>
      ) : (
        <DatabaseSurface database={database} />
      )}
    </div>
  );
}

export const databaseEmbed = createReactBlockSpec(
  {
    type: 'databaseEmbed',
    propSchema: {
      databaseId: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => <DatabaseEmbed databaseId={String(props.block.props.databaseId ?? '')} />,
  },
);
