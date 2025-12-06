import { useState } from 'react';
import { useBusinessLines } from '@/hooks/useProductSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, GripVertical, Settings2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldsLayoutPanelProps {
  onChanges: () => void;
}

// Default tabs configuration
const DEFAULT_TABS = [
  { key: 'demand-details', name: 'Demand Details', is_required: true, is_active: true },
  { key: 'business-score', name: 'Business Score', is_required: false, is_active: true },
  { key: 'budget', name: 'Budget', is_required: false, is_active: true },
  { key: 'risks', name: 'Risks', is_required: false, is_active: true },
  { key: 'milestones', name: 'Milestones', is_required: false, is_active: true },
  { key: 'links', name: 'Links', is_required: false, is_active: true },
  { key: 'discussions', name: 'Discussions', is_required: false, is_active: true },
  { key: 'audit-history', name: 'Audit History', is_required: false, is_active: true },
];

// Default sections for Demand Details
const DEFAULT_SECTIONS = [
  { key: 'basic-info', name: 'Basic Information', is_required: true, is_visible: true, collapsed_by_default: false },
  { key: 'workflow', name: 'Workflow & Status', is_required: false, is_visible: true, collapsed_by_default: false },
  { key: 'delivery', name: 'Delivery Details', is_required: false, is_visible: true, collapsed_by_default: false },
  { key: 'stakeholders', name: 'Stakeholders', is_required: false, is_visible: true, collapsed_by_default: true },
];

// Default fields
const DEFAULT_FIELDS = [
  { key: 'summary', label: 'Summary', section: 'basic-info', is_system: true, is_required: true },
  { key: 'description', label: 'Description', section: 'basic-info', is_system: true, is_required: false },
  { key: 'department', label: 'Department', section: 'basic-info', is_system: false, is_required: true },
  { key: 'business_owner', label: 'Business Owner', section: 'stakeholders', is_system: false, is_required: true },
  { key: 'requestor', label: 'Requestor', section: 'stakeholders', is_system: false, is_required: false },
  { key: 'process_step', label: 'Process Step', section: 'workflow', is_system: true, is_required: true },
  { key: 'delivery_platform', label: 'Delivery Platform', section: 'delivery', is_system: false, is_required: false },
  { key: 'planned_quarter', label: 'Planned Quarter', section: 'delivery', is_system: false, is_required: false },
];

export function FieldsLayoutPanel({ onChanges }: FieldsLayoutPanelProps) {
  const { data: businessLines = [], isLoading } = useBusinessLines();
  const [selectedScope, setSelectedScope] = useState<string>('global');
  const [tabs, setTabs] = useState(DEFAULT_TABS);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [sectionsOpen, setSectionsOpen] = useState(false);

  const handleTabToggle = (tabKey: string) => {
    setTabs(tabs.map(tab => 
      tab.key === tabKey ? { ...tab, is_active: !tab.is_active } : tab
    ));
    onChanges();
  };

  const handleSectionToggle = (sectionKey: string, field: 'is_visible' | 'collapsed_by_default') => {
    setSections(sections.map(section =>
      section.key === sectionKey ? { ...section, [field]: !section[field] } : section
    ));
    onChanges();
  };

  const handleFieldToggle = (fieldKey: string, field: 'is_required') => {
    setFields(fields.map(f =>
      f.key === fieldKey ? { ...f, [field]: !f[field] } : f
    ));
    onChanges();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Fields & Layout</h2>
          <p className="text-sm text-muted-foreground">
            Configure tabs, sections, and fields for the Demand drawer.
          </p>
        </div>
      </div>

      {/* Scope Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Configuration Scope:</span>
        <Select value={selectedScope} onValueChange={setSelectedScope}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Global (All Business Lines)</SelectItem>
            {businessLines.map(line => (
              <SelectItem key={line.id} value={line.id}>
                {line.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs Configuration */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/30 px-4 py-3 border-b">
          <h3 className="font-medium">Drawer Tabs</h3>
          <p className="text-xs text-muted-foreground">Configure which tabs appear in the Demand drawer</p>
        </div>
        <div className="divide-y">
          {tabs.map((tab, index) => (
            <div key={tab.key} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <div className="flex-1 flex items-center gap-2">
                <span className="text-sm">{tab.name}</span>
                {tab.is_required && (
                  <Badge variant="secondary" className="text-xs">Required</Badge>
                )}
              </div>
              <Switch
                checked={tab.is_active}
                onCheckedChange={() => handleTabToggle(tab.key)}
                disabled={tab.is_required}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Sections Configuration */}
      <Collapsible open={sectionsOpen} onOpenChange={setSectionsOpen}>
        <div className="border rounded-lg overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full bg-muted/30 px-4 py-3 border-b flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div>
                <h3 className="font-medium text-left">Sections & Order (Demand Details)</h3>
                <p className="text-xs text-muted-foreground">Configure section visibility and collapse state</p>
              </div>
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform",
                sectionsOpen && "rotate-90"
              )} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="divide-y">
              {sections.map((section) => (
                <div key={section.key} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm">{section.name}</span>
                    {section.is_required && (
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Visible</span>
                      <Switch
                        checked={section.is_visible}
                        onCheckedChange={() => handleSectionToggle(section.key, 'is_visible')}
                        disabled={section.is_required}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Collapsed</span>
                      <Switch
                        checked={section.collapsed_by_default}
                        onCheckedChange={() => handleSectionToggle(section.key, 'collapsed_by_default')}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Fields Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/30 px-4 py-3 border-b">
          <h3 className="font-medium">Field Configuration</h3>
          <p className="text-xs text-muted-foreground">Configure field visibility and requirements</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/20">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Field</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Section</th>
              <th className="text-center px-4 py-2 font-medium text-muted-foreground">Active</th>
              <th className="text-center px-4 py-2 font-medium text-muted-foreground">Required</th>
              <th className="text-center px-4 py-2 font-medium text-muted-foreground">Rules</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {fields.map((field) => (
              <tr key={field.key} className="hover:bg-muted/10">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span>{field.label}</span>
                    {field.is_system && (
                      <Badge variant="outline" className="text-xs">System</Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {sections.find(s => s.key === field.section)?.name || field.section}
                </td>
                <td className="px-4 py-2 text-center">
                  <Switch
                    checked={true}
                    disabled={field.is_system}
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <Switch
                    checked={field.is_required}
                    onCheckedChange={() => handleFieldToggle(field.key, 'is_required')}
                    disabled={field.is_system && field.is_required}
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
