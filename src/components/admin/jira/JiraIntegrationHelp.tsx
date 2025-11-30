import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

interface JiraIntegrationHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JiraIntegrationHelp({ open, onOpenChange }: JiraIntegrationHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Jira Integration Documentation</DialogTitle>
          <DialogDescription>
            Complete guide to configuring and using the Jira integration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Prerequisites and initial setup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">1. Obtain Jira Credentials</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>
                    <strong>Jira Cloud:</strong> Create an API token at{" "}
                    <a
                      href="https://id.atlassian.com/manage-profile/security/api-tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-gold hover:underline inline-flex items-center gap-1"
                    >
                      Atlassian Account Settings <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    <strong>Jira Server/Data Center:</strong> Generate a Personal Access Token (PAT)
                    in your Jira profile settings
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">2. Required Permissions</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Your Jira account must have these permissions for mapped projects:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Browse Projects</li>
                  <li>Create Issues</li>
                  <li>Edit Issues</li>
                  <li>View Development Tools (for links)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuration Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Step 1: Add Connection</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Add Connection" and enter your Jira instance URL (e.g.,
                  https://yourcompany.atlassian.net), select instance type, and provide credentials.
                  Click "Test Connection" to verify.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Step 2: Configure Field Mappings</h4>
                <p className="text-sm text-muted-foreground">
                  Map Catalyst fields to Jira fields for each work item type. Example: Catalyst
                  "Story" → Jira "Issue", "Status" → "Status", "Assignee" → "Assignee".
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Step 3: Set Up Project Mappings</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Fetch from Jira" to load your Jira projects, then map each to a Catalyst
                  program. Enable sync for projects you want to synchronize.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Step 4: Configure Sync Settings</h4>
                <p className="text-sm text-muted-foreground">
                  Enable auto-sync, set interval (recommended: 30 minutes), choose conflict resolution
                  strategy, and configure what data to sync (attachments, comments, work logs).
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Step 5: Set Up Webhooks (Optional)</h4>
                <p className="text-sm text-muted-foreground">
                  For real-time updates, configure Jira webhooks. Copy the webhook URL from the
                  Webhook Setup dialog and add it in Jira Settings → System → Webhooks.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Step 6: Initial Sync</h4>
                <p className="text-sm text-muted-foreground">
                  Use Historical Migration to import existing Jira issues. Select work item types and
                  click "Start Migration". Monitor progress in the Sync Health dashboard.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Synchronization Behavior</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium mb-1">Bidirectional Sync</h4>
                <p className="text-muted-foreground">
                  Changes in Catalyst automatically sync to Jira and vice versa. Updates include:
                  status, assignee, description, comments, attachments (if enabled).
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-1">Conflict Resolution</h4>
                <p className="text-muted-foreground">
                  When the same field is modified in both systems simultaneously, the system creates a
                  conflict log. Resolve conflicts manually via the Conflict Resolution dialog by
                  choosing Catalyst version, Jira version, or Merge.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-1">Status Mapping</h4>
                <p className="text-muted-foreground">
                  Configure how Catalyst statuses map to Jira statuses. Example: Catalyst "Backlog" →
                  Jira "To Do", "Implementing" → "In Progress", "Done" → "Done".
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium mb-1">Connection Test Failed</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Verify Jira URL is correct (include https://)</li>
                  <li>Check credentials are valid and not expired</li>
                  <li>Ensure network access to Jira instance</li>
                  <li>For Jira Cloud, confirm API token is correctly copied</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-1">Sync Failures</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Check Sync Health dashboard for error details</li>
                  <li>Verify field mappings are correct</li>
                  <li>Ensure required fields in Jira are mapped</li>
                  <li>Check project mappings are enabled</li>
                  <li>Review Jira API rate limits</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-1">Missing Work Items</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Confirm project is mapped and sync enabled</li>
                  <li>Check work item type is configured in field mappings</li>
                  <li>Run manual sync to trigger immediate synchronization</li>
                  <li>Review sync logs for specific item errors</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💡</div>
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Best Practices:</strong> Start with one project mapping to test the
                  integration. Configure field mappings carefully to match your workflow. Use
                  auto-sync intervals of 30+ minutes to avoid rate limits. Monitor Sync Health
                  dashboard regularly for issues.
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
