/**
 * Move to Folder Modal — TestHub Module
 * Allows moving one or more test cases to a different folder
 */

import { useState } from 'react';
import { X, Folder, FolderOpen, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  icon?: string;
}

interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  testCaseIds: string[];
  folders: FolderItem[];
  currentFolderId?: string | null;
}

export function MoveToFolderModal({
  isOpen,
  onClose,
  onSuccess,
  testCaseIds,
  folders,
  currentFolderId,
}: MoveToFolderModalProps) {
  const { toast } = useToast();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const handleMove = async () => {
    if (!selectedFolderId) {
      toast({ title: 'Error', description: 'Please select a destination folder', variant: 'destructive' });
      return;
    }
    if (selectedFolderId === currentFolderId) {
      toast({ title: 'Error', description: 'Already in this folder', variant: 'destructive' });
      return;
    }

    setIsMoving(true);
    try {
      const { error } = await supabase
        .from('tm_test_cases')
        .update({ folder_id: selectedFolderId, updated_at: new Date().toISOString() })
        .in('id', testCaseIds);

      if (error) throw new Error(error.message);

      toast({
        title: 'Moved',
        description: `Moved ${testCaseIds.length} test case${testCaseIds.length > 1 ? 's' : ''} successfully`,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to move', variant: 'destructive' });
    } finally {
      setIsMoving(false);
    }
  };

  const toggleExpanded = (folderId: string) => {
    const next = new Set(expandedFolders);
    next.has(folderId) ? next.delete(folderId) : next.add(folderId);
    setExpandedFolders(next);
  };

  const rootFolders = folders.filter(f => !f.parentId);
  const getChildren = (parentId: string) => folders.filter(f => f.parentId === parentId);

  const renderFolder = (folder: FolderItem, depth: number = 0) => {
    const children = getChildren(folder.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const isCurrent = currentFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          onClick={() => !isCurrent && setSelectedFolderId(folder.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            paddingLeft: 12 + depth * 20,
            borderRadius: 6,
            cursor: isCurrent ? 'not-allowed' : 'pointer',
            backgroundColor: isSelected ? 'color-mix(in srgb, var(--cp-blue) 8%, transparent)' : 'transparent',
            border: isSelected ? '1px solid color-mix(in srgb, var(--cp-blue) 25%, transparent)' : '1px solid transparent',
            opacity: isCurrent ? 0.5 : 1,
            transition: 'all 0.1s',
          }}
          onMouseEnter={(e) => { if (!isSelected && !isCurrent) e.currentTarget.style.backgroundColor = 'var(--bg-1)'; }}
          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = isSelected ? 'color-mix(in srgb, var(--cp-blue) 8%, transparent)' : 'transparent'; }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpanded(folder.id); }}
              style={{ width: 16, height: 16, border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-4)' }}
            >
              <ChevronRight style={{ width: 14, height: 14, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
          ) : (
            <div style={{ width: 16 }} />
          )}
          {isExpanded ? (
            <FolderOpen style={{ width: 16, height: 16, color: 'var(--cp-blue)', flexShrink: 0 }} />
          ) : (
            <Folder style={{ width: 16, height: 16, color: 'var(--fg-3)', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: 'var(--fg-1)', flex: 1 }}>
            {folder.name}
          </span>
          {isCurrent && (
            <span style={{ fontSize: 10, color: 'var(--fg-4)', fontStyle: 'italic' }}>current</span>
          )}
        </div>
        {hasChildren && isExpanded && children.map(child => renderFolder(child, depth + 1))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: '95vw', maxHeight: 'calc(100vh - 120px)', backgroundColor: 'var(--cp-float)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>Move to Folder</h2>
            <p style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 13, color: 'var(--fg-3)', margin: '4px 0 0 0' }}>
              {testCaseIds.length} test case{testCaseIds.length > 1 ? 's' : ''} selected
            </p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Folder tree */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', minHeight: 200, maxHeight: 360 }}>
          {rootFolders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg-4)', fontSize: 13 }}>
              No folders available
            </div>
          ) : (
            rootFolders.map(f => renderFolder(f))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{ height: 40, padding: '0 20px', backgroundColor: 'var(--cp-float)', border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedFolderId || isMoving}
            style={{
              height: 40, padding: '0 20px',
              background: !selectedFolderId || isMoving ? 'var(--fg-4)' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#FFFFFF',
              cursor: !selectedFolderId || isMoving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {isMoving ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Moving...</> : 'Move Here'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MoveToFolderModal;
