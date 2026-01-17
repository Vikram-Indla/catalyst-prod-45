/**
 * AI Context Panel Component
 * Allows users to select release, cycles, and folders for AI context
 */

import React from 'react';
import { Check, Folder, ChevronRight, PanelRightClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ContextPanelData } from '../types';

interface AIContextPanelProps {
  data: ContextPanelData;
  onToggleRelease: () => void;
  onToggleCycle: (id: string) => void;
  onToggleFolder: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function AIContextPanel({
  data,
  onToggleRelease,
  onToggleCycle,
  onToggleFolder,
  isOpen,
  onClose,
}: AIContextPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="w-[300px] bg-white border-l border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">AI Context</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <PanelRightClose className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-5">
        {/* Active Release */}
        <div className="mb-6">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Active Release
          </div>
          {data.activeRelease && (
            <ContextItem
              icon={<ReleaseIcon />}
              name={data.activeRelease.name}
              meta={data.activeRelease.status}
              isSelected={data.activeRelease.isSelected}
              onClick={onToggleRelease}
            />
          )}
        </div>

        {/* Test Cycles */}
        <div className="mb-6">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Test Cycles
          </div>
          <div className="space-y-2">
            {data.testCycles.map(cycle => (
              <ContextItem
                key={cycle.id}
                icon={<CycleIcon progress={cycle.progress} />}
                name={cycle.name}
                meta={`${cycle.testCount} tests • ${cycle.progress}%`}
                isSelected={cycle.isSelected}
                onClick={() => onToggleCycle(cycle.id)}
              />
            ))}
          </div>
        </div>

        {/* Test Folders */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Test Folders
          </div>
          <div className="space-y-2">
            {data.testFolders.map(folder => (
              <ContextItem
                key={folder.id}
                icon={<FolderIcon isSelected={folder.isSelected} />}
                name={folder.name}
                meta={`${folder.testCount} tests`}
                isSelected={folder.isSelected}
                onClick={() => onToggleFolder(folder.id)}
              />
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Footer hint */}
      <div className="px-5 py-4 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Select items to scope AI responses to specific releases, cycles, or test folders.
        </p>
      </div>
    </div>
  );
}

interface ContextItemProps {
  icon: React.ReactNode;
  name: string;
  meta: string;
  isSelected: boolean;
  onClick: () => void;
}

function ContextItem({ icon, name, meta, isSelected, onClick }: ContextItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-[10px] cursor-pointer border transition-colors",
        isSelected 
          ? "bg-[#2563eb]/[0.08] border-[#2563eb]/20" 
          : "border-transparent hover:bg-slate-50"
      )}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900 truncate">{name}</div>
        <div className="text-xs text-slate-500">{meta}</div>
      </div>
      <Checkbox isChecked={isSelected} />
    </div>
  );
}

function Checkbox({ isChecked }: { isChecked: boolean }) {
  if (isChecked) {
    return (
      <div className="w-[22px] h-[22px] bg-[#2563eb] rounded-full flex items-center justify-center">
        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
      </div>
    );
  }
  return (
    <div className="w-[22px] h-[22px] border-2 border-slate-200 rounded-md" />
  );
}

function ReleaseIcon() {
  return (
    <div className="w-9 h-9 rounded-full border-[3px] border-[#0d9488] flex items-center justify-center">
      <div className="w-2.5 h-2.5 bg-[#0d9488] rounded-full" />
    </div>
  );
}

function CycleIcon({ progress }: { progress: number }) {
  const degrees = (progress / 100) * 360;
  
  return (
    <div 
      className="w-9 h-9 rounded-full relative flex items-center justify-center"
      style={{
        background: `conic-gradient(#0d9488 0deg ${degrees}deg, #e2e8f0 ${degrees}deg 360deg)`,
      }}
    >
      <div className="w-[26px] h-[26px] bg-white rounded-full" />
    </div>
  );
}

function FolderIcon({ isSelected }: { isSelected: boolean }) {
  return (
    <div className={cn(
      "w-9 h-9 rounded-lg flex items-center justify-center",
      isSelected ? "bg-[#8b5cf6]/15" : "bg-slate-100"
    )}>
      <Folder className={cn(
        "w-[18px] h-[18px]",
        isSelected ? "text-[#8b5cf6]" : "text-slate-400"
      )} />
    </div>
  );
}
