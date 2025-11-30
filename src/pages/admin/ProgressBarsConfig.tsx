import { useState } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Save, Plus, Trash2, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Progress Bars Configuration Page
 * Source: Administration guide PDF, Page 22
 */
export default function ProgressBarsConfig() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Mock progress bar configurations
  const progressBars = [
    {
      id: '1',
      entity: 'Epic',
      type: 'Story Points',
      calculation: 'Accepted / Total',
      showPercentage: true,
      colors: { low: '#ef4444', medium: '#f59e0b', high: '#22c55e' },
      enabled: true,
    },
    {
      id: '2',
      entity: 'Feature',
      type: 'Completion',
      calculation: 'Done / Total Work Items',
      showPercentage: true,
      colors: { low: '#ef4444', medium: '#f59e0b', high: '#22c55e' },
      enabled: true,
    },
    {
      id: '3',
      entity: 'Program Increment',
      type: 'Feature Progress',
      calculation: 'Accepted Features / Total Features',
      showPercentage: true,
      colors: { low: '#ef4444', medium: '#f59e0b', high: '#22c55e' },
      enabled: true,
    },
    {
      id: '4',
      entity: 'Sprint',
      type: 'Story Points Completion',
      calculation: 'Completed Points / Committed Points',
      showPercentage: true,
      colors: { low: '#ef4444', medium: '#f59e0b', high: '#22c55e' },
      enabled: false,
    },
  ];

  const handleSave = () => {
    toast({
      title: 'Settings Saved',
      description: 'Progress bar configurations have been updated.',
    });
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-brand-gold" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Progress Bars</h1>
              <p className="text-muted-foreground mt-2">
                Configure progress bar calculations and display settings
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddDialog(true)}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
            <Button
              onClick={handleSave}
              className="bg-brand-gold hover:bg-brand-gold-hover"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Progress Bar Configurations */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Bar Settings</CardTitle>
            <CardDescription>
              Configure how progress bars are calculated and displayed across work items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {progressBars.map((config) => (
                <div
                  key={config.id}
                  className="border rounded-lg p-4 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{config.entity} - {config.type}</h3>
                        <Switch checked={config.enabled} />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Calculation: {config.calculation}
                      </p>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Entity Type</Label>
                          <Select defaultValue={config.entity.toLowerCase()}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="epic">Epic</SelectItem>
                              <SelectItem value="feature">Feature</SelectItem>
                              <SelectItem value="story">Story</SelectItem>
                              <SelectItem value="sprint">Sprint</SelectItem>
                              <SelectItem value="pi">Program Increment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Progress Type</Label>
                          <Select defaultValue={config.type.toLowerCase().replace(' ', '-')}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="story-points">Story Points</SelectItem>
                              <SelectItem value="completion">Completion</SelectItem>
                              <SelectItem value="feature-progress">Feature Progress</SelectItem>
                              <SelectItem value="work-items">Work Items</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3 mt-4">
                        <div className="space-y-2">
                          <Label>Low Threshold Color</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={config.colors.low}
                              className="w-20 h-10"
                            />
                            <span className="text-sm text-muted-foreground">0-33%</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Medium Threshold Color</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={config.colors.medium}
                              className="w-20 h-10"
                            />
                            <span className="text-sm text-muted-foreground">34-66%</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>High Threshold Color</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={config.colors.high}
                              className="w-20 h-10"
                            />
                            <span className="text-sm text-muted-foreground">67-100%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-4">
                        <div className="flex items-center gap-2">
                          <Switch checked={config.showPercentage} />
                          <Label>Show Percentage</Label>
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Calculation Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Calculation Rules</CardTitle>
            <CardDescription>
              Define how progress is calculated for different work item types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium mb-2">Epic Progress:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                  <li>Story Points: Sum of accepted story points / Total story points in child features</li>
                  <li>Feature Count: Completed features / Total features</li>
                  <li>Updates automatically when child items change status</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Feature Progress:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                  <li>Story Points: Sum of done story points / Total story points in child stories</li>
                  <li>Story Count: Done stories / Total stories</li>
                  <li>Calculated based on story state transitions</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">PI Progress:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                  <li>Feature Progress: Accepted features / Total planned features</li>
                  <li>Objective Progress: Completed objectives / Total objectives</li>
                  <li>Weighted by business value if configured</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
            <CardDescription>
              Configure how progress bars appear in the UI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Show progress bars in list views</p>
                  <p className="text-sm text-muted-foreground">Display inline progress indicators in tables and lists</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Animate progress changes</p>
                  <p className="text-sm text-muted-foreground">Smooth transitions when progress values update</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Show numeric values</p>
                  <p className="text-sm text-muted-foreground">Display actual numbers alongside percentage</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Color coding by health</p>
                  <p className="text-sm text-muted-foreground">Use red/yellow/green based on progress thresholds</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
