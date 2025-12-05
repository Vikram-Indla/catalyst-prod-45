import { useState } from 'react';
import { FileText, Plus, ExternalLink, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useKnowledgeHubDocuments, useCreateKBDocument, type WorkItemType } from '@/hooks/useKnowledgeHubDocuments';
import { toast } from 'sonner';

interface KnowledgeBaseCardProps {
  workItemId: string;
  workItemType: WorkItemType;
}

export function KnowledgeBaseCard({ workItemId, workItemType }: KnowledgeBaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: documents, isLoading } = useKnowledgeHubDocuments(workItemId, workItemType);
  const createDocument = useCreateKBDocument();

  const handleCreateDocument = async () => {
    try {
      await createDocument.mutateAsync({
        title: 'New Document',
        linked_work_item_id: workItemId,
        linked_work_item_type: workItemType,
      });
      toast.success('Document created');
    } catch (error) {
      toast.error('Failed to create document');
    }
  };

  const displayedDocs = isExpanded ? documents : documents?.slice(0, 3);
  const hasMoreDocs = documents && documents.length > 3;

  return (
    <Card className="border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-brand-gold" />
            Knowledge Base
          </CardTitle>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleCreateDocument}
            disabled={createDocument.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Document
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {!isLoading && (!documents || documents.length === 0) && (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No knowledge base documents yet.</p>
            <p className="text-xs mt-1">Create structured documentation for this work item.</p>
          </div>
        )}

        {!isLoading && documents && documents.length > 0 && (
          <div className="space-y-2">
            {displayedDocs?.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-md bg-background hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{doc.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Last edited {new Date(doc.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            ))}

            {hasMoreDocs && !isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setIsExpanded(true)}
              >
                +{documents.length - 3} more documents
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            )}

            {isExpanded && hasMoreDocs && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setIsExpanded(false)}
              >
                Show less
                <ChevronUp className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
