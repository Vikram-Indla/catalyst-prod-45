/**
 * FiltersListPage — /project-hub/:key/filters and /product-hub/filters
 * Chunk 2 will flesh this out. Stub renders a loading skeleton so routes compile.
 */
import React from 'react';

export type HubType = 'project' | 'product';

interface FiltersListPageProps {
  hubType?: HubType;
}

export default function FiltersListPage({ hubType = 'project' }: FiltersListPageProps) {
  return (
    <div style={{ padding: 32, color: 'var(--ds-text, #292A2E)' }}>
      Filters ({hubType}) — coming in Chunk 2
    </div>
  );
}
