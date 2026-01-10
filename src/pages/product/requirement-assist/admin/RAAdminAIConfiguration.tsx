import React, { useEffect, useState } from 'react';
import { Bot, Settings, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useRAAISettings, useUpdateRAAISettings } from '@/hooks/requirement-assist';
import type { RAAISettings } from '@/types/requirement-assist';

export function RAAdminAIConfiguration() {
  const { data: settings, isLoading, error } = useRAAISettings();
  const updateSettings = useUpdateRAAISettings();
  
  // Local form state
  const [formData, setFormData] = useState<Partial<RAAISettings>>({
    ai_model: 'claude-3.5-sonnet',
    temperature: 0.7,
    max_tokens: 4000,
    system_prompt: '',
    auto_detect_language: true,
    compliance_validation: true,
    confidence_scoring: true,
    draft_auto_save: true,
  });
  
  const [isDirty, setIsDirty] = useState(false);

  // Sync form state with fetched settings
  useEffect(() => {
    if (settings) {
      setFormData({
        ai_model: settings.ai_model,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        system_prompt: settings.system_prompt || '',
        auto_detect_language: settings.auto_detect_language,
        compliance_validation: settings.compliance_validation,
        confidence_scoring: settings.confidence_scoring,
        draft_auto_save: settings.draft_auto_save,
      });
    }
  }, [settings]);

  const handleChange = (field: keyof RAAISettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!settings?.id) return;
    updateSettings.mutate({ id: settings.id, ...formData }, {
      onSuccess: () => setIsDirty(false),
    });
  };

  const handleCancel = () => {
    if (settings) {
      setFormData({
        ai_model: settings.ai_model,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        system_prompt: settings.system_prompt || '',
        auto_detect_language: settings.auto_detect_language,
        compliance_validation: settings.compliance_validation,
        confidence_scoring: settings.confidence_scoring,
        draft_auto_save: settings.draft_auto_save,
      });
      setIsDirty(false);
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        Failed to load AI settings. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="w-4 h-4 text-muted-foreground" /> Model Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : (
            <>
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-2 block">
                  AI Model
                </label>
                <Input 
                  value={formData.ai_model || ''} 
                  onChange={(e) => handleChange('ai_model', e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Model identifier (e.g., claude-3.5-sonnet, gpt-4-turbo)
                </p>
              </div>
              
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-2 block">
                  Temperature: {formData.temperature}
                </label>
                <Slider 
                  value={[formData.temperature || 0.7]} 
                  onValueChange={([val]) => handleChange('temperature', val)} 
                  min={0} 
                  max={1} 
                  step={0.1} 
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Higher values = more creative, lower = more focused
                </p>
              </div>
              
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-2 block">
                  Max Tokens
                </label>
                <Input 
                  type="number" 
                  value={formData.max_tokens || 4000}
                  onChange={(e) => handleChange('max_tokens', parseInt(e.target.value) || 4000)}
                />
              </div>
              
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-2 block">
                  System Prompt
                </label>
                <Textarea 
                  value={formData.system_prompt || ''} 
                  onChange={(e) => handleChange('system_prompt', e.target.value)}
                  className="min-h-[120px]" 
                  placeholder="You are a business analyst assistant..."
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" /> Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-sm">Auto-detect Arabic content</span>
                <Switch 
                  checked={formData.auto_detect_language}
                  onCheckedChange={(val) => handleChange('auto_detect_language', val)}
                />
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-sm">Enable compliance validation</span>
                <Switch 
                  checked={formData.compliance_validation}
                  onCheckedChange={(val) => handleChange('compliance_validation', val)}
                />
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-sm">Show confidence scores</span>
                <Switch 
                  checked={formData.confidence_scoring}
                  onCheckedChange={(val) => handleChange('confidence_scoring', val)}
                />
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm">Auto-save drafts</span>
                <Switch 
                  checked={formData.draft_auto_save}
                  onCheckedChange={(val) => handleChange('draft_auto_save', val)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={handleCancel}
          disabled={!isDirty || updateSettings.isPending}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          disabled={!isDirty || updateSettings.isPending || !settings?.id}
        >
          {updateSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
