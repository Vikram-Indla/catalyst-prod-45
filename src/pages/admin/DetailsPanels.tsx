import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Details Panels Settings Page - Display and require fields per work item type
 * Source: Administration guide PDF, Page 12-13
 */
export default function DetailsPanels() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Details Panels Settings</h1>
          <p className="text-muted-foreground mt-2">
            Customize field settings on work items. Specify visible/required fields per portfolio and work item type.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Field Configuration</CardTitle>
            <CardDescription>
              Supported work items: Themes, Capabilities, Epics, Features, Stories, Tasks, Defects, Test Cases, Objectives, Dependencies, Risks, Success Criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              TODO: Portfolio dropdown, Work Item dropdown, tabs for multiple panels, Active/Required toggles, Add Custom Field button, Restore Defaults button, Save button (needs confirmation - source: pg 12-13)
            </p>
            <p className="text-xs text-muted-foreground">
              Custom field types: Custom Text Input (up to 2), Custom Dropdown (up to 3), Custom Text Area (1), Custom Multi Dropdown (up to 2). Custom fields identified by gear icon.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
