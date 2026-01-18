/**
 * Folder Tree Component
 * Expandable folder hierarchy with test cases
 */

import React, { useState } from 'react';
import { ChevronRight, Folder, FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TMTestCase } from '@/types/test-management';
import { FolderNode, UseTestCaseSelectionReturn } from './types';
import { TestCaseRow } from './TestCaseRow';
import { Skeleton } from '@/components/ui/skeleton';

interface FolderTreeProps {
  tree: FolderNode[];
  unfiledCases: TMTestCase[];
  selection: UseTestCaseSelectionReturn;
  allTestCases: TMTestCase[];
  isLoading: boolean;
}

export function FolderTree({ 
  tree, 
  unfiledCases, 
  selection, 
  allTestCases,
  isLoading 
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleAddFolder = (node: FolderNode, e: React.MouseEvent) => {
    e.stopPropagation();
    // Get all cases in this folder and descendants
    const getAllCases = (n: FolderNode): TMTestCase[] => {
      const cases = [...n.testCases];
      n.children.forEach(child => {
        cases.push(...getAllCases(child));
      });
      return cases;
    };
    const allFolderCases = getAllCases(node);
    const selectableIds = allFolderCases
      .filter(tc => !selection.isAlreadyInCycle(tc.id))
      .map(tc => tc.id);
    selection.selectMultiple(selectableIds);
  };

  const renderFolder = (node: FolderNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.folder.id);
    const hasContent = node.testCases.length > 0 || node.children.length > 0;

    return (
      <div key={node.folder.id}>
        {/* Folder Header */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100',
            depth > 0 && 'ml-4'
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => toggleFolder(node.folder.id)}
        >
          <ChevronRight 
            className={cn(
              'w-4 h-4 text-slate-400 transition-transform shrink-0',
              isExpanded && 'rotate-90',
              !hasContent && 'invisible'
            )} 
          />
          
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          
          <span className="flex-1 text-sm text-slate-700 truncate">
            {node.folder.name}
          </span>
          
          <Badge variant="secondary" className="text-xs shrink-0">
            {node.totalCount}
          </Badge>
          
          {node.selectableCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-primary hover:text-primary-foreground hover:bg-primary"
              onClick={(e) => handleAddFolder(node, e)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add All
            </Button>
          )}
        </div>

        {/* Folder Contents */}
        {isExpanded && (
          <div>
            {/* Test Cases in this folder */}
            {node.testCases.map(tc => (
              <div key={tc.id} style={{ paddingLeft: `${depth * 16}px` }}>
                <TestCaseRow
                  testCase={tc}
                  isSelected={selection.isSelected(tc.id)}
                  isAlreadyInCycle={selection.isAlreadyInCycle(tc.id)}
                  onToggle={() => selection.toggle(tc.id)}
                />
              </div>
            ))}

            {/* Nested Folders */}
            {node.children.map(child => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {/* Unfiled cases first */}
      {unfiledCases.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
            <Folder className="w-4 h-4 text-slate-400" />
            <span className="flex-1 text-sm text-slate-500 italic">Unfiled</span>
            <Badge variant="secondary" className="text-xs">
              {unfiledCases.length}
            </Badge>
          </div>
          {unfiledCases.map(tc => (
            <TestCaseRow
              key={tc.id}
              testCase={tc}
              isSelected={selection.isSelected(tc.id)}
              isAlreadyInCycle={selection.isAlreadyInCycle(tc.id)}
              onToggle={() => selection.toggle(tc.id)}
            />
          ))}
        </div>
      )}

      {/* Folder tree */}
      {tree.map(node => renderFolder(node))}

      {/* Empty state */}
      {tree.length === 0 && unfiledCases.length === 0 && !isLoading && (
        <div className="p-8 text-center text-slate-500">
          <Folder className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">No test cases found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
