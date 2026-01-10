import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { 
  useRAComplianceRulesGrouped, 
  useToggleRAComplianceRule 
} from '@/hooks/requirement-assist';
import type { ComplianceFramework, RAComplianceRule } from '@/types/requirement-assist';

const frameworkInfo: Record<ComplianceFramework, { name: string; description: string; color: string }> = {
  dga: { 
    name: 'DGA', 
    description: 'Digital Government Authority Standards',
    color: 'bg-blue-100 text-blue-700'
  },
  nca: { 
    name: 'NCA', 
    description: 'National Cybersecurity Authority Requirements',
    color: 'bg-red-100 text-red-700'
  },
  babok: { 
    name: 'BABOK', 
    description: 'Business Analysis Body of Knowledge Guidelines',
    color: 'bg-purple-100 text-purple-700'
  },
};

export function RAAdminCompliance() {
  const { data: groupedRules, isLoading, error } = useRAComplianceRulesGrouped();
  const toggleRule = useToggleRAComplianceRule();
  
  const [expandedFrameworks, setExpandedFrameworks] = useState<ComplianceFramework[]>(['dga', 'nca', 'babok']);

  const toggleFramework = (framework: ComplianceFramework) => {
    setExpandedFrameworks(prev => 
      prev.includes(framework) 
        ? prev.filter(f => f !== framework)
        : [...prev, framework]
    );
  };

  const handleToggleRule = (rule: RAComplianceRule) => {
    toggleRule.mutate({ id: rule.id, is_active: !rule.is_active });
  };

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        Failed to load compliance rules. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Compliance Frameworks</h2>
        <p className="text-sm text-muted-foreground">
          Enable or disable compliance rules that will be applied during requirement generation.
        </p>
      </div>

      {isLoading ? (
        <>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </>
      ) : groupedRules && (
        Object.entries(frameworkInfo).map(([key, info]) => {
          const framework = key as ComplianceFramework;
          const rules = groupedRules[framework] || [];
          const activeCount = rules.filter(r => r.is_active).length;
          const isExpanded = expandedFrameworks.includes(framework);

          return (
            <Card key={framework}>
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleFramework(framework)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn("px-2 py-0.5 rounded text-xs font-bold", info.color)}>
                          {info.name}
                        </span>
                        <CardTitle className="text-sm">{info.description}</CardTitle>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {activeCount}/{rules.length} active
                  </span>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0">
                  {rules.length === 0 ? (
                    <div className="py-4 text-center text-muted-foreground text-sm">
                      No rules configured for this framework.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {rules.map((rule) => (
                        <div 
                          key={rule.id} 
                          className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground">
                                {rule.rule_code}
                              </span>
                              <span className="text-sm font-medium">{rule.rule_name}</span>
                            </div>
                            {rule.rule_description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {rule.rule_description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {toggleRule.isPending && toggleRule.variables?.id === rule.id && (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            )}
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={() => handleToggleRule(rule)}
                              disabled={toggleRule.isPending}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
