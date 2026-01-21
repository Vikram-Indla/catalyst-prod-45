// =====================================================
// VERSION HISTORY PANEL COMPONENT
// View and restore test case versions
// =====================================================

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  History, 
  RotateCcw, 
  Eye,
  Clock,
  User,
  GitBranch
} from 'lucide-react';
import { 
  useVersionHistory, 
  useRestoreVersion,
  useCreateVersionSnapshot,
  VersionEntry,
  compareVersions
} from '@/hooks/test-cases/useVersionHistory';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

interface VersionHistoryPanelProps {
  caseId: string;
  currentVersion?: number;
}

export function VersionHistoryPanel({ caseId, currentVersion = 1 }: VersionHistoryPanelProps) {
  const { data: versions = [], isLoading } = useVersionHistory(caseId);
  const restoreVersion = useRestoreVersion();
  const createSnapshot = useCreateVersionSnapshot();
  
  const [previewVersion, setPreviewVersion] = useState<VersionEntry | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<VersionEntry | null>(null);

  const handleCreateSnapshot = async () => {
    try {
      const version = await createSnapshot.mutateAsync({ 
        caseId, 
        changeSummary: 'Manual snapshot' 
      });
      toast.success(`Version ${version} created`);
    } catch (error) {
      toast.error('Failed to create snapshot');
      console.error(error);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      await restoreVersion.mutateAsync({ 
        caseId, 
        versionNumber: restoreTarget.version_number 
      });
      toast.success(`Restored to version ${restoreTarget.version_number}`);
      setRestoreTarget(null);
    } catch (error) {
      toast.error('Failed to restore version');
      console.error(error);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
            <Badge variant="secondary">v{currentVersion}</Badge>
          </CardTitle>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleCreateSnapshot}
            disabled={createSnapshot.isPending}
          >
            <GitBranch className="h-4 w-4 mr-1" />
            Save Version
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No version history yet</p>
            <p className="text-xs mt-1">Save a version to track changes</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px]">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />
              
              <div className="space-y-4">
                {versions.map((version, index) => (
                  <div 
                    key={version.id}
                    className="relative pl-10 group"
                  >
                    {/* Timeline dot */}
                    <div className={`absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 ${
                      index === 0 
                        ? 'bg-primary border-primary' 
                        : 'bg-background border-muted-foreground'
                    }`} />
                    
                    <div className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={index === 0 ? 'default' : 'outline'}>
                              v{version.version_number}
                            </Badge>
                            {index === 0 && (
                              <Badge variant="secondary" className="text-xs">Latest</Badge>
                            )}
                          </div>
                          
                          {version.change_summary && (
                            <p className="text-sm font-medium">
                              {version.change_summary}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {version.changed_by_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setPreviewVersion(version)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {index > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setRestoreTarget(version)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Preview Dialog */}
      <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Version {previewVersion?.version_number} Preview
              <Badge variant="outline" className="text-xs">
                {previewVersion && format(new Date(previewVersion.created_at), 'MMM d, yyyy HH:mm')}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {previewVersion?.snapshot && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Title</label>
                  <p className="font-medium">{previewVersion.snapshot.title}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Priority</label>
                  <p>{previewVersion.snapshot.priority}</p>
                </div>
              </div>
              
              {previewVersion.snapshot.description && (
                <div>
                  <label className="text-xs text-muted-foreground">Description</label>
                  <p className="text-sm">{previewVersion.snapshot.description}</p>
                </div>
              )}
              
              {previewVersion.snapshot.preconditions && (
                <div>
                  <label className="text-xs text-muted-foreground">Preconditions</label>
                  <p className="text-sm">{previewVersion.snapshot.preconditions}</p>
                </div>
              )}
              
              <div>
                <label className="text-xs text-muted-foreground">
                  Steps ({previewVersion.snapshot.steps.length})
                </label>
                <div className="space-y-2 mt-2">
                  {previewVersion.snapshot.steps.map((step, i) => (
                    <div key={i} className="p-2 rounded border bg-muted/50 text-sm">
                      <span className="font-mono text-xs text-muted-foreground mr-2">
                        {step.step_number}.
                      </span>
                      {step.action}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Version {restoreTarget?.version_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the test case to version {restoreTarget?.version_number}. 
              A backup of the current state will be saved automatically before restoring.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRestore}
              disabled={restoreVersion.isPending}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
