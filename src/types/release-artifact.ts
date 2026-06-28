/**
 * Release Artifact Types
 *
 * Artifacts are the work items that ship in a release.
 * Polymorphic types: BR, Feature, Epic, Incident, Story
 */

export type ArtifactType = 'business_request' | 'feature' | 'epic' | 'production_incident' | 'story';

export interface ReleaseArtifact {
  id: string;
  releaseId: string;
  artifactType: ArtifactType;
  artifactId: string;
  artifactLabel: string;
  createdAt: string;
  createdBy?: string;
}

export interface ReleaseArtifactInput {
  artifactType: ArtifactType;
  artifactId: string;
  artifactLabel?: string;
}

export interface ReleaseArtifactOption {
  artifactType: ArtifactType;
  artifactId: string;
  label: string;
  completionPercent?: number;
  isComplete?: boolean;
  isSelectable: boolean;
}

export interface ReleaseWithArtifacts {
  id: string;
  key: string;
  name: string;
  releaseDate: string;
  status: string;
  artifacts: ReleaseArtifact[];
  sprints: ReleasedSprint[];
  linkedBRs?: Array<{
    id: string;
    key: string;
    title: string;
  }>;
}

export interface ReleasedSprint {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  storyCount: number;
}

export interface ReleaseArtifactValidation {
  artifactId: string;
  artifactType: ArtifactType;
  isValid: boolean;
  isSelectable: boolean;
  reason?: string;
}
