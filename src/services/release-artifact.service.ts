import { supabase } from '@/lib/supabase';
import type {
  ReleaseArtifact,
  ReleaseArtifactInput,
  ReleaseArtifactOption,
} from '@/types/release-artifact';

export class ReleaseArtifactService {
  /**
   * Add artifact to release
   */
  async addArtifactToRelease(releaseId: string, artifact: ReleaseArtifactInput): Promise<void> {
    const { error } = await supabase
      .from('release_artifacts')
      .insert({
        release_id: releaseId,
        artifact_type: artifact.artifactType,
        artifact_id: artifact.artifactId,
        artifact_label: artifact.artifactLabel || this.generateLabel(artifact),
      });

    if (error) throw error;
  }

  /**
   * Remove artifact from release
   */
  async removeArtifactFromRelease(
    releaseId: string,
    artifactId: string,
    artifactType: string
  ): Promise<void> {
    const { error } = await supabase
      .from('release_artifacts')
      .delete()
      .eq('release_id', releaseId)
      .eq('artifact_id', artifactId)
      .eq('artifact_type', artifactType);

    if (error) throw error;
  }

  /**
   * Get artifacts for release
   */
  async getArtifactsForRelease(releaseId: string): Promise<ReleaseArtifact[]> {
    const { data, error } = await supabase
      .from('release_artifacts')
      .select('*')
      .eq('release_id', releaseId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get available artifacts for selection
   * Only complete BRs can be selected as direct artifacts
   */
  async getAvailableArtifactsForRelease(releaseId: string): Promise<ReleaseArtifactOption[]> {
    const { data, error } = await supabase
      .from('v_release_artifact_options')
      .select('*');

    if (error) throw error;

    return (data || []).map((item: any) => ({
      artifactType: item.artifact_type,
      artifactId: item.artifact_id,
      label: item.artifact_label,
      completionPercent: item.completion_percent,
      isComplete: item.is_complete,
      isSelectable: item.artifact_type === 'business_request' ? item.is_complete : true,
    }));
  }

  /**
   * Validate if BR can be selected as artifact (must be 100% complete)
   */
  async validateBRCanBeArtifact(brId: string): Promise<{
    isComplete: boolean;
    isSelectable: boolean;
    reason?: string;
  }> {
    const { data, error } = await supabase
      .from('v_release_artifact_options')
      .select('*')
      .eq('artifact_id', brId)
      .eq('artifact_type', 'business_request')
      .single();

    if (error) {
      return { isComplete: false, isSelectable: false, reason: 'BR not found' };
    }

    if (!data.is_complete) {
      return {
        isComplete: false,
        isSelectable: false,
        reason: `BR is ${data.completion_percent}% complete. Only 100% complete BRs can be selected as artifacts.`,
      };
    }

    return { isComplete: true, isSelectable: true };
  }

  private generateLabel(artifact: ReleaseArtifactInput): string {
    return artifact.artifactLabel || `${artifact.artifactType}-${artifact.artifactId}`;
  }
}

export const releaseArtifactService = new ReleaseArtifactService();
