import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Clock, User, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface DocumentVersionHistoryProps {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestoreVersion?: (content: string) => void;
}

interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  title: string;
  content: unknown;
  change_summary: string | null;
  created_by: string | null;
  created_at: string;
}

export function DocumentVersionHistory({
  documentId,
  open,
  onOpenChange,
  onRestoreVersion
}: DocumentVersionHistoryProps) {
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);

  const { data: versions, isLoading } = useQuery({
    queryKey: ['kb-document-versions', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data as DocumentVersion[];
    },
    enabled: open && !!documentId
  });

  const handleRestore = (version: DocumentVersion) => {
    if (onRestoreVersion && version.content) {
      const contentStr = typeof version.content === 'string' 
        ? version.content 
        : JSON.stringify(version.content);
      onRestoreVersion(contentStr);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-brand-gold" />
            Version History
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold" />
            </div>
          ) : versions && versions.length > 0 ? (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={index === 0 ? "default" : "secondary"}>
                          v{version.version_number}
                        </Badge>
                        {index === 0 && (
                          <Badge variant="outline" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium text-sm">{version.title}</h4>
                      {version.change_summary && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {version.change_summary}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewVersion(version)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {index !== 0 && onRestoreVersion && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(version)}
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No version history available
            </div>
          )}
        </ScrollArea>

        {/* Version Preview Modal could be added here */}
      </SheetContent>
    </Sheet>
  );
}
