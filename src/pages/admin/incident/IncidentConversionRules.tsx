import { useState } from 'react';
import { RefreshCw, Lock, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ConversionRules {
  id: string;
  allowed_statuses: string[];
  allowed_target_types: string[];
  auto_lock_after_conversion: boolean;
}

const ALL_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'triage', label: 'Triage' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'to_committee', label: 'To Committee' },
];

const ALL_TARGET_TYPES = [
  { value: 'story', label: 'Story', description: 'Convert to a user story for sprint work' },
  { value: 'feature', label: 'Feature', description: 'Convert to a feature for roadmap planning' },
  { value: 'epic', label: 'Epic', description: 'Convert to an epic for large initiatives' },
  { value: 'business_request', label: 'Business Request', description: 'Convert to a business request for demand management' },
];

export default function IncidentConversionRules() {
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['incident-conversion-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_conversion_rules')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as ConversionRules | null;
    },
  });

  const handleToggleStatus = async (status: string) => {
    if (!rules) return;

    const newStatuses = rules.allowed_statuses.includes(status)
      ? rules.allowed_statuses.filter((s) => s !== status)
      : [...rules.allowed_statuses, status];

    try {
      const { error } = await supabase
        .from('incident_conversion_rules')
        .update({ allowed_statuses: newStatuses, updated_at: new Date().toISOString() })
        .eq('id', rules.id);

      if (error) throw error;
      toast.success('Conversion rules updated');
      queryClient.invalidateQueries({ queryKey: ['incident-conversion-rules'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update rules');
    }
  };

  const handleToggleTargetType = async (targetType: string) => {
    if (!rules) return;

    const newTypes = rules.allowed_target_types.includes(targetType)
      ? rules.allowed_target_types.filter((t) => t !== targetType)
      : [...rules.allowed_target_types, targetType];

    try {
      const { error } = await supabase
        .from('incident_conversion_rules')
        .update({ allowed_target_types: newTypes, updated_at: new Date().toISOString() })
        .eq('id', rules.id);

      if (error) throw error;
      toast.success('Conversion rules updated');
      queryClient.invalidateQueries({ queryKey: ['incident-conversion-rules'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update rules');
    }
  };

  const handleToggleAutoLock = async () => {
    if (!rules) return;

    try {
      const { error } = await supabase
        .from('incident_conversion_rules')
        .update({ 
          auto_lock_after_conversion: !rules.auto_lock_after_conversion,
          updated_at: new Date().toISOString() 
        })
        .eq('id', rules.id);

      if (error) throw error;
      toast.success('Conversion rules updated');
      queryClient.invalidateQueries({ queryKey: ['incident-conversion-rules'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update rules');
    }
  };

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="p-6">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Conversion Rules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure when and how incidents can be converted to other work items
          </p>
        </div>

        {/* Info Banner */}
        <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Conversion is only available for L3 (Delivery) level incidents. This cannot be changed.
          </p>
        </div>

        {rules ? (
          <>
            {/* Allowed Statuses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Statuses That Allow Conversion
                </CardTitle>
                <CardDescription>
                  Select which incident statuses permit conversion to other work items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {ALL_STATUSES.map((status) => (
                    <div
                      key={status.value}
                      className="flex items-center gap-3 rounded-lg border p-4"
                    >
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={rules.allowed_statuses.includes(status.value)}
                        onCheckedChange={() => handleToggleStatus(status.value)}
                      />
                      <Label htmlFor={`status-${status.value}`} className="cursor-pointer">
                        <Badge variant="outline" className="capitalize">
                          {status.label}
                        </Badge>
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Allowed Target Types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Allowed Target Work Item Types
                </CardTitle>
                <CardDescription>
                  Select which work item types incidents can be converted to
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ALL_TARGET_TYPES.map((type) => (
                    <div
                      key={type.value}
                      className="flex items-start gap-3 rounded-lg border p-4"
                    >
                      <Checkbox
                        id={`type-${type.value}`}
                        checked={rules.allowed_target_types.includes(type.value)}
                        onCheckedChange={() => handleToggleTargetType(type.value)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <Label htmlFor={`type-${type.value}`} className="cursor-pointer font-medium">
                          {type.label}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Auto-Lock Setting */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Post-Conversion Behavior
                </CardTitle>
                <CardDescription>
                  Configure what happens to the incident after conversion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Auto-lock after conversion</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      When enabled, incident fields become read-only after conversion to prevent further edits
                    </p>
                  </div>
                  <Switch
                    checked={rules.auto_lock_after_conversion}
                    onCheckedChange={handleToggleAutoLock}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No conversion rules configured</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminGuard>
  );
}
