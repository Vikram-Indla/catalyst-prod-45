import React, { useState } from 'react';
import { Bot, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const aiModels = [
  { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-4o', label: 'GPT-4o' },
];

const defaultSystemPrompt = `You are CATY, an AI-powered business analyst assistant for the Ministry of Industry and Mineral Resources. Your role is to help generate high-quality requirements documentation including PRDs, Epics, Features, and User Stories.

Follow these guidelines:
- Generate content that aligns with DGA and NCA compliance standards
- Use clear, professional language suitable for government documentation
- Include Arabic translations when requested
- Structure requirements using SAFe methodology`;

const featureToggles = [
  { 
    id: 'auto-translation', 
    label: 'Auto-translation', 
    description: 'Automatically translate requirements between English and Arabic',
    defaultEnabled: true 
  },
  { 
    id: 'compliance-validation', 
    label: 'Compliance Validation', 
    description: 'Validate all generated items against DGA and NCA standards',
    defaultEnabled: true 
  },
  { 
    id: 'confidence-scoring', 
    label: 'Confidence Scoring', 
    description: 'Show confidence scores for generated items',
    defaultEnabled: true 
  },
  { 
    id: 'draft-auto-save', 
    label: 'Draft Auto-save', 
    description: 'Automatically save drafts every 30 seconds',
    defaultEnabled: true 
  },
];

export default function RAAdminAIConfiguration() {
  const [selectedModel, setSelectedModel] = useState('claude-3.5-sonnet');
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([4000]);
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    featureToggles.forEach(t => {
      initial[t.id] = t.defaultEnabled;
    });
    return initial;
  });

  const handleToggleChange = (id: string, checked: boolean) => {
    setToggleStates(prev => ({ ...prev, [id]: checked }));
    toast.success(checked ? 'Enabled' : 'Disabled');
  };

  const handleSaveChanges = () => {
    toast.success('Settings saved');
  };

  const handleResetToDefault = () => {
    setSystemPrompt(defaultSystemPrompt);
    toast.success('System prompt reset to default');
  };

  return (
    <div className="p-6 space-y-6 bg-[#f8fafc] min-h-full">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#0f172a]">AI Configuration</h1>
        <p className="text-sm text-[#64748b] mt-1">Configure AI model settings and behavior for Requirement Assist</p>
      </div>

      {/* Model Settings Card */}
      <Card className="bg-white border-[#e2e8f0]">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-[#0f172a] flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#64748b]" />
            Model Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            {/* AI Model */}
            <div>
              <label className="text-sm font-medium text-[#0f172a] mb-2 block">AI Model</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aiModels.map(model => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Temperature */}
            <div>
              <label className="text-sm font-medium text-[#0f172a] mb-2 flex items-center justify-between">
                Temperature
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-[#2563eb]/10 text-[#2563eb]">
                  {temperature[0].toFixed(1)}
                </span>
              </label>
              <Slider 
                value={temperature} 
                onValueChange={setTemperature} 
                min={0} 
                max={1} 
                step={0.1}
                className="mt-3"
              />
              <p className="text-xs text-[#64748b] mt-1.5">0.0 = focused, 1.0 = creative</p>
            </div>

            {/* Max Tokens */}
            <div>
              <label className="text-sm font-medium text-[#0f172a] mb-2 flex items-center justify-between">
                Max Tokens
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-[#2563eb]/10 text-[#2563eb]">
                  {maxTokens[0]}
                </span>
              </label>
              <Slider 
                value={maxTokens} 
                onValueChange={setMaxTokens} 
                min={1000} 
                max={8000} 
                step={500}
                className="mt-3"
              />
              <p className="text-xs text-[#64748b] mt-1.5">1000 - 8000 tokens</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Prompt Card */}
      <Card className="bg-white border-[#e2e8f0]">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-[#0f172a]">Custom System Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter your custom system prompt..."
            className="min-h-[180px] text-sm"
          />
          <p className="text-xs text-[#64748b]">This prompt is prepended to all generation requests</p>
          <div className="flex gap-3 justify-end pt-2">
            <Button 
              variant="outline" 
              onClick={handleResetToDefault}
              className="text-[#475569]"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Default
            </Button>
            <Button 
              onClick={handleSaveChanges}
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
            >
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles Card */}
      <Card className="bg-white border-[#e2e8f0]">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-[#0f172a]">Feature Toggles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {featureToggles.map((toggle, index) => (
              <div 
                key={toggle.id} 
                className={`flex items-center justify-between py-4 ${index < featureToggles.length - 1 ? 'border-b border-[#e2e8f0]' : ''}`}
              >
                <div>
                  <div className="text-sm font-medium text-[#0f172a]">{toggle.label}</div>
                  <div className="text-xs text-[#64748b] mt-0.5">{toggle.description}</div>
                </div>
                <Switch 
                  checked={toggleStates[toggle.id]} 
                  onCheckedChange={(checked) => handleToggleChange(toggle.id, checked)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
