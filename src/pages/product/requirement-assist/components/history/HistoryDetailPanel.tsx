import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, ChevronDown, CheckCircle, Wand2, Copy, FileText, FileSpreadsheet, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GenerationHistoryItem } from './types';

interface HistoryDetailPanelProps {
  item: GenerationHistoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenInWizard: (item: GenerationHistoryItem) => void;
  onDuplicate: (item: GenerationHistoryItem) => void;
  onExportPdf: (item: GenerationHistoryItem) => void;
  onExportExcel: (item: GenerationHistoryItem) => void;
  onDelete: (item: GenerationHistoryItem) => void;
}

// Work item types only - PRD is a background document, not a work item
type ItemType = 'epic' | 'feature' | 'story' | 'test_case';

export function HistoryDetailPanel({
  item,
  isOpen,
  onClose,
  onOpenInWizard,
  onDuplicate,
  onExportPdf,
  onExportExcel,
  onDelete,
}: HistoryDetailPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<ItemType>>(new Set());

  // Handle Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const toggleGroup = (type: ItemType) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const getStatusBadge = (status: GenerationHistoryItem['status']) => {
    const styles = {
      published: 'bg-[#10b981]/10 text-[#10b981]',
      draft: 'bg-[#f59e0b]/10 text-[#f59e0b]',
      failed: 'bg-[#ef4444]/10 text-[#ef4444]',
    };
    return styles[status];
  };

  const getTypeBadgeStyle = (type: ItemType) => {
    const styles = {
      epic: 'bg-[#7c3aed]/10 text-[#7c3aed]',
      feature: 'bg-[#0d9488]/10 text-[#0d9488]',
      story: 'bg-[#10b981]/10 text-[#10b981]',
      test_case: 'bg-[#f59e0b]/10 text-[#f59e0b]',
    };
    return styles[type];
  };

  const getTypeLabel = (type: ItemType) => {
    const labels = {
      epic: 'Epics',
      feature: 'Features',
      story: 'Stories',
      test_case: 'Test Cases',
    };
    return labels[type];
  };

  // Group items by type
  const groupedItems = item?.generatedItems?.reduce(
    (acc, genItem) => {
      if (!acc[genItem.type]) acc[genItem.type] = [];
      acc[genItem.type].push(genItem);
      return acc;
    },
    {} as Record<ItemType, typeof item.generatedItems>
  ) || {};

  if (!item) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 z-[200] transition-opacity duration-300',
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 w-[520px] bg-white shadow-xl z-[201] flex flex-col',
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#e2e8f0] shrink-0">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="flex-1 text-base font-semibold text-[#0f172a]">Generation Details</span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize',
              getStatusBadge(item.status)
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {item.status}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Meta Information */}
          <div className="mb-6">
            <h4 className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-3">
              Meta Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-[#94a3b8] mb-1">ID</div>
                <div className="text-sm font-medium text-[#0f172a]">{item.id}</div>
              </div>
              <div>
                <div className="text-xs text-[#94a3b8] mb-1">Created</div>
                <div className="text-sm font-medium text-[#0f172a]">{item.date}</div>
              </div>
              <div>
                <div className="text-xs text-[#94a3b8] mb-1">Author</div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#818cf8] to-[#c084fc] flex items-center justify-center text-white text-[10px] font-semibold">
                    {item.author.initial}
                  </div>
                  <span className="text-sm font-medium text-[#0f172a]">{item.author.name}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-[#94a3b8] mb-1">Program</div>
                <div className="text-sm font-medium text-[#0f172a]">{item.program}</div>
              </div>
            </div>
          </div>

          {/* Background Documents - PRD Download */}
          {item.hasPrd && (
            <div className="mb-6">
              <h4 className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-3">
                Background Documents
              </h4>
              <button
                onClick={() => onExportPdf(item)}
                className="flex items-center gap-3 w-full px-4 py-3 bg-[#f8fafc] rounded-lg hover:bg-[#f1f5f9] transition-colors text-left"
              >
                <div className="w-10 h-10 bg-[#3b82f6]/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#0f172a]">
                    {item.prdTitle || 'Product Requirements Document'}
                  </div>
                  <div className="text-xs text-[#64748b]">Download PRD</div>
                </div>
              </button>
            </div>
          )}

          {/* Work Items - Epics, Features, Stories, Test Cases */}
          <div className="mb-6">
            <h4 className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-3">
              Work Items
            </h4>
            <div className="bg-[#f8fafc] rounded-lg overflow-hidden">
              {(['epic', 'feature', 'story', 'test_case'] as ItemType[]).map((type) => {
                const items = groupedItems[type] || [];
                const itemCount = type === 'epic' ? item.items.epics :
                                  type === 'feature' ? item.items.features :
                                  type === 'story' ? item.items.stories :
                                  item.items.testCases;
                
                if (itemCount === 0) return null;

                const isExpanded = expandedGroups.has(type);

                return (
                  <div key={type}>
                    <button
                      onClick={() => toggleGroup(type)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f1f5f9] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded text-[11px] font-semibold',
                            getTypeBadgeStyle(type)
                          )}
                        >
                          {getTypeLabel(type)}
                        </span>
                        <span className="text-xs text-[#64748b]">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 text-[#94a3b8] transition-transform duration-200',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </button>

                    <div
                      className={cn(
                        'overflow-hidden transition-all duration-300',
                        isExpanded ? 'max-h-[400px]' : 'max-h-0'
                      )}
                    >
                      <div className="px-4 pb-3">
                        {items.map((genItem) => (
                          <div
                            key={genItem.id}
                            className="flex items-center gap-3 py-2.5 border-b border-[#e2e8f0] last:border-b-0"
                          >
                            <span
                              className={cn(
                                'font-mono text-xs px-2 py-0.5 rounded',
                                getTypeBadgeStyle(type)
                              )}
                            >
                              {genItem.id}
                            </span>
                            <span className="flex-1 text-[13px] text-[#475569]">{genItem.title}</span>
                            {genItem.confidence && (
                              <span className="text-xs font-medium text-[#10b981]">
                                {genItem.confidence}%
                              </span>
                            )}
                            <button className="text-xs text-[#2563eb] hover:underline">View</button>
                          </div>
                        ))}
                        {items.length === 0 && (
                          <div className="py-2 text-xs text-[#94a3b8] italic">
                            {itemCount} items generated
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compliance */}
          {item.complianceStatus && (
            <div>
              <h4 className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-3">
                Compliance
              </h4>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-3 px-3.5 py-3 bg-[#f8fafc] rounded-md">
                  <CheckCircle className="w-4 h-4 text-[#10b981]" />
                  <span className="flex-1 text-[13px] text-[#475569]">DGA Standards 2025</span>
                  <span className="text-xs font-medium text-[#10b981]">
                    {item.complianceStatus.dgaStandards.passed}/{item.complianceStatus.dgaStandards.total} passed
                  </span>
                </div>
                <div className="flex items-center gap-3 px-3.5 py-3 bg-[#f8fafc] rounded-md">
                  <CheckCircle className="w-4 h-4 text-[#10b981]" />
                  <span className="flex-1 text-[13px] text-[#475569]">NCA ECC-2:2018</span>
                  <span className="text-xs font-medium text-[#10b981]">
                    {item.complianceStatus.ncaEcc.met}/{item.complianceStatus.ncaEcc.total} met
                  </span>
                </div>
                <div className="flex items-center gap-3 px-3.5 py-3 bg-[#f8fafc] rounded-md">
                  <CheckCircle className="w-4 h-4 text-[#10b981]" />
                  <span className="flex-1 text-[13px] text-[#475569]">BABOK Validation</span>
                  <span className="text-xs font-medium text-[#10b981]">Validated</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex flex-wrap gap-2.5 p-5 border-t border-[#e2e8f0] shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenInWizard(item)}
            className="border-[#e2e8f0] text-[#0f172a] hover:bg-[#f1f5f9]"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Open in Wizard
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDuplicate(item)}
            className="border-[#e2e8f0] text-[#0f172a] hover:bg-[#f1f5f9]"
          >
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExportPdf(item)}
            className="border-[#e2e8f0] text-[#0f172a] hover:bg-[#f1f5f9]"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExportExcel(item)}
            className="border-[#e2e8f0] text-[#0f172a] hover:bg-[#f1f5f9]"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(item)}
            className="border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444]/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
    </>
  );
}
