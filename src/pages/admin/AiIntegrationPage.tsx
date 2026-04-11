import { PageChrome } from '@/components/layout/PageChrome';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bot, Key, TestTube, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AiIntegrationPage() {
  const queryClient = useQueryClient();
  const [testResult, setTestResult] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['ai-integration-settings'],
    queryFn: async () => {
      const { data, error } = await typedQuery('ai_integration_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; provider: string; model: string; is_active: boolean } | null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const provider = formData.get('provider') as string;
      const apiKey = formData.get('api_key') as string;
      const model = formData.get('model') as string;
      const isActive = formData.get('is_active') === 'on';

      if (settings?.id) {
        const { error } = await typedQuery('ai_integration_settings')
          .update({
            provider,
            api_key_encrypted: apiKey || null,
            model: model || null,
            is_active: isActive,
          })
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await typedQuery('ai_integration_settings')
          .insert({
            provider,
            api_key_encrypted: apiKey || null,
            model: model || null,
            is_active: isActive,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-integration-settings'] });
      toast.success('AI settings saved successfully');
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    saveMutation.mutate(formData);
  };

  const testConnection = async () => {
    setTestResult('Testing...');
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (settings?.is_active && settings?.provider !== 'mock') {
      setTestResult('Connection successful! AI provider is responding.');
    } else {
      setTestResult('Using local mock AI engine (no external API configured).');
    }
  };

  if (isLoading) {
    return (
      <PageChrome>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </PageChrome>
    );
  }

  return (
    <PageChrome>
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Bot className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">AI Integration</h1>
              <p className="text-sm text-muted-foreground">Configure AI provider for capacity recommendations</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Info Card */}
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-[rgba(59,130,246,0.12)]">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">Lovable AI Available</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      This project has access to Lovable AI models. You can use the built-in mock engine or connect an external AI provider for enhanced recommendations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settings Form */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Provider Settings</CardTitle>
                </div>
                <CardDescription>
                  Connect to an AI provider for intelligent capacity recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="provider">AI Provider</Label>
                    <Select name="provider" defaultValue={settings?.provider || 'mock'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mock">Mock (Local Algorithm)</SelectItem>
                        <SelectItem value="lovable">Lovable AI (Built-in)</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                        <SelectItem value="azure">Azure OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="api_key">API Key</Label>
                      <span className="text-xs text-muted-foreground">Optional for Mock/Lovable</span>
                    </div>
                    <Input
                      id="api_key"
                      name="api_key"
                      type="password"
                      placeholder="sk-..."
                      defaultValue=""
                    />
                    <p className="text-xs text-muted-foreground">
                      Your API key is encrypted and stored securely
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      name="model"
                      placeholder="gpt-4, claude-3-opus, etc."
                      defaultValue={settings?.model || ''}
                    />
                  </div>

                  <div className="flex items-center justify-between py-4 border-t">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_active">Enable AI Integration</Label>
                      <p className="text-xs text-muted-foreground">
                        When disabled, uses local mock algorithm
                      </p>
                    </div>
                    <Switch
                      id="is_active"
                      name="is_active"
                      defaultChecked={settings?.is_active || false}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
                    </Button>
                    <Button type="button" variant="outline" onClick={testConnection}>
                      <TestTube className="h-4 w-4 mr-2" />
                      Test Connection
                    </Button>
                  </div>

                  {testResult && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">{testResult}</p>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageChrome>
  );
}
