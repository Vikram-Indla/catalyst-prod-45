// ============================================================
// IDEAS ADMIN SETTINGS PAGE
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Settings,
  Shield,
  Users,
  Bell,
  Palette,
  Sliders,
  Save,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

export default function IdeasAdminSettingsPage() {
  const navigate = useNavigate();
  const [hasChanges, setHasChanges] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    // General
    allowAnonymousSubmissions: true,
    requireApprovalForPublic: true,
    autoAssignToInitiative: false,
    maxIdeasPerUser: 10,
    
    // Voting
    votingEnabled: true,
    allowMultipleVotes: false,
    showVoteCountPublicly: true,
    
    // Scoring
    requireMinimumScores: true,
    minimumScoreThreshold: 3,
    autoApproveHighScore: false,
    highScoreThreshold: 80,
    
    // Notifications
    notifyOnNewIdea: true,
    notifyOnStatusChange: true,
    notifyOnComment: true,
    weeklyDigestEnabled: false,
  });

  const handleSettingChange = (key: string, value: unknown) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // In production, this would save to the database
    toast.success('Settings saved successfully');
    setHasChanges(false);
  };

  const handleReset = () => {
    // Reset to defaults
    setHasChanges(false);
    toast.info('Settings reset to defaults');
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Ideas Module Settings
            </h1>
            <p className="text-muted-foreground">
              Configure how the improvement ideas module works
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="gap-2">
            <Sliders className="h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger value="scoring" className="gap-2">
            <Palette className="h-4 w-4" /> Scoring
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Shield className="h-4 w-4" /> Permissions
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic configuration for idea submissions and visibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Anonymous Submissions</Label>
                  <p className="text-sm text-muted-foreground">
                    Let users submit ideas without revealing their identity
                  </p>
                </div>
                <Switch
                  checked={settings.allowAnonymousSubmissions}
                  onCheckedChange={(v) => handleSettingChange('allowAnonymousSubmissions', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Approval for Public Ideas</Label>
                  <p className="text-sm text-muted-foreground">
                    New ideas must be approved before becoming visible to all users
                  </p>
                </div>
                <Switch
                  checked={settings.requireApprovalForPublic}
                  onCheckedChange={(v) => handleSettingChange('requireApprovalForPublic', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-assign to Initiative</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically assign new ideas to matching initiatives based on category
                  </p>
                </div>
                <Switch
                  checked={settings.autoAssignToInitiative}
                  onCheckedChange={(v) => handleSettingChange('autoAssignToInitiative', v)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Maximum Ideas Per User (per month)</Label>
                <p className="text-sm text-muted-foreground">
                  Limit how many ideas a user can submit per month (0 = unlimited)
                </p>
                <Input
                  type="number"
                  min={0}
                  value={settings.maxIdeasPerUser}
                  onChange={(e) => handleSettingChange('maxIdeasPerUser', parseInt(e.target.value) || 0)}
                  className="w-32"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Voting Configuration</CardTitle>
              <CardDescription>
                Configure how users can vote on ideas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Voting</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to vote on ideas
                  </p>
                </div>
                <Switch
                  checked={settings.votingEnabled}
                  onCheckedChange={(v) => handleSettingChange('votingEnabled', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Multiple Votes</Label>
                  <p className="text-sm text-muted-foreground">
                    Let users vote on the same idea multiple times
                  </p>
                </div>
                <Switch
                  checked={settings.allowMultipleVotes}
                  onCheckedChange={(v) => handleSettingChange('allowMultipleVotes', v)}
                  disabled={!settings.votingEnabled}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Vote Counts Publicly</Label>
                  <p className="text-sm text-muted-foreground">
                    Display vote counts to all users (not just admins)
                  </p>
                </div>
                <Switch
                  checked={settings.showVoteCountPublicly}
                  onCheckedChange={(v) => handleSettingChange('showVoteCountPublicly', v)}
                  disabled={!settings.votingEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scoring Settings */}
        <TabsContent value="scoring" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Scoring Configuration</CardTitle>
              <CardDescription>
                Configure the scoring and evaluation process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Minimum Scores</Label>
                  <p className="text-sm text-muted-foreground">
                    Ideas must receive a minimum number of scores before being processed
                  </p>
                </div>
                <Switch
                  checked={settings.requireMinimumScores}
                  onCheckedChange={(v) => handleSettingChange('requireMinimumScores', v)}
                />
              </div>

              {settings.requireMinimumScores && (
                <div className="space-y-2">
                  <Label>Minimum Score Count</Label>
                  <Input
                    type="number"
                    min={1}
                    value={settings.minimumScoreThreshold}
                    onChange={(e) => handleSettingChange('minimumScoreThreshold', parseInt(e.target.value) || 1)}
                    className="w-32"
                  />
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-approve High Scores</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically approve ideas that exceed the high score threshold
                  </p>
                </div>
                <Switch
                  checked={settings.autoApproveHighScore}
                  onCheckedChange={(v) => handleSettingChange('autoApproveHighScore', v)}
                />
              </div>

              {settings.autoApproveHighScore && (
                <div className="space-y-2">
                  <Label>High Score Threshold</Label>
                  <p className="text-sm text-muted-foreground">
                    Ideas with a calculated score above this value will be auto-approved
                  </p>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={settings.highScoreThreshold}
                    onChange={(e) => handleSettingChange('highScoreThreshold', parseInt(e.target.value) || 80)}
                    className="w-32"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Settings */}
        <TabsContent value="permissions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>
                Configure what each role can do in the ideas module
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {[
                  { role: 'Admin', permissions: ['Submit', 'View All', 'Score', 'Approve', 'Delete', 'Configure'] },
                  { role: 'Manager', permissions: ['Submit', 'View All', 'Score', 'Approve'] },
                  { role: 'Team Lead', permissions: ['Submit', 'View Team', 'Score'] },
                  { role: 'Member', permissions: ['Submit', 'View Own'] },
                ].map(({ role, permissions }) => (
                  <div key={role} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{role}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {permissions.map(perm => (
                        <Badge key={perm} variant="secondary">{perm}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Role permissions are configured globally. Contact your system administrator to make changes.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure when notifications are sent for idea activities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify on New Idea</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications when new ideas are submitted
                  </p>
                </div>
                <Switch
                  checked={settings.notifyOnNewIdea}
                  onCheckedChange={(v) => handleSettingChange('notifyOnNewIdea', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify on Status Change</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications when idea status changes
                  </p>
                </div>
                <Switch
                  checked={settings.notifyOnStatusChange}
                  onCheckedChange={(v) => handleSettingChange('notifyOnStatusChange', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notify on Comment</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications when comments are added to ideas
                  </p>
                </div>
                <Switch
                  checked={settings.notifyOnComment}
                  onCheckedChange={(v) => handleSettingChange('notifyOnComment', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Digest</Label>
                  <p className="text-sm text-muted-foreground">
                    Send a weekly summary of idea activities
                  </p>
                </div>
                <Switch
                  checked={settings.weeklyDigestEnabled}
                  onCheckedChange={(v) => handleSettingChange('weeklyDigestEnabled', v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
