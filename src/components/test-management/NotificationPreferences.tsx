import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useTestNotificationPreferences } from '@/hooks/useTestNotificationPreferences';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function NotificationPreferences() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useTestNotificationPreferences();
  const [localPrefs, setLocalPrefs] = React.useState({
    notify_on_test_failure: true,
    notify_on_cycle_complete: true,
    daily_test_summary: false,
    weekly_test_report: false,
  });

  React.useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        notify_on_test_failure: preferences.notify_on_test_failure ?? true,
        notify_on_cycle_complete: preferences.notify_on_cycle_complete ?? true,
        daily_test_summary: preferences.daily_test_summary ?? false,
        weekly_test_report: preferences.weekly_test_report ?? false,
      });
    }
  }, [preferences]);

  const handleSave = () => {
    updatePreferences(localPrefs, {
      onSuccess: () => {
        toast.success('Notification preferences saved');
      },
      onError: (error) => {
        toast.error('Failed to save preferences');
        console.error('Error saving preferences:', error);
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
        <CardDescription>
          Manage your test execution notification preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notify-failure" className="text-base">
              Test Execution Failures
            </Label>
            <p className="text-sm text-muted-foreground">
              Notify me when my test execution fails
            </p>
          </div>
          <Switch
            id="notify-failure"
            checked={localPrefs.notify_on_test_failure}
            onCheckedChange={(checked) =>
              setLocalPrefs({ ...localPrefs, notify_on_test_failure: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notify-cycle" className="text-base">
              Test Cycle Complete
            </Label>
            <p className="text-sm text-muted-foreground">
              Notify me when a test cycle completes
            </p>
          </div>
          <Switch
            id="notify-cycle"
            checked={localPrefs.notify_on_cycle_complete}
            onCheckedChange={(checked) =>
              setLocalPrefs({ ...localPrefs, notify_on_cycle_complete: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="daily-summary" className="text-base">
              Daily Summary
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive daily summary of test results
            </p>
          </div>
          <Switch
            id="daily-summary"
            checked={localPrefs.daily_test_summary}
            onCheckedChange={(checked) =>
              setLocalPrefs({ ...localPrefs, daily_test_summary: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="weekly-report" className="text-base">
              Weekly Coverage Report
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive weekly test coverage analysis
            </p>
          </div>
          <Switch
            id="weekly-report"
            checked={localPrefs.weekly_test_report}
            onCheckedChange={(checked) =>
              setLocalPrefs({ ...localPrefs, weekly_test_report: checked })
            }
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={isUpdating}
          className="w-full bg-brand-gold hover:bg-brand-gold-hover text-white"
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
