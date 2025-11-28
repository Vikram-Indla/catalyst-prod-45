import { AttachmentsSection } from '@/components/shared/AttachmentsSection';

interface FeatureAttachmentsTabProps {
  featureId?: string;
}

export function FeatureAttachmentsTab({ featureId }: FeatureAttachmentsTabProps) {
  if (!featureId) {
    return (
      <div className="text-sm text-muted-foreground">
        Save feature to add attachments
      </div>
    );
  }

  return <AttachmentsSection entityType="features" entityId={featureId} />;
}
