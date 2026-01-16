/**
 * Folder Content View
 * Shows folder summary with child suites
 */

import { Button } from '@/components/ui/button';
import { FolderPlus, FileText, Folder } from 'lucide-react';
import { useRepositoryStore } from '@/stores/repositoryStore';
import { mockFolders, mockSuites } from '@/data/mockTestRepositoryData';

interface FolderContentViewProps {
  folderId: string;
}

export function FolderContentView({ folderId }: FolderContentViewProps) {
  const { selectItem } = useRepositoryStore();
  
  const folder = mockFolders.find(f => f.id === folderId);
  const childFolders = mockFolders.filter(f => f.parentId === folderId);
  const childSuites = mockSuites.filter(s => s.folderId === folderId);

  if (!folder) {
    return (
      <main className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Folder not found</p>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="text-xs text-muted-foreground mb-2">
          Test Repository / {folder.name}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Folder className="w-6 h-6 text-amber-500" />
            <h1 className="text-lg font-bold text-foreground">{folder.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8">
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
            <Button variant="outline" size="sm" className="h-8">
              <FileText className="w-4 h-4 mr-2" />
              New Test Suite
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground">{folder.testCount}</div>
            <div className="text-xs font-medium text-muted-foreground">Total Tests</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground">{childFolders.length + childSuites.length}</div>
            <div className="text-xs font-medium text-muted-foreground">Child Items</div>
          </div>
        </div>

        {/* Child Items */}
        {(childFolders.length > 0 || childSuites.length > 0) && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Contents</h3>
            <div className="space-y-2">
              {childFolders.map(cf => (
                <div
                  key={cf.id}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => selectItem(cf.id, 'folder')}
                >
                  <Folder className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-foreground flex-1">{cf.name}</span>
                  <span className="text-xs text-muted-foreground">{cf.testCount} tests</span>
                </div>
              ))}
              {childSuites.map(cs => (
                <div
                  key={cs.id}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => selectItem(cs.id, 'suite')}
                >
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-foreground flex-1">{cs.name}</span>
                  <span className="text-xs text-muted-foreground">{cs.testCount} tests</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {childFolders.length === 0 && childSuites.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm font-medium mb-2">This folder is empty</p>
            <p className="text-xs mb-4">Add a test suite or subfolder to get started</p>
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Create Test Suite
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
