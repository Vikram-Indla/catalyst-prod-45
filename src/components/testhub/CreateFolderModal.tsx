/**
 * Create Folder Modal — TestHub Module
 * Step 25: 440px modal with name, parent selection, and icon picker
 */

import { useState, useEffect, type ReactNode } from 'react';
import { X, Folder, Loader2, Shield, BarChart3, Users, TrendingUp, Plug, Settings, FlaskConical, ClipboardList, Target, Search, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FolderOption {
  id: string;
  name: string;
  parentId: string | null;
  depth?: number;
}

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  folders: FolderOption[];
  parentId?: string | null;
}

// Icon options for folder customization — Lucide icons instead of emojis
const FOLDER_ICON_OPTIONS: { key: string; icon: ReactNode; label: string }[] = [
  { key: 'folder', icon: <Folder size={18} />, label: 'Folder' },
  { key: 'shield', icon: <Shield size={18} />, label: 'Auth' },
  { key: 'bar-chart', icon: <BarChart3 size={18} />, label: 'Reports' },
  { key: 'users', icon: <Users size={18} />, label: 'Users' },
  { key: 'trending-up', icon: <TrendingUp size={18} />, label: 'Analytics' },
  { key: 'plug', icon: <Plug size={18} />, label: 'API' },
  { key: 'settings', icon: <Settings size={18} />, label: 'Settings' },
  { key: 'flask', icon: <FlaskConical size={18} />, label: 'Testing' },
  { key: 'clipboard', icon: <ClipboardList size={18} />, label: 'Tasks' },
  { key: 'target', icon: <Target size={18} />, label: 'Goals' },
  { key: 'search', icon: <Search size={18} />, label: 'Search' },
  { key: 'briefcase', icon: <Briefcase size={18} />, label: 'Business' },
];

export function CreateFolderModal({
  isOpen,
  onClose,
  onSuccess,
  folders,
  parentId: initialParentId = null,
}: CreateFolderModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(initialParentId);
  const [icon, setIcon] = useState('folder');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setParentId(initialParentId);
      setIcon('folder');
    }
  }, [isOpen, initialParentId]);

  // Build hierarchical folder list with indentation
  const buildFolderOptions = (): FolderOption[] => {
    const result: FolderOption[] = [];
    
    const addFolders = (parentId: string | null, depth: number) => {
      const children = folders.filter(f => f.parentId === parentId);
      children.forEach(folder => {
        result.push({ ...folder, depth });
        addFolders(folder.id, depth + 1);
      });
    };
    
    addFolders(null, 0);
    return result;
  };

  const folderOptions = buildFolderOptions();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Folder name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get max sort_order for placement
      const { data: existingFolders } = await supabase
        .from('th_folders')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextSortOrder = (existingFolders?.[0]?.sort_order ?? 0) + 1;

      const { error } = await supabase
        .from('th_folders')
        .insert({
          name: name.trim(),
          parent_id: parentId || null,
          icon: icon,
          sort_order: nextSortOrder,
        });

      if (error) throw error;

      toast({
        title: 'Folder Created',
        description: `"${name.trim()}" has been created successfully.`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating folder:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create folder',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="th-modal-overlay open"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="th-modal"
        style={{ maxWidth: 440 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="th-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Folder style={{ width: 18, height: 18, color: '#FFFFFF' }} />
            </div>
            <div>
              <h2 className="th-modal-title">Create Folder</h2>
            </div>
          </div>
          <button className="th-modal-close" onClick={onClose}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Body */}
        <div className="th-modal-body" style={{ padding: '20px 24px' }}>
          {/* Folder Name */}
          <div style={{ marginBottom: 20 }}>
            <label className="th-label required">Folder Name</label>
            <input
              type="text"
              className="th-input"
              placeholder="Enter folder name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Parent Folder */}
          <div style={{ marginBottom: 20 }}>
            <label className="th-label">Parent Folder</label>
            <select
              className="th-select"
              value={parentId || ''}
              onChange={(e) => setParentId(e.target.value || null)}
            >
              <option value="">No parent (root level)</option>
              {folderOptions.map(folder => (
                <option key={folder.id} value={folder.id}>
                  {'  '.repeat(folder.depth || 0)}
                  {folder.depth ? '└ ' : ''}
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="th-label">Icon</label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              {FOLDER_ICON_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setIcon(opt.key)}
                  title={opt.label}
                  style={{
                    width: 42,
                    height: 42,
                    border: icon === opt.key ? '2px solid #2563EB' : '1.5px solid #E2E8F0',
                    borderRadius: 10,
                    background: icon === opt.key ? 'rgba(37,99,235,0.1)' : '#FFFFFF',
                    color: icon === opt.key ? '#2563EB' : '#64748B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (icon !== opt.key) {
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (icon !== opt.key) {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }
                  }}
                >
                  {opt.icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="th-modal-footer">
          <button className="th-btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            className="th-btn-primary"
            onClick={handleCreate}
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Folder'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateFolderModal;
