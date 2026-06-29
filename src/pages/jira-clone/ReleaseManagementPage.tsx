import React, { useState } from 'react';
import { Release, ReleaseStatus } from './types';
import { mockReleases } from './data/mockReleases';

const ReleaseManagementPage: React.FC = () => {
  const [releases, setReleases] = useState<Release[]>(mockReleases);
  const [statusFilter, setStatusFilter] = useState<ReleaseStatus>('UNRELEASED');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedReleaseForAction, setSelectedReleaseForAction] = useState<{ release: Release; action: string } | null>(null);

  const filteredReleases = releases
    .filter(r => r.status === statusFilter)
    .filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleCreateRelease = (name: string) => {
    if (!name.trim()) return;
    const newRelease: Release = {
      id: String(releases.length + 1),
      name,
      status: 'UNRELEASED',
      progress: { completed: 0, total: 0 },
      workItemsCount: 0,
    };
    setReleases([...releases, newRelease]);
    setIsCreateDialogOpen(false);
  };

  const handleReleaseConfirm = () => {
    if (selectedReleaseForAction) {
      const updated = releases.map(r =>
        r.id === selectedReleaseForAction.release.id
          ? { ...r, status: 'RELEASED' as ReleaseStatus }
          : r
      );
      setReleases(updated);
      setIsConfirmDialogOpen(false);
      setSelectedReleaseForAction(null);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px' }}>
      {/* Header */}
      <h1 style={{ margin: '0 0 24px 0' }}>Senaei BAU</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--ds-background-neutral)' }}>
        <button style={{ padding: '8px 12px', background: 'none', border: 'none', color: 'var(--ds-text-subtlest)', cursor: 'pointer' }}>List</button>
        <button style={{ padding: '8px 12px', background: 'none', border: 'none', color: 'var(--ds-link)', borderBottom: '2px solid var(--ds-link)', fontWeight: 500, cursor: 'pointer' }}>Releases</button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '180px', padding: '4px 12px', border: '1px solid var(--ds-border)', borderRadius: '3px', fontSize: 'var(--ds-font-size-400)' }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReleaseStatus)}
          style={{ padding: '4px 12px', border: '1px solid var(--ds-border)', borderRadius: '3px', fontSize: 'var(--ds-font-size-400)', cursor: 'pointer' }}
        >
          <option value="RELEASED">Released</option>
          <option value="UNRELEASED">Unreleased</option>
          <option value="ARCHIVED">Archived</option>
        </select>

        <span style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)' }}>This space has 47 releases</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { }}
            style={{ padding: '4px 16px', background: 'none', border: '1px solid var(--ds-border)', borderRadius: '3px', cursor: 'pointer', fontSize: 'var(--ds-font-size-400)' }}
          >
            Give feedback
          </button>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            style={{ padding: '4px 16px', background: 'var(--ds-link)', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: 'var(--ds-font-size-400)', fontWeight: 500 }}
          >
            Create release
          </button>
        </div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--ds-font-size-400)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--ds-background-neutral)', background: '#FAFBFC' }}>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 'var(--ds-font-size-200)' }}>Release</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 'var(--ds-font-size-200)' }}>Status</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 'var(--ds-font-size-200)' }}>Progress</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 'var(--ds-font-size-200)' }}>Start date</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 'var(--ds-font-size-200)' }}>Release date</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 'var(--ds-font-size-200)' }}>Description</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 'var(--ds-font-size-200)' }}>More actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredReleases.map((release) => (
            <tr key={release.id} style={{ borderBottom: '1px solid var(--ds-background-neutral)', background: 'var(--ds-surface)', hover: { background: 'var(--ds-surface-sunken)' } as any }}>
              <td style={{ padding: '12px 16px' }}>
                <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--ds-link, var(--ds-link))', textDecoration: 'underline' }}>{release.name}</a>
              </td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{ display: 'inline-block', padding: '0px 8px', background: 'var(--ds-surface)', border: '1px solid var(--ds-text-subtlest)', borderRadius: '3px', fontSize: 'var(--ds-font-size-200)', fontWeight: 600 }}>
                  {release.status}
                </span>
              </td>
              <td style={{ padding: '12px 16px' }}>
                {release.workItemsCount === 0 ? (
                  <span style={{ fontStyle: 'italic', color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)' }}>No work items</span>
                ) : (
                  <div style={{ display: 'flex', gap: 0, height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'var(--ds-background-neutral)', width: '100px' }}>
                    <div style={{ flex: release.progress?.completed || 0, background: 'var(--ds-text-success)' }} />
                    <div style={{ flex: (release.progress?.total || 0) - (release.progress?.completed || 0), background: 'var(--ds-background-neutral, var(--ds-background-neutral))' }} />
                  </div>
                )}
              </td>
              <td style={{ padding: '12px 16px', color: 'var(--ds-text)' }}>{release.startDate || ''}</td>
              <td style={{ padding: '12px 16px', color: release.releaseDate && new Date(release.releaseDate) < new Date('2026-06-26') ? 'var(--ds-text-danger, var(--ds-text-danger))' : 'var(--ds-text, var(--ds-text))' }}>
                {release.releaseDate}
              </td>
              <td style={{ padding: '12px 16px' }}>
                {release.description === 'Release' && (
                  <button
                    onClick={() => {
                      setSelectedReleaseForAction({ release, action: 'release' });
                      setIsConfirmDialogOpen(true);
                    }}
                    style={{ padding: '4px 12px', background: 'var(--ds-link)', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: 'var(--ds-font-size-200)', fontWeight: 500 }}
                  >
                    Release
                  </button>
                )}
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                <button
                  onClick={() => { }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--ds-font-size-500)', padding: '4px 8px' }}
                >
                  ⋯
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Create Release Dialog */}
      {isCreateDialogOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(9, 30, 66, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}> // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
          <div style={{ background: 'white', borderRadius: '3px', padding: '24px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 32px rgba(9, 30, 66, 0.25)' }}> // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
            <h2 style={{ margin: '0 0 16px 0' }}>Create Release</h2>
            <input
              id="release-name"
              type="text"
              placeholder="e.g., Release 1.0"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--ds-border)', borderRadius: '3px', fontSize: 'var(--ds-font-size-400)', marginBottom: '24px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                style={{ padding: '4px 16px', background: 'none', border: '1px solid var(--ds-border)', borderRadius: '3px', cursor: 'pointer', fontSize: 'var(--ds-font-size-400)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('release-name') as HTMLInputElement;
                  handleCreateRelease(input.value);
                }}
                style={{ padding: '4px 16px', background: 'var(--ds-link)', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: 'var(--ds-font-size-400)', fontWeight: 500 }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Release Dialog */}
      {isConfirmDialogOpen && selectedReleaseForAction && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(9, 30, 66, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}> // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
          <div style={{ background: 'white', borderRadius: '3px', padding: '24px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 32px rgba(9, 30, 66, 0.25)' }}> // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
            <h2 style={{ margin: '0 0 16px 0' }}>Release {selectedReleaseForAction.release.name}?</h2>
            <p style={{ margin: '0 0 24px 0', color: 'var(--ds-text)' }}>Are you sure you want to release this?</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setIsConfirmDialogOpen(false);
                  setSelectedReleaseForAction(null);
                }}
                style={{ padding: '4px 16px', background: 'none', border: '1px solid var(--ds-border)', borderRadius: '3px', cursor: 'pointer', fontSize: 'var(--ds-font-size-400)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleReleaseConfirm}
                style={{ padding: '4px 16px', background: 'var(--ds-text-danger)', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: 'var(--ds-font-size-400)', fontWeight: 500 }}
              >
                Release
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rovo Button */}
      <button
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--ds-link)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: 'var(--ds-font-size-700)',
          zIndex: 1000,
          boxShadow: 'var(--ds-shadow-overlay)',
        }}
      >
        ?
      </button>
    </div>
  );
};

export default ReleaseManagementPage;
