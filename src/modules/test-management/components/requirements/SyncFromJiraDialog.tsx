/**
 * Sync From Jira Dialog
 * Shows Jira configuration status and allows syncing requirements
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertCircle, Settings, ExternalLink, Info } from 'lucide-react';
import { toast } from 'sonner';

interface SyncFromJiraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SyncFromJiraDialog({
  open,
  onOpenChange,
  onSuccess,
}: SyncFromJiraDialogProps) {
  const navigate = useNavigate();
  const [jql, setJql] = useState('project = PROJ AND type = Requirement');
  const [isSyncing, setIsSyncing] = useState(false);

  // Check if Jira is configured - this would check actual settings in a real implementation
  // For now, we show the "not configured" state to guide users
  const isJiraConfigured = false;

  const handleSync = async () => {
    if (!isJiraConfigured) {
      toast.error('Jira integration not configured');
      return;
    }

    setIsSyncing(true);
    try {
      // TODO: Implement actual Jira API call when integration is set up
      // const response = await jiraService.searchIssues(jql);
      // await requirementsService.upsertFromJira(response.issues);
      
      toast.success('Synced requirements from Jira');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoToSettings = () => {
    onOpenChange(false);
    navigate('/tests/settings');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Sync from Jira
          </DialogTitle>
          <DialogDescription>
            Import requirements from Jira using JQL query
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {!isJiraConfigured ? (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Jira integration is not configured yet.
                </AlertDescription>
              </Alert>
              
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">To sync requirements from Jira, you need to:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Go to Settings → Integrations</li>
                      <li>Configure your Jira connection (URL, API token)</li>
                      <li>Return here to sync requirements</li>
                    </ol>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleGoToSettings}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure in Settings
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="jql">JQL Query</Label>
                <Input
                  id="jql"
                  value={jql}
                  onChange={(e) => setJql(e.target.value)}
                  placeholder="project = PROJ AND type = Requirement"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a JQL query to filter which issues to import as requirements
                </p>
              </div>

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">What will be synced:</p>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-0.5">
                  <li>Issue key → Requirement key</li>
                  <li>Summary → Requirement title</li>
                  <li>Description → Requirement description</li>
                  <li>Priority → Requirement priority</li>
                  <li>Status → Requirement status</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {isJiraConfigured && (
            <Button
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SyncFromJiraDialog;
