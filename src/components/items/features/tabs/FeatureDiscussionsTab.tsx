import { CommentsSection } from '@/components/shared/CommentsSection';

interface FeatureDiscussionsTabProps {
  featureId?: string;
}

export function FeatureDiscussionsTab({ featureId }: FeatureDiscussionsTabProps) {
  if (!featureId) {
    return (
      <div className="text-sm text-muted-foreground">
        Save feature to add discussions
      </div>
    );
  }

  return <CommentsSection entityType="features" entityId={featureId} />;
}
