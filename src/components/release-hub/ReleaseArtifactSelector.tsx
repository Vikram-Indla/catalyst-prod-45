import React, { useState, useEffect } from 'react';
import { releaseArtifactService } from '@/services/release-artifact.service';
import type { ReleaseArtifactInput, ReleaseArtifactOption } from '@/types/release-artifact';

export interface ReleaseArtifactSelectorProps {
  releaseId: string;
  onArtifactsSelected: (artifacts: ReleaseArtifactInput[]) => void;
  onClose: () => void;
}

export function ReleaseArtifactSelector({
  releaseId,
  onArtifactsSelected,
  onClose,
}: ReleaseArtifactSelectorProps) {
  const [availableArtifacts, setAvailableArtifacts] = useState<ReleaseArtifactOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArtifacts();
  }, [releaseId]);

  async function loadArtifacts() {
    try {
      setLoading(true);
      const artifacts = await releaseArtifactService.getAvailableArtifactsForRelease(releaseId);
      setAvailableArtifacts(artifacts);
    } catch (error) {
      console.error('Failed to load artifacts:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(artifactId: string) {
    const newSelected = new Set(selected);
    if (newSelected.has(artifactId)) {
      newSelected.delete(artifactId);
    } else {
      newSelected.add(artifactId);
    }
    setSelected(newSelected);
  }

  function handleConfirm() {
    const selectedArtifacts = Array.from(selected).map((artifactId) => {
      const artifact = availableArtifacts.find((a) => a.artifactId === artifactId);
      if (!artifact) throw new Error(`Artifact ${artifactId} not found`);

      return {
        artifactType: artifact.artifactType,
        artifactId: artifact.artifactId,
        artifactLabel: artifact.label,
      } as ReleaseArtifactInput;
    });

    onArtifactsSelected(selectedArtifacts);
    onClose();
  }

  const completeBRs = availableArtifacts.filter(
    (a) => a.artifactType === 'business_request' && a.isSelectable
  );
  const featuresAndEpics = availableArtifacts.filter((a) =>
    ['feature', 'epic'].includes(a.artifactType)
  );
  const incidents = availableArtifacts.filter((a) => a.artifactType === 'production_incident');

  if (loading) {
    return <div className="text-center py-8">Loading artifacts...</div>;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Select Release Artifacts</h2>
        </div>

        <div className="p-6 space-y-6">
          {completeBRs.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Complete Business Requests</h3>
              <p className="text-xs text-gray-600 mb-3">Only 100% complete BRs can be selected as artifacts</p>
              <div className="space-y-2">
                {completeBRs.map((br) => (
                  <label key={br.artifactId} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(br.artifactId)}
                      onChange={() => toggleSelection(br.artifactId)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{br.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {featuresAndEpics.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Features & Epics</h3>
              <p className="text-xs text-gray-600 mb-3">Select features from BRs that are still in progress</p>
              <div className="space-y-2">
                {featuresAndEpics.map((item) => (
                  <label key={item.artifactId} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(item.artifactId)}
                      onChange={() => toggleSelection(item.artifactId)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {incidents.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Production Incidents</h3>
              <div className="space-y-2">
                {incidents.map((incident) => (
                  <label key={incident.artifactId} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(incident.artifactId)}
                      onChange={() => toggleSelection(incident.artifactId)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{incident.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex gap-2 justify-end">
          <button
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`px-4 py-2 rounded text-white text-sm font-medium ${
              selected.size === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
            onClick={handleConfirm}
            disabled={selected.size === 0}
          >
            Confirm ({selected.size} selected)
          </button>
        </div>
      </div>
    </div>
  );
}
