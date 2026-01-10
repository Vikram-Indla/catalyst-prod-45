import React, { useState } from 'react';
import { Landmark, Lock, BookOpen, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ComplianceRule {
  id: string;
  name: string;
  enabled: boolean;
}

interface ComplianceSection {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  activeCount: number;
  totalCount: number;
  masterEnabled: boolean;
  rules: ComplianceRule[];
}

const initialSections: ComplianceSection[] = [
  {
    id: 'dga',
    name: 'DGA Standards 2025',
    subtitle: 'Digital Government Authority requirements',
    icon: Landmark,
    activeCount: 12,
    totalCount: 12,
    masterEnabled: true,
    rules: [
      { id: 'dga-1', name: 'Data classification', enabled: true },
      { id: 'dga-2', name: 'Access control', enabled: true },
      { id: 'dga-3', name: 'Audit logging', enabled: true },
      { id: 'dga-4', name: 'Arabic language support', enabled: true },
    ],
  },
  {
    id: 'nca',
    name: 'NCA ECC-2:2018',
    subtitle: 'National Cybersecurity Authority controls',
    icon: Lock,
    activeCount: 8,
    totalCount: 8,
    masterEnabled: true,
    rules: [
      { id: 'nca-1', name: 'Security classification', enabled: true },
      { id: 'nca-2', name: 'Data protection', enabled: true },
      { id: 'nca-3', name: 'Incident response', enabled: true },
    ],
  },
  {
    id: 'babok',
    name: 'BABOK v3',
    subtitle: 'Business Analysis Body of Knowledge',
    icon: BookOpen,
    activeCount: 6,
    totalCount: 6,
    masterEnabled: true,
    rules: [
      { id: 'babok-1', name: 'Requirement structure validation', enabled: true },
      { id: 'babok-2', name: 'Traceability requirements', enabled: true },
    ],
  },
];

export default function RAAdminCompliance() {
  const [sections, setSections] = useState<ComplianceSection[]>(initialSections);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleMasterToggle = (sectionId: string, enabled: boolean) => {
    setSections(prev => prev.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          masterEnabled: enabled,
          rules: section.rules.map(rule => ({ ...rule, enabled })),
          activeCount: enabled ? section.totalCount : 0,
        };
      }
      return section;
    }));
    toast.success(enabled ? 'Enabled' : 'Disabled');
  };

  const handleRuleToggle = (sectionId: string, ruleId: string, enabled: boolean) => {
    setSections(prev => prev.map(section => {
      if (section.id === sectionId) {
        const updatedRules = section.rules.map(rule => 
          rule.id === ruleId ? { ...rule, enabled } : rule
        );
        const activeCount = updatedRules.filter(r => r.enabled).length;
        return {
          ...section,
          rules: updatedRules,
          activeCount,
          masterEnabled: activeCount > 0,
        };
      }
      return section;
    }));
    toast.success(enabled ? 'Enabled' : 'Disabled');
  };

  return (
    <div className="p-6 space-y-6 bg-[#f8fafc] min-h-full">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#0f172a]">Compliance</h1>
        <p className="text-sm text-[#64748b] mt-1">Configure compliance rules and validation standards</p>
      </div>

      {/* Compliance Rules Card */}
      <Card className="bg-white border-[#e2e8f0]">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-[#0f172a]">Compliance Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSections.has(section.id);
            
            return (
              <Collapsible 
                key={section.id} 
                open={isExpanded}
                onOpenChange={() => toggleSection(section.id)}
              >
                <div className="border border-[#e2e8f0] rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#f8fafc] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#2563eb]/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-[#2563eb]" />
                        </div>
                        <div>
                          <div className="font-medium text-[#0f172a]">{section.name}</div>
                          <div className="text-sm text-[#64748b]">{section.subtitle}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-[#64748b]">{section.activeCount} rules active</span>
                        <Switch 
                          checked={section.masterEnabled}
                          onCheckedChange={(checked) => handleMasterToggle(section.id, checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <ChevronDown className={cn(
                          'w-5 h-5 text-[#64748b] transition-transform',
                          isExpanded && 'rotate-180'
                        )} />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-[#e2e8f0] bg-[#f8fafc]">
                      {section.rules.map((rule, index) => (
                        <div 
                          key={rule.id}
                          className={cn(
                            'flex items-center justify-between px-4 py-3 pl-16',
                            index < section.rules.length - 1 && 'border-b border-[#e2e8f0]'
                          )}
                        >
                          <span className="text-sm text-[#475569]">{rule.name}</span>
                          <Switch 
                            checked={rule.enabled}
                            onCheckedChange={(checked) => handleRuleToggle(section.id, rule.id, checked)}
                          />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
