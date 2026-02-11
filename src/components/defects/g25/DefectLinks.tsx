import { FileText, Play, Bug, Link, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDefectLinksG25, useDeleteDefectLinkG25 } from '@/hooks/useDefectsG25';
import { Skeleton } from '@/components/ui/skeleton';
import { DefectLink } from '@/types/defects';

export function DefectLinks({ defectId, onAddLink }: { defectId: string; onAddLink?: () => void }) {
  const { data: links, isLoading } = useDefectLinksG25(defectId);
  const del = useDeleteDefectLinkG25();

  const getIcon = (type: string) => {
    switch (type) { case 'test_case': return FileText; case 'execution': return Play; case 'related_defect': return Bug; default: return Link; }
  };
  const getLabel = (link: DefectLink) => link.test_case ? link.test_case.case_key : link.linked_id.slice(0, 8);
  const getTitle = (link: DefectLink) => link.test_case?.title || '';

  if (isLoading) return <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Linked Items ({links?.length || 0})</h4>
        {onAddLink && <Button size="sm" variant="outline" onClick={onAddLink}><Plus className="h-4 w-4 mr-1" />Add Link</Button>}
      </div>
      {links?.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No linked items</p>
      ) : (
        <div className="space-y-2">
          {links?.map(link => {
            const Icon = getIcon(link.link_type);
            return (
              <div key={link.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-primary">{getLabel(link)}</span>
                      <Badge variant="outline" className="text-xs capitalize">{link.link_type.replace('_', ' ')}</Badge>
                    </div>
                    {getTitle(link) && <p className="text-sm text-muted-foreground truncate max-w-md">{getTitle(link)}</p>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-destructive" onClick={() => del.mutate({ linkId: link.id, defectId })}><X className="h-4 w-4" /></Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
