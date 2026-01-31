import { useState, useEffect } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Cpu, Loader2, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { usePlanHubAIConfig, useUpdatePlanHubAIConfig, useTestAIConnection, PlanHubAIFeaturesEnabled } from '@/hooks/planhub';

const AI_MODELS = [
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' },
];

export default function PlanHubAIConfigPage() {
  const { data: config, isLoading } = usePlanHubAIConfig();
  const updateConfig = useUpdatePlanHubAIConfig();
  const testConnection = useTestAIConnection();

  const [model, setModel] = useState('gemini-1.5-flash');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [apiKey, setApiKey] = useState('');
  const [features, setFeatures] = useState<PlanHubAIFeaturesEnabled>({
    assistant_enabled: true,
    suggestions_enabled: true,
    risk_analysis_enabled: true,
    critical_path_enabled: true,
    report_generation_enabled: true,
  });

  // Initialize local state when data loads
  useEffect(() => {
    if (config) {
      setModel(config.model);
      setTemperature(config.temperature);
      setMaxTokens(config.max_tokens);
      setFeatures(config.features_enabled);
    }
  }, [config]);

  const handleSave = () => {
    updateConfig.mutate({
      model,
      temperature,
      max_tokens: maxTokens,
      api_key_encrypted: apiKey || config?.api_key_encrypted || null,
      features_enabled: features,
    });
  };

  const handleTestConnection = () => {
    testConnection.mutate();
  };

  const updateFeature = (key: keyof PlanHubAIFeaturesEnabled, value: boolean) => {
    setFeatures({ ...features, [key]: value });
  };

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="h-full w-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminGuard>
    );
  }

  // Determine connection status (mock for now)
  const isConnected = config?.api_key_encrypted !== null;

  return (
    <AdminGuard>
      <div className="h-full w-full flex flex-col bg-background">
        <div className="h-[72px] border-b bg-card flex-shrink-0">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 flex-shrink-0">
                <Cpu className="h-5 w-5 text-brand-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">AI Configuration</h1>
                <p className="text-sm text-muted-foreground truncate">
                  Configure Lovable AI integration for PlanHub™
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button 
                variant="outline" 
                onClick={handleTestConnection}
                disabled={testConnection.isPending}
              >
                {testConnection.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                Test Connection
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={updateConfig.isPending}
                className="bg-brand-primary hover:bg-brand-primary-hover"
              >
                {updateConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Connection Status */}
            <div className={`rounded-lg border p-4 flex items-center gap-3 ${
              isConnected 
                ? 'border-green-500/30 bg-green-500/10' 
                : 'border-yellow-500/30 bg-yellow-500/10'
            }`}>
              {isConnected ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">Connected</p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      AI assistant is configured and ready to use
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Not Configured</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Configure the API settings below to enable AI features
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* API Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>
                  Configure the AI model settings for PlanHub assistant
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key (Optional - Uses Lovable AI by default)</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={config?.api_key_encrypted ? '••••••••••••••••' : 'Leave blank to use Lovable AI'}
                  />
                  <p className="text-xs text-muted-foreground">
                    PlanHub uses Lovable AI by default. Only provide a custom key if you need to override.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger id="model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_MODELS.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature ({temperature})</Label>
                    <Input
                      id="temperature"
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="cursor-pointer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-tokens">Max Tokens</Label>
                    <Input
                      id="max-tokens"
                      type="number"
                      min={256}
                      max={8192}
                      step={256}
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Features */}
            <Card>
              <CardHeader>
                <CardTitle>AI Features</CardTitle>
                <CardDescription>
                  Enable or disable specific AI-powered features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>AI Assistant</Label>
                    <p className="text-sm text-muted-foreground">
                      Chat interface for plan questions and guidance
                    </p>
                  </div>
                  <Switch 
                    checked={features.assistant_enabled}
                    onCheckedChange={(v) => updateFeature('assistant_enabled', v)} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>AI-Powered Suggestions</Label>
                    <p className="text-sm text-muted-foreground">
                      Recommend resources and timeline optimizations
                    </p>
                  </div>
                  <Switch 
                    checked={features.suggestions_enabled}
                    onCheckedChange={(v) => updateFeature('suggestions_enabled', v)} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Risk Analysis</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically identify and assess project risks
                    </p>
                  </div>
                  <Switch 
                    checked={features.risk_analysis_enabled}
                    onCheckedChange={(v) => updateFeature('risk_analysis_enabled', v)} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Critical Path Analysis</Label>
                    <p className="text-sm text-muted-foreground">
                      Calculate and highlight critical path dependencies
                    </p>
                  </div>
                  <Switch 
                    checked={features.critical_path_enabled}
                    onCheckedChange={(v) => updateFeature('critical_path_enabled', v)} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Report Generation</Label>
                    <p className="text-sm text-muted-foreground">
                      AI-generated executive summaries and reports
                    </p>
                  </div>
                  <Switch 
                    checked={features.report_generation_enabled}
                    onCheckedChange={(v) => updateFeature('report_generation_enabled', v)} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
