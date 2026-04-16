/**
 * In-Jira Settings Page
 * Admin configuration for project settings and Jira import
 */

import { useState } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Upload, 
  Users, 
  Shield, 
  Workflow,
  Database,
  Bell
} from 'lucide-react';
import { ImportWizard } from '../components/import/ImportWizard';

// Default tenant ID for demo - in production, this would come from auth context
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export function SettingsPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [importWizardOpen, setImportWizardOpen] = useState(false);

  // Demo project ID - in production, this would be fetched based on projectKey
  const projectId = projectKey || 'demo-project';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
          <CatalystPageHeader title="Project Settings" />
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Shield className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="workflows" className="gap-2">
            <Workflow className="h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic project configuration options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                General settings configuration coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Jira Cloud Import
              </CardTitle>
              <CardDescription>
                Import issues, users, and configurations from Jira Cloud
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium">Import Features</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Idempotent import - run multiple times safely
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    User matching by email
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Status and workflow mapping
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Comments and attachments metadata
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    AI-powered diff analysis
                  </li>
                </ul>
              </div>
              
              <Button onClick={() => setImportWizardOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Start Import Wizard
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
              <CardDescription>Previous import jobs and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No import history available.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Permissions & Access
              </CardTitle>
              <CardDescription>
                Manage who can access and modify this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Permission configuration coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Configuration</CardTitle>
              <CardDescription>Configure issue workflows and transitions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Workflow configuration coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Notification settings coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ImportWizard 
        open={importWizardOpen} 
        onOpenChange={setImportWizardOpen}
        projectId={projectId}
        tenantId={DEFAULT_TENANT_ID}
      />
    </div>
  );
}

export default SettingsPage;
