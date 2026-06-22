import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Button from '@atlaskit/button';
import TextField from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import Flag from '@atlaskit/flag';
import { useReleases } from '@/hooks/releases/useReleases';
import { Release, ReleaseStatus, ReleaseProgress } from '@/types/phase3-releases';
import JiraTable from '@/components/shared/JiraTable';
import {
  makeReleaseNameCell,
  makeStatusCell,
  makeProgressCell,
  makeStartDateCell,
  makeReleaseDateCell,
  makeDescriptionCell,
  makeActionsCell,
} from '@/components/releases/cells';

const STATUS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Unreleased', value: 'unreleased' },
  { label: 'Released', value: 'released' },
  { label: 'Archived', value: 'archived' },
];

export function ReleasesPage() {
  const { key } = useParams<{ key: string }>();
  const { data, isLoading, error } = useReleases(key!);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedSections, setExpandedSections] = useState({
    unreleased: true,
    released: false,
    archived: false,
  });
  const [successFlag, setSuccessFlag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data?.data) return { unreleased: [], released: [], archived: [] };

    const searchLower = search.toLowerCase();
    const filtered = data.data.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(searchLower);
      const matchesStatus =
        statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return {
      unreleased: filtered.filter((r) => r.status === 'unreleased'),
      released: filtered.filter((r) => r.status === 'released'),
      archived: filtered.filter((r) => r.status === 'archived'),
    };
  }, [data?.data, search, statusFilter]);

  const calculateProgress = (release: Release): ReleaseProgress => {
    // TODO: Fetch issue counts from API based on release
    // Placeholder for now
    return {
      done: 5,
      inProgress: 3,
      toDo: 7,
      total: 15,
      donePercent: 33,
      inProgressPercent: 20,
    };
  };

  const handleAction = (action: string, releaseId: string) => {
    if (action === 'menu') {
      // TODO: Open actions dropdown menu
      console.log('Open menu for release:', releaseId);
    }
  };

  const handleOpenDetail = (releaseId: string) => {
    // TODO: Navigate to /projects/:key/releases/:id
    console.log('Open detail for:', releaseId);
  };

  const columns = [
    makeReleaseNameCell(
      (r) => r.name,
      handleOpenDetail,
      (id) => `/projects/${key}/releases/${id}`
    ),
    makeStatusCell(),
    makeProgressCell(calculateProgress),
    makeStartDateCell(),
    makeReleaseDateCell(),
    makeDescriptionCell(),
    makeActionsCell(handleAction),
  ];

  if (isLoading) return <div>Loading releases...</div>;
  if (error) return <div>Error loading releases</div>;

  return (
    <div style={{ padding: '24px' }}>
      {/* Success flag */}
      {successFlag && (
        <Flag
          appearance="success"
          icon={null}
          onDismissed={() => setSuccessFlag(null)}
          title=""
          description={successFlag}
          id="release-success"
        />
      )}

      {/* Breadcrumb & Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 600,
            margin: '0 0 8px 0',
            color: 'var(--ds-text, #292A2E)',
          }}
        >
          Releases
        </h1>
      </div>

      {/* Toolbar: Search + Filter + Create */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <TextField
          placeholder="Search releases"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ maxWidth: '300px' }}
        />
        <Select
          options={STATUS_OPTIONS}
          value={STATUS_OPTIONS.find((o) => o.value === statusFilter)}
          onChange={(option) => setStatusFilter(option.value)}
          isSearchable={false}
        />
        <Button appearance="primary">Create release</Button>
      </div>

      {/* Unreleased Section */}
      {(filtered.unreleased.length > 0 || statusFilter === 'all') && (
        <div style={{ marginBottom: '32px' }}>
          <h2
            onClick={() =>
              setExpandedSections((p) => ({ ...p, unreleased: !p.unreleased }))
            }
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--ds-text-subtlest, #6B778C)',
              cursor: 'pointer',
              margin: '0 0 12px 0',
            }}
          >
            {expandedSections.unreleased ? '▼' : '▶'} UNRELEASED (
            {filtered.unreleased.length})
          </h2>
          {expandedSections.unreleased && filtered.unreleased.length > 0 && (
            <JiraTable
              rows={filtered.unreleased}
              columns={columns}
              getRowKey={(r) => r.id}
            />
          )}
          {expandedSections.unreleased && filtered.unreleased.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ds-text-subtlest, #6B778C)' }}>
              No unreleased versions
            </div>
          )}
        </div>
      )}

      {/* Released Section */}
      {(filtered.released.length > 0 || statusFilter === 'all') && (
        <div style={{ marginBottom: '32px' }}>
          <h2
            onClick={() =>
              setExpandedSections((p) => ({ ...p, released: !p.released }))
            }
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--ds-text-subtlest, #6B778C)',
              cursor: 'pointer',
              margin: '0 0 12px 0',
            }}
          >
            {expandedSections.released ? '▼' : '▶'} RELEASED ({filtered.released.length})
          </h2>
          {expandedSections.released && filtered.released.length > 0 && (
            <JiraTable
              rows={filtered.released}
              columns={columns}
              getRowKey={(r) => r.id}
            />
          )}
          {expandedSections.released && filtered.released.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ds-text-subtlest, #6B778C)' }}>
              No released versions
            </div>
          )}
        </div>
      )}

      {/* Archived Section */}
      {(filtered.archived.length > 0 || statusFilter === 'all') && (
        <div>
          <h2
            onClick={() =>
              setExpandedSections((p) => ({ ...p, archived: !p.archived }))
            }
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--ds-text-subtlest, #6B778C)',
              cursor: 'pointer',
              margin: '0 0 12px 0',
            }}
          >
            {expandedSections.archived ? '▼' : '▶'} ARCHIVED ({filtered.archived.length})
          </h2>
          {expandedSections.archived && filtered.archived.length > 0 && (
            <JiraTable
              rows={filtered.archived}
              columns={columns}
              getRowKey={(r) => r.id}
            />
          )}
          {expandedSections.archived && filtered.archived.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ds-text-subtlest, #6B778C)' }}>
              No archived versions
            </div>
          )}
        </div>
      )}
    </div>
  );
}
