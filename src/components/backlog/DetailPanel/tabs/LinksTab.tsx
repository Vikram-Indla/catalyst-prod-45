import { KnowledgeBaseCard } from "@/components/knowledge-hub/KnowledgeBaseCard";

interface LinksTabProps {
  itemId?: string;
  itemType?: 'epic' | 'feature' | 'story' | 'defect' | 'business_request';
}

export function LinksTab({ itemId, itemType = 'feature' }: LinksTabProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-center h-32 text-muted-foreground border rounded-md">
        <div className="text-center">
          <p className="text-sm">Related items and dependencies will be displayed here</p>
        </div>
      </div>

      {itemId && (
        <KnowledgeBaseCard workItemId={itemId} workItemType={itemType} />
      )}
    </div>
  );
}