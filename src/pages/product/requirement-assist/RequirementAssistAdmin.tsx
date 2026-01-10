import React, { useState } from 'react';
import { Bot, FileText, Shield, Globe, BarChart3, Users, AlertTriangle, Settings, Pen, Eye, ToggleLeft, Check, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const adminTabs = [
  { id: 'ai', label: 'AI Configuration', icon: Bot },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'compliance', label: 'Compliance Rules', icon: Shield },
  { id: 'translation', label: 'Translation', icon: Globe },
  { id: 'analytics', label: 'Usage & Analytics', icon: BarChart3 },
  { id: 'roles', label: 'Roles & Access', icon: Users },
];

export default function RequirementAssistAdmin() {
  const [activeTab, setActiveTab] = useState('ai');
  const [temperature, setTemperature] = useState([0.7]);

  return (
    <div className="flex h-full">
      {/* Warning Banner */}
      <div className="fixed top-[108px] left-[220px] right-0 z-10 flex items-center gap-3 px-6 py-3.5 bg-amber-50 border-b border-amber-200 text-amber-700 text-[13px]">
        <AlertTriangle className="w-4 h-4" />
        <strong>Admin access required.</strong> Changes made here affect all users of Requirement Assist.
      </div>

      {/* Admin Sidebar */}
      <div className="w-[200px] bg-card border-r pt-[52px] flex-shrink-0">
        <div className="p-2">
          {adminTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] transition-colors mb-1",
                activeTab === tab.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Admin Content */}
      <div className="flex-1 p-6 pt-[76px] overflow-auto">
        {activeTab === 'ai' && (
          <div className="space-y-4 max-w-3xl">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Bot className="w-4 h-4 text-muted-foreground" /> Model Settings</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="text-[13px] font-medium text-muted-foreground mb-2 block">AI Model</label>
                  <Input defaultValue="GPT-4 Turbo" disabled />
                  <p className="text-xs text-muted-foreground mt-1.5">Model is managed by system administrators</p>
                </div>
                <div>
                  <label className="text-[13px] font-medium text-muted-foreground mb-2 block">Temperature: {temperature[0]}</label>
                  <Slider value={temperature} onValueChange={setTemperature} min={0} max={1} step={0.1} />
                  <p className="text-xs text-muted-foreground mt-1.5">Higher values = more creative, lower = more focused</p>
                </div>
                <div>
                  <label className="text-[13px] font-medium text-muted-foreground mb-2 block">Max Tokens</label>
                  <Input type="number" defaultValue={4000} />
                </div>
                <div>
                  <label className="text-[13px] font-medium text-muted-foreground mb-2 block">System Prompt</label>
                  <Textarea defaultValue="You are a business analyst assistant..." className="min-h-[120px]" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Settings className="w-4 h-4 text-muted-foreground" /> Features</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Auto-detect Arabic content', enabled: true },
                  { label: 'Enable compliance validation', enabled: true },
                  { label: 'Show confidence scores', enabled: true },
                  { label: 'Enable batch operations', enabled: false },
                ].map((feature, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                    <span className="text-sm">{feature.label}</span>
                    <Switch defaultChecked={feature.enabled} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button variant="outline">Cancel</Button>
              <Button>Save Changes</Button>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">Templates</CardTitle>
              <Button size="sm"><FileText className="w-4 h-4 mr-2" /> Add Template</Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead><tr className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-3 text-left font-semibold">Template</th>
                  <th className="p-3 text-left font-semibold w-24">Type</th>
                  <th className="p-3 text-left font-semibold w-24">Version</th>
                  <th className="p-3 text-left font-semibold w-24">Status</th>
                  <th className="p-3 text-left font-semibold w-28">Actions</th>
                </tr></thead>
                <tbody>
                  {[
                    { name: 'Ministry PRD Template', type: 'PRD', version: 'v3.2', status: 'active' },
                    { name: 'SAFe Epic Template', type: 'Epic', version: 'v2.0', status: 'active' },
                    { name: 'SAFe Feature Template', type: 'Feature', version: 'v2.0', status: 'active' },
                    { name: 'Gherkin Story Template', type: 'Story', version: 'v1.5', status: 'active' },
                    { name: 'Test Case Template', type: 'Test', version: 'v0.1', status: 'draft' },
                  ].map((t, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3 font-medium">{t.name}</td>
                      <td className="p-3 text-sm">{t.type}</td>
                      <td className="p-3 text-sm">{t.version}</td>
                      <td className="p-3"><span className={cn("px-2 py-1 rounded text-xs font-medium", t.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-muted text-muted-foreground')}>{t.status}</span></td>
                      <td className="p-3"><div className="flex gap-1"><Button variant="ghost" size="sm"><Pen className="w-4 h-4" /></Button><Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button><Button variant="ghost" size="sm"><ToggleLeft className="w-4 h-4" /></Button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4">
              {[
                { value: '247', label: 'Total Generations', change: '↑ 12%' },
                { value: '1,847', label: 'Items Created', change: '↑ 8%' },
                { value: '847K', label: 'Tokens Used', change: '42%' },
                { value: '34s', label: 'Avg Generation Time', change: '↓ 5%' },
                { value: '94.3%', label: 'Success Rate', change: '↑ 2%' },
              ].map((stat, i) => (
                <Card key={i} className="p-5">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-[13px] text-muted-foreground mt-1">{stat.label}</div>
                  <div className={cn("text-xs mt-2", stat.change.startsWith('↑') ? 'text-emerald-600' : stat.change.startsWith('↓') ? 'text-red-500' : 'text-muted-foreground')}>{stat.change}</div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
