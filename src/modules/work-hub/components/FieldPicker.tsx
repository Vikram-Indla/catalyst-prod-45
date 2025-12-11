import React, { useState } from 'react';
import { Plus, Search, Check, Calendar, Type, List, Tag, User, Hash, FileText } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FieldOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  category?: string;
}

const ALL_FIELDS: FieldOption[] = [
  { id: 'actualEnd', label: 'Actual end - تاريخ النهاية الفعلية', icon: <Calendar className="h-4 w-4" />, category: 'Dates' },
  { id: 'actualStart', label: 'Actual start - تاريخ البداية الفعلية', icon: <Calendar className="h-4 w-4" />, category: 'Dates' },
  { id: 'assessmentFeature', label: 'Assessment Feature', icon: <FileText className="h-4 w-4" />, category: 'Custom' },
  { id: 'confluenceItems', label: 'Confluence items', icon: <FileText className="h-4 w-4" />, category: 'Links' },
  { id: 'fixVersions', label: 'Fix versions', icon: <Tag className="h-4 w-4" />, category: 'Versions' },
  { id: 'gapClassification', label: 'Gap Classification', icon: <List className="h-4 w-4" />, category: 'Custom' },
  { id: 'reporter', label: 'Reporter', icon: <User className="h-4 w-4" />, category: 'People' },
  { id: 'storyPoints', label: 'Story Points', icon: <Hash className="h-4 w-4" />, category: 'Estimation' },
  { id: 'sprint', label: 'Sprint', icon: <List className="h-4 w-4" />, category: 'Agile' },
  { id: 'epic', label: 'Epic Link', icon: <FileText className="h-4 w-4" />, category: 'Links' },
  { id: 'parent', label: 'Parent', icon: <FileText className="h-4 w-4" />, category: 'Links' },
  { id: 'resolution', label: 'Resolution', icon: <Type className="h-4 w-4" />, category: 'Status' },
  { id: 'environment', label: 'Environment', icon: <Type className="h-4 w-4" />, category: 'Details' },
  { id: 'description', label: 'Description', icon: <FileText className="h-4 w-4" />, category: 'Details' },
  { id: 'components', label: 'Components', icon: <List className="h-4 w-4" />, category: 'Details' },
];

interface FieldPickerProps {
  visibleFields: string[];
  onToggleField: (fieldId: string) => void;
}

export function FieldPicker({ visibleFields, onToggleField }: FieldPickerProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filteredFields = ALL_FIELDS.filter(f =>
    f.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <th className="w-10 px-2 py-2 border-b border-[#DFE1E6] cursor-pointer hover:bg-[#F4F5F7]">
          <Plus className="h-4 w-4 text-[#6B778C]" />
        </th>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0 bg-white border border-[#DFE1E6] shadow-lg rounded-[3px]">
        <div className="p-2 border-b border-[#DFE1E6]">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B778C]" />
            <Input
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-[13px] bg-[#F4F5F7] border-transparent rounded-[3px] focus:border-[#4C9AFF] focus:bg-white"
            />
          </div>
        </div>
        <div className="p-1 max-h-64 overflow-auto">
          <div className="px-2 py-1 text-[11px] font-semibold text-[#6B778C] uppercase">All fields</div>
          {filteredFields.map((field) => {
            const isVisible = visibleFields.includes(field.id);
            return (
              <button
                key={field.id}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-[#172B4D] rounded-[3px] hover:bg-[#F4F5F7] text-left",
                  isVisible && "bg-[#E9F2FF]"
                )}
                onClick={() => {
                  onToggleField(field.id);
                }}
              >
                {field.icon}
                <span className="flex-1 truncate">{field.label}</span>
                {isVisible && <Check className="h-4 w-4 text-[#0052CC]" />}
              </button>
            );
          })}
        </div>
        <div className="p-2 border-t border-[#DFE1E6]">
          <button className="flex items-center gap-1 text-[13px] text-[#0052CC] hover:underline">
            <span>⚙</span>
            Configure fields in fields configuration
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
