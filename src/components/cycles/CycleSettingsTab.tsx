/**
 * CATALYST TESTS - Cycle Settings Tab
 * Lock scope, Auto-close, Email notifications, Custom fields
 */

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Bell, CheckCircle2, Settings2 } from 'lucide-react';

interface CycleSettingsTabProps {
  form: UseFormReturn<any>;
}

export function CycleSettingsTab({ form }: CycleSettingsTabProps) {
  const { watch, setValue } = form;

  return (
    <div className="space-y-4">
      {/* Scope Lock */}
      <Card className="border-border">
        <CardHeader className="py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-gold/10">
              <Lock className="h-4 w-4 text-brand-gold" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm font-medium">Lock Scope After Start</CardTitle>
              <CardDescription className="text-xs">
                Prevent adding or removing test cases once execution begins
              </CardDescription>
            </div>
            <Switch
              checked={watch('scope_locked')}
              onCheckedChange={(checked) => setValue('scope_locked', checked)}
            />
          </div>
        </CardHeader>
        {watch('scope_locked') && (
          <CardContent className="py-3 pt-0">
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              When enabled, the cycle scope will automatically lock when the first test execution starts.
              You can manually unlock later if needed.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Auto-close */}
      <Card className="border-border">
        <CardHeader className="py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm font-medium">Auto-Close on Completion</CardTitle>
              <CardDescription className="text-xs">
                Automatically close the cycle when all cases are executed
              </CardDescription>
            </div>
            <Switch
              checked={watch('auto_close_on_completion')}
              onCheckedChange={(checked) => setValue('auto_close_on_completion', checked)}
            />
          </div>
        </CardHeader>
        {watch('auto_close_on_completion') && (
          <CardContent className="py-3 pt-0">
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              The cycle will automatically transition to "Completed" status when all test cases
              have been executed (regardless of pass/fail status).
            </p>
          </CardContent>
        )}
      </Card>

      {/* Email Notifications */}
      <Card className="border-border">
        <CardHeader className="py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Bell className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm font-medium">Email Notifications</CardTitle>
              <CardDescription className="text-xs">
                Send email updates about cycle progress and completion
              </CardDescription>
            </div>
            <Switch
              checked={watch('email_notifications')}
              onCheckedChange={(checked) => setValue('email_notifications', checked)}
            />
          </div>
        </CardHeader>
        {watch('email_notifications') && (
          <CardContent className="py-3 pt-0">
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded space-y-1">
              <p>Notifications will be sent for:</p>
              <ul className="list-disc list-inside pl-2 space-y-0.5">
                <li>Cycle started</li>
                <li>50% completion milestone</li>
                <li>Cycle completed</li>
                <li>Critical failures detected</li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Custom Fields Preview */}
      <Card className="border-border border-dashed">
        <CardHeader className="py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Custom Fields
              </CardTitle>
              <CardDescription className="text-xs">
                Configure additional cycle-specific fields
              </CardDescription>
            </div>
            <span className="text-xs text-muted-foreground">Coming Soon</span>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
