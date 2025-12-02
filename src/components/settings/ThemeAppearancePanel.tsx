import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ThemePreferences, DEFAULT_THEME_PREFERENCES, ACCENT_COLOR_PRESETS } from '@/types/userSettings.types';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeAppearancePanelProps {
  settings: ThemePreferences;
  onSave: (settings: ThemePreferences) => void;
}

export function ThemeAppearancePanel({ settings, onSave }: ThemeAppearancePanelProps) {
  const [localSettings, setLocalSettings] = useState<ThemePreferences>(settings);

  const updateSettings = <K extends keyof ThemePreferences>(key: K, value: ThemePreferences[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => onSave(localSettings);
  const handleReset = () => setLocalSettings(DEFAULT_THEME_PREFERENCES);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Theme & Appearance</h2>
        <p className="text-sm text-muted-foreground">Customize how Catalyst Tests looks</p>
      </div>

      {/* Theme Mode */}
      <Card>
        <CardHeader><CardTitle className="text-base">Theme Mode</CardTitle></CardHeader>
        <CardContent>
          <RadioGroup value={localSettings.themeMode} onValueChange={(v) => updateSettings('themeMode', v as 'light' | 'dark' | 'auto')} className="grid grid-cols-3 gap-4">
            {[
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
              { value: 'auto', label: 'System', icon: Monitor },
            ].map((option) => {
              const Icon = option.icon;
              return (
                <Label key={option.value} htmlFor={`theme-${option.value}`} className={cn('flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-colors', localSettings.themeMode === option.value && 'border-brand-gold bg-brand-gold/10')}>
                  <RadioGroupItem value={option.value} id={`theme-${option.value}`} className="sr-only" />
                  <Icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{option.label}</span>
                </Label>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Accent Color */}
      <Card>
        <CardHeader><CardTitle className="text-base">Accent Color</CardTitle><CardDescription>Choose accent color for buttons, links, highlights</CardDescription></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLOR_PRESETS.map((preset) => (
              <button key={preset.value} onClick={() => updateSettings('accentColor', preset.value)} className={cn('w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all', localSettings.accentColor === preset.value ? 'border-foreground scale-110' : 'border-transparent')} style={{ backgroundColor: preset.value }} title={preset.name}>
                {localSettings.accentColor === preset.value && <Check className="h-5 w-5 text-white" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Font Size */}
      <Card>
        <CardHeader><CardTitle className="text-base">Font Size</CardTitle></CardHeader>
        <CardContent>
          <RadioGroup value={localSettings.fontSize} onValueChange={(v) => updateSettings('fontSize', v as ThemePreferences['fontSize'])} className="grid grid-cols-4 gap-3">
            {[
              { value: 'small', label: 'Small', size: '12px' },
              { value: 'medium', label: 'Medium', size: '14px' },
              { value: 'large', label: 'Large', size: '16px' },
              { value: 'extra_large', label: 'Extra Large', size: '18px' },
            ].map((option) => (
              <Label key={option.value} htmlFor={`font-${option.value}`} className={cn('flex flex-col items-center gap-1 p-3 border rounded-lg cursor-pointer', localSettings.fontSize === option.value && 'border-brand-gold bg-brand-gold/10')}>
                <RadioGroupItem value={option.value} id={`font-${option.value}`} className="sr-only" />
                <span style={{ fontSize: option.size }}>{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.size}</span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Density */}
      <Card>
        <CardHeader><CardTitle className="text-base">Density</CardTitle><CardDescription>Control spacing and padding of UI elements</CardDescription></CardHeader>
        <CardContent>
          <RadioGroup value={localSettings.density} onValueChange={(v) => updateSettings('density', v as ThemePreferences['density'])} className="grid grid-cols-3 gap-3">
            {['compact', 'comfortable', 'spacious'].map((option) => (
              <Label key={option} htmlFor={`density-${option}`} className={cn('text-center p-3 border rounded-lg cursor-pointer capitalize', localSettings.density === option && 'border-brand-gold bg-brand-gold/10')}>
                <RadioGroupItem value={option} id={`density-${option}`} className="sr-only" />
                {option}
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Animations */}
      <Card>
        <CardHeader><CardTitle className="text-base">Animations</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="animations-enabled">Enable animations</Label>
            <Switch id="animations-enabled" checked={localSettings.animationsEnabled} onCheckedChange={(c) => updateSettings('animationsEnabled', c)} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="reduce-motion">Reduce motion (accessibility)</Label>
            <Switch id="reduce-motion" checked={localSettings.reduceMotion} onCheckedChange={(c) => updateSettings('reduceMotion', c)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={handleReset}>Reset to Defaults</Button>
        <Button onClick={handleSave} className="bg-brand-gold hover:bg-brand-gold-hover text-white">Apply Theme</Button>
      </div>
    </div>
  );
}
