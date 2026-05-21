/**
 * CreateFilterPage — /project-hub/:key/filters/create and /product-hub/filters/create
 * Chunk 5 will flesh this out. Stub renders a placeholder so routes compile.
 */
import React from 'react';
import { HubType } from './FiltersListPage';

interface CreateFilterPageProps {
  hubType?: HubType;
}

export default function CreateFilterPage({ hubType = 'project' }: CreateFilterPageProps) {
  return (
    <div style={{ padding: 32, color: 'var(--ds-text, #292A2E)' }}>
      Create filter ({hubType}) — coming in Chunk 5
    </div>
  );
}
