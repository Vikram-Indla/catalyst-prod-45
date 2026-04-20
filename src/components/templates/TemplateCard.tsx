/**
 * TemplateCard Component
 * Individual template card with actions
 * Catalyst V5 Design System
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  RefreshCw, 
  Zap, 
  UserCheck, 
  Settings, 
  MoreHorizontal,
  Play,
  Pencil,
  Copy,
  Trash2,
  Clock,
  TestTube,
  Calendar,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { CycleTemplate, TemplateType, TemplateConfig } from '@/types/template.types';
import { TEMPLATE_TYPES } from '@/types/template.types';

interface TemplateCardProps {
  template: CycleTemplate;
  onApply: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onView: () => void;
}

// Infer template type from config
function inferTemplateType(config: TemplateConfig): TemplateType {
  if (config.testCriteria.tags?.includes('smoke')) return 'smoke';
  if (config.testCriteria.tags?.includes('uat')) return 'uat';
  if (config.testCriteria.types?.some(t => ['functional', 'integration'].includes(t))) return 'regression';
  return 'custom';
}

// Get icon component for template type
function getTypeIcon(type: TemplateType) {
  switch (type) {
    case 'regression': return RefreshCw;
    case 'smoke': return Zap;
    case 'uat': return UserCheck;
    default: return Settings;
  }
}

export function TemplateCard({
  template,
  onApply,
  onEdit,
  onDuplicate,
  onDelete,
  onView,
}: TemplateCardProps) {
  const config = template.config as TemplateConfig;
  const templateType = inferTemplateType(config);
  const typeInfo = TEMPLATE_TYPES[templateType];
  const TypeIcon = getTypeIcon(templateType);
  
  const isSystemTemplate = template.is_global;
  
  return (
    <Card 
      className={`
        group cursor-pointer transition-all duration-200
        hover:shadow-md hover:border-slate-300
        ${isSystemTemplate ? 'bg-[#eff6ff] border-[#dbeafe]' : 'bg-white border-slate-200'}
      `}
      onClick={onView}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: typeInfo.bgColor }}
            >
              <TypeIcon className="w-5 h-5" style={{ color: typeInfo.color }} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 truncate text-sm">
                {template.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Lozenge appearance="default">
                  {typeInfo.label}
                </Lozenge>
                {isSystemTemplate && (
                  <Lozenge appearance="inprogress">
                    System
                  </Lozenge>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions dropdown - stop propagation */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onApply(); }}>
                <Play className="w-4 h-4 mr-2" />
                Apply Template
              </DropdownMenuItem>
              {!isSystemTemplate && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              {!isSystemTemplate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Description */}
        <p className="text-sm text-slate-600 line-clamp-2 mb-4 min-h-[40px]">
          {template.description || 'No description provided'}
        </p>
        
        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
          <div className="flex items-center gap-1.5">
            <TestTube className="w-3.5 h-3.5" />
            <span>{template.matching_tests_count || 0} tests</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{config.defaultDurationDays} days</span>
          </div>
          {template.last_used_at && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Used {formatDistanceToNow(new Date(template.last_used_at), { addSuffix: true })}</span>
            </div>
          )}
        </div>
        
        {/* Footer - Usage and Apply button */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            {template.usage_count || 0} uses
          </span>
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); onApply(); }}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Apply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
