import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Button from '@atlaskit/button';
import TextField from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import Flag from '@atlaskit/flag';
import { useReleases } from '@/hooks/releases/useReleases';
import { Release, ReleaseStatus, ReleaseProgress } from '@/types/phase3-releases';
import JiraTable from '@/components/shared/JiraTable';
import { ReleaseCreateModal } from '@/components/releases/ReleaseCreateModal';
import { ReleaseEditModal } from '@/components/releases/ReleaseEditModal';
import { ReleaseArchiveDialog } from '@/components/releases/ReleaseArchiveDialog';
import { ReleaseConfirmationModal } from '@/components/releases/ReleaseConfirmationModal';
import { ReleaseDeleteDialog } from '@/components/releases/ReleaseDeleteDialog';
import { ActionsMenu } from '@/components/releases/ActionsMenu';
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

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [archivingRelease, setArchivingRelease] = useState<Release | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmingRelease, setConfirmingRelease] = useState<Release | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRelease, setDeletingRelease] = useState<Release | null>(null);

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

  const handleEditRelease = (release: Release) => {
    setEditingRelease(release);
    setIsEditModalOpen(true);
  };

  const handleArchiveRelease = (release: Release) => {
    setArchivingRelease(release);
    setIsArchiveDialogOpen(true);
  };

  const handleReleaseVersion = (release: Release) => {
    setConfirmingRelease(release);
    setIsConfirmModalOpen(true);
  };

  const handleDeleteRelease = (release: Release) => {
    setDeletingRelease(release);
    setIsDeleteDialogOpen(true);
  };

  const handleAction = (action: string, release: Release) => {
    if (action === 'edit') {
      handleEditRelease(release);
    } else if (action === 'archive') {
      handleArchiveRelease(release);
    } else if (action === 'release') {
      handleReleaseVersion(release);
    } else if (action === 'delete') {
      handleDeleteRelease(release);
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
    makeActionsCell(handleEditRelease, handleArchiveRelease, handleReleaseVersion, handleDeleteRelease),
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
        <Button appearance="primary" onClick={() => setIsCreateModalOpen(true)}>
          Create release
        </Button>
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

      {/* Create Release Modal */}
      <ReleaseCreateModal
        isOpen={isCreateModalOpen}
        projectKey={key!}
        projectId={data?.data?.[0]?.project_id || key!}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(release) => {
          setSuccessFlag(`Release "${release.name}" has been created.`);
        }}
      />

      {/* Edit Release Modal */}
      {editingRelease && (
        <ReleaseEditModal
          isOpen={isEditModalOpen}
          projectKey={key!}
          release={editingRelease}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingRelease(null);
          }}
          onSuccess={(release) => {
            setSuccessFlag(`Release "${release.name}" has been updated.`);
          }}
        />
      )}

      {/* Archive Release Dialog */}
      {archivingRelease && (
        <ReleaseArchiveDialog
          isOpen={isArchiveDialogOpen}
          release={archivingRelease}
          projectKey={key!}
          onClose={() => {
            setIsArchiveDialogOpen(false);
            setArchivingRelease(null);
          }}
          onSuccess={() => {
            setSuccessFlag(`Release "${archivingRelease.name}" has been archived.`);
          }}
        />
      )}

      {/* Release Confirmation Modal */}
      {confirmingRelease && (
        <ReleaseConfirmationModal
          isOpen={isConfirmModalOpen}
          release={confirmingRelease}
          projectKey={key!}
          onClose={() => {
            setIsConfirmModalOpen(false);
            setConfirmingRelease(null);
          }}
          onSuccess={(release) => {
            setSuccessFlag(`Release "${release.name}" published.`);
          }}
        />
      )}

      {/* Delete Release Dialog */}
      {deletingRelease && (
        <ReleaseDeleteDialog
          isOpen={isDeleteDialogOpen}
          release={deletingRelease}
          projectKey={key!}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setDeletingRelease(null);
          }}
          onSuccess={() => {
            setSuccessFlag(`Release "${deletingRelease.name}" has been deleted.`);
          }}
        />
      )}
    </div>
  );
}
