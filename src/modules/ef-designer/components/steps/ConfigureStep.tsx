import React, { useState, useEffect } from 'react';
import { EFDSession } from '../../types/efd.types';
import { useUpdateSessionConfig } from '../../hooks/useEFDMutations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Palette, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const ConfigureStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const [themeId, setThemeId] = useState<string | null>(session.theme_id);
  const [brId, setBrId] = useState<string | null>(session.business_request_id);
  const updateConfig = useUpdateSessionConfig();

  // Fetch strategic themes - using strategy_snapshots as themes source
  const { data: themes = [], isLoading: themesLoading } = useQuery({
    queryKey: ['strategic-themes'],
    queryFn: async (): Promise<Array<{id: string; name: string; description: string | null}>> => {
      const { data, error } = await supabase
        .from('strategy_snapshots')
        .select('id, name, description')
        .eq('status', 'ACTIVE')
        .order('name');
      if (error) return [];
      return data || [];
    },
  });

  // Fetch business requests
  const { data: businessRequests = [], isLoading: brLoading } = useQuery({
    queryKey: ['business-requests-for-efd'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, title, request_key')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return [];
      return data;
    },
  });

  const handleSave = () => {
    updateConfig.mutate({
      sessionId: session.id,
      themeId: themeId || null,
      businessRequestId: brId || null,
    });
  };

  const hasChanges = themeId !== session.theme_id || brId !== session.business_request_id;
  const isConfigured = !!themeId;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Configure Session</h2>
        <p className="text-muted-foreground">
          Link this session to a Strategic Theme and optionally a Business Request
        </p>
      </div>

      {isConfigured && !hasChanges && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-700">Configuration saved</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Strategic Theme */}
        <div className="border rounded-xl p-6 bg-card">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-5 w-5 text-violet-500" />
            <h3 className="font-semibold">Strategic Theme</h3>
            <span className="text-xs text-red-500 font-medium">Required</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Select the strategic theme this work aligns with
          </p>
          <Select 
            value={themeId || ''} 
            onValueChange={(val) => setThemeId(val || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a theme..." />
            </SelectTrigger>
            <SelectContent>
              {themesLoading ? (
                <div className="p-2 text-center text-muted-foreground">Loading...</div>
              ) : themes.length === 0 ? (
                <div className="p-2 text-center text-muted-foreground">No themes available</div>
              ) : (
                themes.map((theme: any) => (
                  <SelectItem key={theme.id} value={theme.id}>
                    {theme.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {themeId && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              {(themes.find((t) => t.id === themeId) as any)?.description || ''}
            </p>
          )}
        </div>

        {/* Business Request */}
        <div className="border rounded-xl p-6 bg-card">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold">Business Request</h3>
            <span className="text-xs text-muted-foreground">Optional</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Link to an existing business request for traceability
          </p>
          <Select 
            value={brId || 'none'} 
            onValueChange={(val) => setBrId(val === 'none' ? null : val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="— No Business Request —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— No Business Request —</SelectItem>
              {brLoading ? (
                <div className="p-2 text-center text-muted-foreground">Loading...</div>
              ) : (
                businessRequests.map((br: any) => (
                  <SelectItem key={br.id} value={br.id}>
                    {br.request_key ? `${br.request_key}: ` : ''}{br.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="border rounded-xl p-6 bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Generation Settings</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm">Epic Grouping Strategy</Label>
            <Select defaultValue="business_capability">
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business_capability">By Business Capability</SelectItem>
                <SelectItem value="user_journey">By User Journey</SelectItem>
                <SelectItem value="technical_domain">By Technical Domain</SelectItem>
                <SelectItem value="auto">Auto-detect</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Feature Granularity</Label>
            <Select defaultValue="medium">
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fine">Fine (more features)</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="coarse">Coarse (fewer features)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Language</Label>
            <Select defaultValue="en">
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabic</SelectItem>
                <SelectItem value="both">Both (Bilingual)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Configuration
          </Button>
        </div>
      )}
    </div>
  );
};
