import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";

interface JiraSetupGuideProps {
  hasConnections: boolean;
}

export function JiraSetupGuide({ hasConnections }: JiraSetupGuideProps) {
  const steps = [
    {
      id: 1,
      title: "Create Jira Connection",
      description: "Click 'Add Connection' and enter your Jira instance URL and credentials",
      completed: hasConnections,
      details: [
        "Jira Cloud: username + API token",
        "Jira Server/Data Center: PAT or Basic auth",
        "Test connection to verify credentials",
      ],
    },
    {
      id: 2,
      title: "Configure Field Mappings",
      description: "Map Catalyst fields to Jira fields for each work item type",
      completed: false,
      details: [
        "Stories → Issues",
        "Epics → Epics",
        "Features → Stories/Tasks",
        "Custom field mappings",
      ],
    },
    {
      id: 3,
      title: "Set Up Project Mappings",
      description: "Link Jira projects to Catalyst programs",
      completed: false,
      details: [
        "Fetch projects from Jira",
        "Map to Catalyst programs",
        "Enable/disable sync per project",
      ],
    },
    {
      id: 4,
      title: "Configure Sync Settings",
      description: "Set up automatic synchronization and conflict resolution",
      completed: false,
      details: [
        "Auto-sync interval (15-60 minutes)",
        "Conflict resolution strategy",
        "Sync direction (bidirectional/one-way)",
      ],
    },
    {
      id: 5,
      title: "Set Up Webhooks (Optional)",
      description: "Enable real-time updates from Jira",
      completed: false,
      details: [
        "Configure webhook URL in Jira",
        "Events: issue updated, created, deleted",
        "Real-time synchronization",
      ],
    },
    {
      id: 6,
      title: "Run Initial Sync",
      description: "Import existing work items from Jira",
      completed: false,
      details: [
        "Use Historical Migration tool",
        "Select work item types",
        "Monitor sync progress",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-brand-gold">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            Jira Integration Setup Guide
          </CardTitle>
          <CardDescription>
            Follow these steps to configure bidirectional synchronization between Catalyst and Jira
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex gap-4 p-4 rounded-lg border ${
                step.completed ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-border"
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                {step.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="outline" className="text-xs">
                    Step {step.id}
                  </Badge>
                  <h3 className="font-semibold">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                <ul className="space-y-1">
                  {step.details.map((detail, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-brand-gold" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
          <CardDescription>What this integration provides</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">Bidirectional Sync</span>
              </div>
              <p className="text-sm text-muted-foreground ml-7">
                Changes flow both ways between Catalyst and Jira automatically
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">Field Mapping</span>
              </div>
              <p className="text-sm text-muted-foreground ml-7">
                Flexible mapping between Catalyst and Jira fields
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">Conflict Resolution</span>
              </div>
              <p className="text-sm text-muted-foreground ml-7">
                Smart handling of conflicting changes with manual override
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">Real-time Updates</span>
              </div>
              <p className="text-sm text-muted-foreground ml-7">
                Webhook support for instant synchronization
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">Historical Migration</span>
              </div>
              <p className="text-sm text-muted-foreground ml-7">
                Bulk import existing work items from Jira
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">Sync Health Metrics</span>
              </div>
              <p className="text-sm text-muted-foreground ml-7">
                Monitor sync status, success rate, and errors
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-amber-900 dark:text-amber-100">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-amber-800 dark:text-amber-200">
            <strong>API Tokens:</strong> For Jira Cloud, create an API token at{" "}
            <a
              href="https://id.atlassian.com/manage-profile/security/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-brand-gold"
            >
              Atlassian Account Settings
            </a>
          </p>
          <p className="text-amber-800 dark:text-amber-200">
            <strong>Permissions:</strong> Ensure your Jira account has permission to read/write
            issues in mapped projects
          </p>
          <p className="text-amber-800 dark:text-amber-200">
            <strong>Data Privacy:</strong> Credentials are encrypted and stored securely. Sync
            operations run on secure edge functions.
          </p>
          <p className="text-amber-800 dark:text-amber-200">
            <strong>Rate Limits:</strong> Jira API has rate limits. Auto-sync intervals should be
            15+ minutes to avoid throttling.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
