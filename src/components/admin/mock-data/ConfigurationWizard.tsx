/**
 * Configuration Wizard - Configure entity counts
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings2, Target, Truck, Calendar, AlertTriangle, Building2, Loader2, Play } from 'lucide-react';
import { MockRun, RunConfig } from '@/hooks/useMockDataRuns';

interface ConfigurationWizardProps {
  run: MockRun;
  onSaveConfig: (config: RunConfig) => Promise<void>;
  onGeneratePreview: () => Promise<void>;
  isLoading: boolean;
}

interface EntityConfigProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  max?: number;
}

function EntityConfig({ label, value, onChange, enabled, onToggle, max = 100 }: EntityConfigProps) {
  return (
    <div className="flex items-center gap-4 py-2">
      <Checkbox
        checked={enabled}
        onCheckedChange={(checked) => onToggle(!!checked)}
        id={label.toLowerCase().replace(/\s/g, '-')}
      />
      <Label 
        htmlFor={label.toLowerCase().replace(/\s/g, '-')}
        className={`flex-1 text-sm ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}
      >
        {label}
      </Label>
      <Input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        disabled={!enabled}
        className="w-20 text-center"
      />
    </div>
  );
}

export function ConfigurationWizard({ run, onSaveConfig, onGeneratePreview, isLoading }: ConfigurationWizardProps) {
  const [config, setConfig] = useState<RunConfig>({
    strategy: { themes: 0, objectives: 0, keyResults: 0 },
    delivery: { epics: 0, features: 0, stories: 0, tasks: 0 },
    release: { releases: 0, releaseWindows: 0 },
    quality: { incidents: 0, defects: 0 },
    structure: { program: '', project: '' },
  });

  const [enabled, setEnabled] = useState({
    themes: false,
    objectives: false,
    keyResults: false,
    epics: false,
    features: false,
    stories: false,
    tasks: false,
    releases: false,
    releaseWindows: false,
    incidents: false,
    defects: false,
    program: true,
    project: false,
  });

  useEffect(() => {
    if (run.config_json && Object.keys(run.config_json).length > 0) {
      setConfig(run.config_json as RunConfig);
      // Enable fields that have values
      const newEnabled = { ...enabled };
      if (run.config_json.strategy) {
        newEnabled.themes = (run.config_json.strategy.themes || 0) > 0;
        newEnabled.objectives = (run.config_json.strategy.objectives || 0) > 0;
        newEnabled.keyResults = (run.config_json.strategy.keyResults || 0) > 0;
      }
      if (run.config_json.delivery) {
        newEnabled.epics = (run.config_json.delivery.epics || 0) > 0;
        newEnabled.features = (run.config_json.delivery.features || 0) > 0;
        newEnabled.stories = (run.config_json.delivery.stories || 0) > 0;
        newEnabled.tasks = (run.config_json.delivery.tasks || 0) > 0;
      }
      setEnabled(newEnabled);
    }
  }, [run.config_json]);

  const handleSave = async () => {
    await onSaveConfig(config);
  };

  const updateStrategy = (key: keyof NonNullable<RunConfig['strategy']>, value: number) => {
    setConfig(prev => ({
      ...prev,
      strategy: { ...prev.strategy, [key]: value },
    }));
  };

  const updateDelivery = (key: keyof NonNullable<RunConfig['delivery']>, value: number) => {
    setConfig(prev => ({
      ...prev,
      delivery: { ...prev.delivery, [key]: value },
    }));
  };

  const updateRelease = (key: keyof NonNullable<RunConfig['release']>, value: number) => {
    setConfig(prev => ({
      ...prev,
      release: { ...prev.release, [key]: value },
    }));
  };

  const updateQuality = (key: keyof NonNullable<RunConfig['quality']>, value: number) => {
    setConfig(prev => ({
      ...prev,
      quality: { ...prev.quality, [key]: value },
    }));
  };

  const updateStructure = (key: keyof NonNullable<RunConfig['structure']>, value: string) => {
    setConfig(prev => ({
      ...prev,
      structure: { ...prev.structure, [key]: value },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Structure */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Structure
            </CardTitle>
            <CardDescription className="text-xs">Program & Project setup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={enabled.program}
                  onCheckedChange={(checked) => setEnabled(prev => ({ ...prev, program: !!checked }))}
                  id="program"
                />
                <Label htmlFor="program" className="text-sm">Program (mandatory)</Label>
              </div>
              <Input
                placeholder="Program name"
                value={config.structure?.program || ''}
                onChange={(e) => updateStructure('program', e.target.value)}
                disabled={!enabled.program}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={enabled.project}
                  onCheckedChange={(checked) => setEnabled(prev => ({ ...prev, project: !!checked }))}
                  id="project"
                />
                <Label htmlFor="project" className="text-sm">Project (optional)</Label>
              </div>
              <Input
                placeholder="Project name"
                value={config.structure?.project || ''}
                onChange={(e) => updateStructure('project', e.target.value)}
                disabled={!enabled.project}
              />
            </div>
          </CardContent>
        </Card>

        {/* Strategy */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Strategy
            </CardTitle>
            <CardDescription className="text-xs">Themes, Objectives, Key Results</CardDescription>
          </CardHeader>
          <CardContent>
            <EntityConfig
              label="Themes"
              value={config.strategy?.themes || 0}
              onChange={(v) => updateStrategy('themes', v)}
              enabled={enabled.themes}
              onToggle={(e) => setEnabled(prev => ({ ...prev, themes: e }))}
            />
            <EntityConfig
              label="Objectives"
              value={config.strategy?.objectives || 0}
              onChange={(v) => updateStrategy('objectives', v)}
              enabled={enabled.objectives}
              onToggle={(e) => setEnabled(prev => ({ ...prev, objectives: e }))}
            />
            <EntityConfig
              label="Key Results"
              value={config.strategy?.keyResults || 0}
              onChange={(v) => updateStrategy('keyResults', v)}
              enabled={enabled.keyResults}
              onToggle={(e) => setEnabled(prev => ({ ...prev, keyResults: e }))}
            />
          </CardContent>
        </Card>

        {/* Delivery */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4 text-primary" />
              Delivery
            </CardTitle>
            <CardDescription className="text-xs">Epics, Features, Stories, Tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <EntityConfig
              label="Epics"
              value={config.delivery?.epics || 0}
              onChange={(v) => updateDelivery('epics', v)}
              enabled={enabled.epics}
              onToggle={(e) => setEnabled(prev => ({ ...prev, epics: e }))}
            />
            <EntityConfig
              label="Features"
              value={config.delivery?.features || 0}
              onChange={(v) => updateDelivery('features', v)}
              enabled={enabled.features}
              onToggle={(e) => setEnabled(prev => ({ ...prev, features: e }))}
            />
            <EntityConfig
              label="Stories"
              value={config.delivery?.stories || 0}
              onChange={(v) => updateDelivery('stories', v)}
              enabled={enabled.stories}
              onToggle={(e) => setEnabled(prev => ({ ...prev, stories: e }))}
            />
            <EntityConfig
              label="Tasks/Subtasks"
              value={config.delivery?.tasks || 0}
              onChange={(v) => updateDelivery('tasks', v)}
              enabled={enabled.tasks}
              onToggle={(e) => setEnabled(prev => ({ ...prev, tasks: e }))}
            />
          </CardContent>
        </Card>

        {/* Release */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" />
              Release
            </CardTitle>
            <CardDescription className="text-xs">Releases & Windows</CardDescription>
          </CardHeader>
          <CardContent>
            <EntityConfig
              label="Releases"
              value={config.release?.releases || 0}
              onChange={(v) => updateRelease('releases', v)}
              enabled={enabled.releases}
              onToggle={(e) => setEnabled(prev => ({ ...prev, releases: e }))}
            />
            <EntityConfig
              label="Release Windows"
              value={config.release?.releaseWindows || 0}
              onChange={(v) => updateRelease('releaseWindows', v)}
              enabled={enabled.releaseWindows}
              onToggle={(e) => setEnabled(prev => ({ ...prev, releaseWindows: e }))}
            />
          </CardContent>
        </Card>

        {/* Quality */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Quality
            </CardTitle>
            <CardDescription className="text-xs">Incidents & Defects</CardDescription>
          </CardHeader>
          <CardContent>
            <EntityConfig
              label="Incidents"
              value={config.quality?.incidents || 0}
              onChange={(v) => updateQuality('incidents', v)}
              enabled={enabled.incidents}
              onToggle={(e) => setEnabled(prev => ({ ...prev, incidents: e }))}
            />
            <EntityConfig
              label="Defects"
              value={config.quality?.defects || 0}
              onChange={(v) => updateQuality('defects', v)}
              enabled={enabled.defects}
              onToggle={(e) => setEnabled(prev => ({ ...prev, defects: e }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} variant="outline" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings2 className="mr-2 h-4 w-4" />}
          Save Configuration
        </Button>
        <Button onClick={onGeneratePreview} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Generate Preview
        </Button>
      </div>
    </div>
  );
}
