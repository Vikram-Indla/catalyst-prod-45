/**
 * Test Admin Page
 * AI governance, policies, and integrations configuration
 */

import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { 
  Settings,
  Sparkles,
  Shield,
  Link2,
  Bell,
  Database,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/usePermission';

export function TestAdminPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const { hasPermission, isLoading } = usePermission('test_cases', 'configure', 'program', projectKey);

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-1">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary" />
      </div>
    );
  }

  // Redirect if no permission
  if (!hasPermission) {
    toast.error('You do not have permission to access Test Admin');
    return <Navigate to={`/project/${projectKey}/tests`} replace />;
  }

  const handleToggle = (setting: string, value: boolean) => {
    toast.success(`${setting} ${value ? 'enabled' : 'disabled'}`);
  };

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-border-default">
        <div className="flex items-center gap-2 text-sm text-text-tertiary mb-2">
          <span>{projectKey}</span>
          <span>/</span>
          <span>Tests</span>
          <span>/</span>
          <span className="text-text-primary font-medium">Admin</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-subtle rounded-lg">
              <Settings className="h-5 w-5 text-accent-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">Test Administration</h1>
              <p className="text-sm text-text-tertiary">AI governance, policies, and integrations</p>
            </div>
          </div>
          <Badge className="text-status-warning bg-status-warning/10">
            <Lock className="h-3 w-3 mr-1" />
            Admin Only
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="bg-surface-2 border border-border-default mb-6">
            <TabsTrigger value="ai" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              AI Governance
            </TabsTrigger>
            <TabsTrigger value="policies" className="gap-1.5">
              <Shield className="h-4 w-4" />
              Policies
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-1.5">
              <Link2 className="h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai">
            <div className="space-y-6">
              <Card className="bg-surface-2 border-border-default">
                <CardHeader>
                  <CardTitle className="text-base font-medium text-text-primary">
                    AI Test Generation
                  </CardTitle>
                  <CardDescription>
                    Configure AI-powered test case generation settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-text-primary">Enable AI Test Suggestions</Label>
                      <p className="text-sm text-text-tertiary">
                        Allow AI to suggest test cases based on requirements
                      </p>
                    </div>
                    <Switch 
                      defaultChecked 
                      onCheckedChange={(checked) => handleToggle('AI Suggestions', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-text-primary">Auto-generate Test Steps</Label>
                      <p className="text-sm text-text-tertiary">
                        Automatically generate test steps from acceptance criteria
                      </p>
                    </div>
                    <Switch 
                      defaultChecked 
                      onCheckedChange={(checked) => handleToggle('Auto-generate Steps', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-text-primary">Coverage Gap Analysis</Label>
                      <p className="text-sm text-text-tertiary">
                        Identify untested requirements automatically
                      </p>
                    </div>
                    <Switch 
                      defaultChecked 
                      onCheckedChange={(checked) => handleToggle('Coverage Analysis', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface-2 border-border-default">
                <CardHeader>
                  <CardTitle className="text-base font-medium text-text-primary">
                    AI Model Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-surface-1 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Current Model</p>
                      <p className="text-xs text-text-tertiary">GPT-4 Turbo</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-surface-1 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-text-primary">API Usage</p>
                      <p className="text-xs text-text-tertiary">1,234 / 10,000 tokens this month</p>
                    </div>
                    <Badge variant="outline">12%</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="policies">
            <div className="space-y-6">
              <Card className="bg-surface-2 border-border-default">
                <CardHeader>
                  <CardTitle className="text-base font-medium text-text-primary">
                    Test Execution Policies
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-text-primary">Require Evidence for Pass</Label>
                      <p className="text-sm text-text-tertiary">
                        Testers must attach screenshots for passed tests
                      </p>
                    </div>
                    <Switch onCheckedChange={(checked) => handleToggle('Require Evidence', checked)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-text-primary">Mandatory Defect Linking</Label>
                      <p className="text-sm text-text-tertiary">
                        Failed tests must be linked to a defect
                      </p>
                    </div>
                    <Switch 
                      defaultChecked 
                      onCheckedChange={(checked) => handleToggle('Defect Linking', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-text-primary">Approval Required for Close</Label>
                      <p className="text-sm text-text-tertiary">
                        Test cycles require manager approval to close
                      </p>
                    </div>
                    <Switch onCheckedChange={(checked) => handleToggle('Approval Required', checked)} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface-2 border-border-default">
                <CardHeader>
                  <CardTitle className="text-base font-medium text-text-primary">
                    Quality Gates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-surface-1 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Minimum Pass Rate</p>
                      <p className="text-xs text-text-tertiary">Required for release approval</p>
                    </div>
                    <Badge>85%</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-surface-1 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Maximum Blocked Tests</p>
                      <p className="text-xs text-text-tertiary">Threshold before escalation</p>
                    </div>
                    <Badge>5%</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="integrations">
            <div className="space-y-6">
              <Card className="bg-surface-2 border-border-default">
                <CardHeader>
                  <CardTitle className="text-base font-medium text-text-primary">
                    External Integrations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-surface-1 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-accent-primary" />
                      <div>
                        <p className="text-sm font-medium text-text-primary">Selenium Grid</p>
                        <p className="text-xs text-text-tertiary">Automated test execution</p>
                      </div>
                    </div>
                    <Badge className="text-status-success bg-status-success/10">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-surface-1 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-text-quaternary" />
                      <div>
                        <p className="text-sm font-medium text-text-primary">Cypress Cloud</p>
                        <p className="text-xs text-text-tertiary">E2E test runner</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Connect</Button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-surface-1 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-text-quaternary" />
                      <div>
                        <p className="text-sm font-medium text-text-primary">BrowserStack</p>
                        <p className="text-xs text-text-tertiary">Cross-browser testing</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Connect</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="bg-surface-2 border-border-default">
              <CardHeader>
                <CardTitle className="text-base font-medium text-text-primary">
                  Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-text-primary">Test Failure Alerts</Label>
                    <p className="text-sm text-text-tertiary">
                      Notify team when tests fail
                    </p>
                  </div>
                  <Switch 
                    defaultChecked 
                    onCheckedChange={(checked) => handleToggle('Failure Alerts', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-text-primary">Daily Summary Email</Label>
                    <p className="text-sm text-text-tertiary">
                      Send daily test execution summary
                    </p>
                  </div>
                  <Switch 
                    defaultChecked 
                    onCheckedChange={(checked) => handleToggle('Daily Summary', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-text-primary">Coverage Drop Alerts</Label>
                    <p className="text-sm text-text-tertiary">
                      Alert when coverage drops below threshold
                    </p>
                  </div>
                  <Switch onCheckedChange={(checked) => handleToggle('Coverage Alerts', checked)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}

export default TestAdminPage;
