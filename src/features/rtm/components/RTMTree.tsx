import { ChevronRight, Layers, Box, BookOpen, FileCheck, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { RequirementTreeNode, RequirementType, CoverageStatus } from '../types';
import { cn } from '@/lib/utils';

const typeConfig: Record<RequirementType, { icon: typeof Layers; bgColor: string; color: string }> = {
  epic: { icon: Layers, bgColor: 'bg-violet-500/10', color: 'text-violet-500' },
  feature: { icon: Box, bgColor: 'bg-blue-500/10', color: 'text-blue-500' },
  story: { icon: BookOpen, bgColor: 'bg-teal-500/10', color: 'text-teal-500' },
  requirement: { icon: FileCheck, bgColor: 'bg-amber-500/10', color: 'text-amber-500' },
};

const coverageIcon: Record<CoverageStatus, { icon: typeof CheckCircle; color: string }> = {
  covered: { icon: CheckCircle, color: 'text-emerald-500' },
  partial: { icon: AlertTriangle, color: 'text-amber-500' },
  gap: { icon: XCircle, color: 'text-red-500' },
};

interface TreeItemProps {
  node: RequirementTreeNode;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

const TreeItem = ({ node, onToggle, onSelect }: TreeItemProps) => {
  const config = typeConfig[node.type];
  const coverage = coverageIcon[node.coverageStatus];
  const Icon = config.icon;
  const CoverageIcon = coverage.icon;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md transition-all hover:bg-muted/50 group relative",
          node.isSelected && "bg-primary/10"
        )}
        style={{ marginLeft: node.depth * 20 }}
        onClick={() => onSelect(node.id)}
      >
        {node.isSelected && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r" />}
        
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
          className={cn("w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground", !node.hasChildren && "invisible")}
        >
          <ChevronRight className={cn("w-4 h-4 transition-transform", node.isExpanded && "rotate-90")} />
        </button>
        
        <div className={cn("w-6 h-6 rounded flex items-center justify-center", config.bgColor)}>
          <Icon className={cn("w-3.5 h-3.5", config.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-semibold text-muted-foreground">{node.key}</span>
          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{node.title}</p>
        </div>
        
        <CoverageIcon className={cn("w-4 h-4 flex-shrink-0", coverage.color)} />
      </div>
      
      {node.isExpanded && node.children.length > 0 && (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-3 w-px bg-border" style={{ marginLeft: node.depth * 20 }} />
          {node.children.map(child => (
            <TreeItem key={child.id} node={child} onToggle={onToggle} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

interface Props {
  tree: RequirementTreeNode[];
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const RTMTree = ({ tree, onToggle, onSelect, onExpandAll, onCollapseAll }: Props) => (
  <div className="w-[340px] border-r border-border bg-card flex flex-col">
    <div className="p-3 border-b border-border flex items-center justify-between">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Requirements</h3>
      <div className="flex gap-1">
        <button onClick={onExpandAll} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Expand</button>
        <button onClick={onCollapseAll} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Collapse</button>
      </div>
    </div>
    <div className="flex-1 overflow-auto p-2">
      {tree.map(node => <TreeItem key={node.id} node={node} onToggle={onToggle} onSelect={onSelect} />)}
    </div>
  </div>
);
