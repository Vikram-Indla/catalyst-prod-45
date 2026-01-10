import React, { useState } from 'react';
import { MoreVertical, Eye, Copy, FileText, FileSpreadsheet, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GenerationHistoryItem } from './types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HistoryTableProps {
  data: GenerationHistoryItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onViewDetails: (item: GenerationHistoryItem) => void;
  onDuplicate: (item: GenerationHistoryItem) => void;
  onExportPdf: (item: GenerationHistoryItem) => void;
  onExportExcel: (item: GenerationHistoryItem) => void;
  onDelete: (item: GenerationHistoryItem) => void;
}

export function HistoryTable({
  data,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onViewDetails,
  onDuplicate,
  onExportPdf,
  onExportExcel,
  onDelete,
}: HistoryTableProps) {
  const allSelected = data.length > 0 && data.every((item) => selectedIds.has(item.id));

  // Format work items summary (PRD is NOT a work item)
  const formatItems = (items: GenerationHistoryItem['items'], status: GenerationHistoryItem['status']) => {
    const parts: string[] = [];
    // PRD removed - it's a background document, not a work item
    if (items.epics) parts.push(`${items.epics} Epic${items.epics !== 1 ? 's' : ''}`);
    if (items.features) parts.push(`${items.features} Feature${items.features !== 1 ? 's' : ''}`);
    if (items.stories) parts.push(`${items.stories} Stor${items.stories !== 1 ? 'ies' : 'y'}`);
    if (items.testCases) parts.push(`${items.testCases} Test${items.testCases !== 1 ? 's' : ''}`);
    
    if (parts.length === 0) {
      if (status === 'draft') return 'Processing...';
      if (status === 'failed') return 'Failed';
      return 'No work items';
    }
    
    return parts.join(' • ');
  };

  const getStatusBadge = (status: GenerationHistoryItem['status']) => {
    const styles = {
      published: 'bg-[#10b981]/10 text-[#10b981]',
      draft: 'bg-[#f59e0b]/10 text-[#f59e0b]',
      failed: 'bg-[#ef4444]/10 text-[#ef4444]',
    };
    return styles[status];
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-lg mx-5 overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
            <th className="p-3.5 text-left w-10">
              <button
                onClick={onToggleSelectAll}
                className={cn(
                  'w-[18px] h-[18px] border-2 rounded flex items-center justify-center transition-colors',
                  allSelected
                    ? 'bg-[#2563eb] border-[#2563eb] text-white'
                    : 'border-[#cbd5e1] hover:border-[#2563eb]'
                )}
              >
                {allSelected && <Check className="w-2.5 h-2.5" />}
              </button>
            </th>
            <th className="p-3.5 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wide">
              ID
            </th>
            <th className="p-3.5 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wide">
              Title
            </th>
            <th className="p-3.5 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wide">
              Status
            </th>
            <th className="p-3.5 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wide">
              Items
            </th>
            <th className="p-3.5 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wide">
              Author
            </th>
            <th className="p-3.5 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wide">
              Created
            </th>
            <th className="p-3.5 text-left w-12"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <tr
                key={item.id}
                className={cn(
                  'border-b border-[#e2e8f0] last:border-b-0 transition-colors',
                  isSelected ? 'bg-[#2563eb]/[0.04]' : 'hover:bg-[#f8fafc]'
                )}
              >
                <td className="p-3.5">
                  <button
                    onClick={() => onToggleSelect(item.id)}
                    className={cn(
                      'w-[18px] h-[18px] border-2 rounded flex items-center justify-center transition-colors',
                      isSelected
                        ? 'bg-[#2563eb] border-[#2563eb] text-white'
                        : 'border-[#cbd5e1] hover:border-[#2563eb]'
                    )}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5" />}
                  </button>
                </td>
                <td className="p-3.5">
                  <span className="font-mono text-[13px] text-[#64748b]">{item.id}</span>
                </td>
                <td className="p-3.5">
                  <button
                    onClick={() => onViewDetails(item)}
                    className="font-medium text-[#2563eb] hover:underline text-left"
                  >
                    {item.title}
                  </button>
                </td>
                <td className="p-3.5">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize',
                      getStatusBadge(item.status)
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {item.status}
                  </span>
                </td>
                <td className="p-3.5">
                  <span className="text-[13px] text-[#475569]">{formatItems(item.items, item.status)}</span>
                </td>
                <td className="p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#818cf8] to-[#c084fc] flex items-center justify-center text-white text-[11px] font-semibold">
                      {item.author.initial}
                    </div>
                    <span className="text-[13px] text-[#475569]">{item.author.name}</span>
                  </div>
                </td>
                <td className="p-3.5">
                  <span className="text-[13px] text-[#64748b]">{item.date}</span>
                </td>
                <td className="p-3.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-8 h-8 flex items-center justify-center rounded-md text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => onViewDetails(item)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(item)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExportPdf(item)}>
                        <FileText className="w-4 h-4 mr-2" />
                        Export PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExportExcel(item)}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Export Excel
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(item)}
                        className="text-[#ef4444] focus:text-[#ef4444]"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
