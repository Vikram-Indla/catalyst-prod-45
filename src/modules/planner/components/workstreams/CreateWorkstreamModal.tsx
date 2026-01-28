// ============================================================
// CREATE WORKSTREAM MODAL
// Full modal with name, code, color, description, and member assignment
// ============================================================

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Layers, Plus, Loader2, X, Check, Search, UserPlus, Users, Trash2 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCreateWorkstream } from './useCreateWorkstream';
import { useAvailableResources } from './useWorkstreamMutations';

interface CreateWorkstreamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface MemberToAdd {
  resourceId: string;
  name: string;
  email: string | null;
  roleName: string | null;
  role: 'lead' | 'member';
}

const WORKSTREAM_COLORS = [
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Teal', value: '#14b8a6' },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function generateCode(name: string): string {
  return name
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 4);
}

export function CreateWorkstreamModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateWorkstreamModalProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const createWorkstream = useCreateWorkstream();
  const { data: allResources = [] } = useAvailableResources();
  
  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [color, setColor] = useState('#06b6d4');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<MemberToAdd[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  
  // Auto-generate slug from name
  useEffect(() => {
    if (name && !slugManuallyEdited) {
      setSlug(generateSlug(name));
    }
  }, [name, slugManuallyEdited]);
  
  // Focus name input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [open]);
  
  // Reset form on close
  useEffect(() => {
    if (!open) {
      setName('');
      setSlug('');
      setColor('#06b6d4');
      setDescription('');
      setMembers([]);
      setMemberSearch('');
      setSlugManuallyEdited(false);
    }
  }, [open]);
  
  // Filter available resources (exclude already added members)
  const filteredResources = useMemo(() => {
    const addedIds = new Set(members.map(m => m.resourceId));
    return allResources.filter(r => {
      if (addedIds.has(r.id)) return false;
      if (!memberSearch.trim()) return true;
      const searchLower = memberSearch.toLowerCase();
      return (
        r.name?.toLowerCase().includes(searchLower) ||
        r.email?.toLowerCase().includes(searchLower) ||
        r.role_name?.toLowerCase().includes(searchLower)
      );
    });
  }, [allResources, members, memberSearch]);
  
  const handleAddMember = (resource: typeof allResources[0]) => {
    const newMember: MemberToAdd = {
      resourceId: resource.id,
      name: resource.name || 'Unknown',
      email: resource.email,
      roleName: resource.role_name,
      role: 'member',
    };
    setMembers([...members, newMember]);
    setMemberSearch('');
    setIsSearchOpen(false);
  };
  
  const handleRemoveMember = (resourceId: string) => {
    setMembers(members.filter(m => m.resourceId !== resourceId));
  };
  
  const handleRoleChange = (resourceId: string, role: 'lead' | 'member') => {
    setMembers(members.map(m => {
      // If setting as lead, demote current lead
      if (role === 'lead' && m.role === 'lead' && m.resourceId !== resourceId) {
        return { ...m, role: 'member' as const };
      }
      if (m.resourceId === resourceId) {
        return { ...m, role };
      }
      return m;
    }));
  };
  
  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) return;
    
    try {
      await createWorkstream.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        color,
        description: description.trim() || null,
        members: members.map(m => ({
          resourceId: m.resourceId,
          role: m.role,
        })),
      });
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Error handled by mutation
    }
  };
  
  const canSubmit = name.trim() && slug.trim() && !createWorkstream.isPending;
  const leadMember = members.find(m => m.role === 'lead');
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-5 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Create Workstream</DialogTitle>
              <DialogDescription className="text-sm">
                Add a new workstream to organize your tasks
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-5 space-y-6">
            {/* Name & Slug */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ws-name">Name *</Label>
                <Input
                  ref={nameInputRef}
                  id="ws-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Senaie 3.0"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ws-slug">
                  Slug *
                  <span className="text-muted-foreground font-normal ml-1">(auto)</span>
                </Label>
                <Input
                  id="ws-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(generateSlug(e.target.value));
                    setSlugManuallyEdited(true);
                  }}
                  placeholder="senaie-3"
                  className="h-10 font-mono text-sm"
                />
              </div>
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {WORKSTREAM_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={cn(
                      'w-9 h-9 rounded-lg transition-all',
                      'hover:scale-110',
                      'border-[3px]',
                      color === c.value 
                        ? 'border-foreground' 
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setColor(c.value)}
                    title={c.name}
                  >
                    {color === c.value && (
                      <Check className="w-4 h-4 text-white mx-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            {name && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Preview</Label>
                <div 
                  className="flex items-center gap-3 p-3 rounded-lg border"
                  style={{ borderLeftWidth: '4px', borderLeftColor: color }}
                >
                  <div 
                    className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: color }}
                  >
                    {generateCode(name)}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{name || 'Workstream Name'}</div>
                    <div className="text-xs text-muted-foreground font-mono">{slug || 'slug'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="ws-desc">Description (optional)</Label>
              <Textarea
                id="ws-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose and scope of this workstream..."
                className="resize-none"
                rows={3}
              />
            </div>

            {/* Members Section */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Team Members
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>

              <div className="bg-muted/50 dark:bg-muted/20 rounded-xl p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Added Members
                  </span>
                  <span className="text-xs bg-background px-2 py-0.5 rounded-full">
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Members List */}
                {members.length > 0 ? (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.resourceId}
                        className="flex items-center gap-3 p-3 bg-background rounded-lg group"
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{member.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {member.roleName || member.email || 'No role'}
                          </div>
                        </div>
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleRoleChange(member.resourceId, value as 'lead' | 'member')}
                        >
                          <SelectTrigger className="w-24 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="lead">Lead</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(member.resourceId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <div className="text-2xl mb-1">👥</div>
                    <div className="text-sm">No members added yet</div>
                    <div className="text-xs">Search and add team members below</div>
                  </div>
                )}

                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search by name, email, or role..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                    className="pl-10 border-dashed"
                  />
                  
                  {/* Search Dropdown */}
                  {isSearchOpen && memberSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-md max-h-48 overflow-y-auto z-20">
                      {filteredResources.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                          No users found
                        </div>
                      ) : (
                        filteredResources.slice(0, 10).map((resource) => (
                          <button
                            key={resource.id}
                            type="button"
                            className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                            onClick={() => handleAddMember(resource)}
                          >
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                              style={{ backgroundColor: color }}
                            >
                              {resource.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{resource.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {resource.role_name || resource.email || 'No role'}
                              </div>
                            </div>
                            <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/30 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mr-auto">
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Esc</kbd>
            to cancel
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="gap-2"
          >
            {createWorkstream.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Workstream
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
