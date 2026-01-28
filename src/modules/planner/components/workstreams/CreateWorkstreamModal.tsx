// ============================================================
// CREATE WORKSTREAM MODAL
// Full modal with name, color, description, and member assignment
// Slug is auto-generated from name (not editable)
// ============================================================

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Layers, Plus, Loader2, X, Check, Search, Users, Trash2 
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useCreateWorkstream } from './useCreateWorkstream';
import { useSearchProfiles, type SearchableProfile } from './useSearchProfiles';

interface CreateWorkstreamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface MemberToAdd {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  avatarColor: string;
  initials: string;
  jobTitle: string | null;
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const createWorkstream = useCreateWorkstream();
  
  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState('#06b6d4');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<MemberToAdd[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Auto-generated slug (not editable)
  const slug = useMemo(() => generateSlug(name), [name]);

  // Get IDs of already added members to exclude from search
  const excludeIds = useMemo(() => members.map(m => m.userId), [members]);
  
  // Use the search hook - queries profiles table
  const { data: searchResults = [], isFetching: isSearching } = useSearchProfiles(
    memberSearch,
    excludeIds
  );
  
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
      setColor('#06b6d4');
      setDescription('');
      setMembers([]);
      setMemberSearch('');
      setIsDropdownOpen(false);
    }
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleAddMember = (user: SearchableProfile) => {
    const newMember: MemberToAdd = {
      userId: user.id,
      fullName: user.full_name,
      email: user.email,
      avatarUrl: user.avatar_url,
      avatarColor: user.avatar_color || '#64748b',
      initials: user.initials,
      jobTitle: user.job_title,
      role: 'member',
    };
    setMembers(prev => [...prev, newMember]);
    setMemberSearch('');
    setIsDropdownOpen(false);
    // Refocus the search input for quick additions
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };
  
  const handleRemoveMember = (userId: string) => {
    setMembers(members.filter(m => m.userId !== userId));
  };
  
  const handleRoleChange = (userId: string, role: 'lead' | 'member') => {
    setMembers(members.map(m => {
      // If setting as lead, demote current lead
      if (role === 'lead' && m.role === 'lead' && m.userId !== userId) {
        return { ...m, role: 'member' as const };
      }
      if (m.userId === userId) {
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
          resourceId: m.userId, // Using userId from profiles
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
  const showDropdown = isDropdownOpen && memberSearch.trim().length >= 2;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[560px] p-0 gap-0 flex flex-col"
        style={{ maxHeight: 'calc(100vh - 48px)' }}
      >
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-6 py-5 space-y-6">
            {/* Name Field Only */}
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

            {/* Live Preview - shows generated code from name */}
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
                  <div className="space-y-2 max-h-[160px] overflow-y-auto">
                    {members.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center gap-3 p-3 bg-background rounded-lg group"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback 
                            style={{ backgroundColor: member.avatarColor }}
                            className="text-white text-xs font-semibold"
                          >
                            {member.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{member.fullName}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {member.email}
                            {member.jobTitle && ` · ${member.jobTitle}`}
                          </div>
                        </div>
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleRoleChange(member.userId, value as 'lead' | 'member')}
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
                          onClick={() => handleRemoveMember(member.userId)}
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

                {/* Search Input with Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search by name or email (min 2 chars)..."
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      if (e.target.value.trim().length >= 2) {
                        setIsDropdownOpen(true);
                      }
                    }}
                    onFocus={() => {
                      if (memberSearch.trim().length >= 2) {
                        setIsDropdownOpen(true);
                      }
                    }}
                    className="pl-10 border-dashed"
                  />
                  
                  {/* Loading indicator */}
                  {isSearching && memberSearch.length >= 2 && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}

                  {/* Search Results Dropdown */}
                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto z-[100]">
                      {isSearching ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                          Searching...
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                            onClick={() => handleAddMember(user)}
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback 
                                style={{ backgroundColor: user.avatar_color || '#64748b' }}
                                className="text-white text-xs font-semibold"
                              >
                                {user.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {user.full_name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {user.email}
                                {user.job_title && ` · ${user.job_title}`}
                              </div>
                            </div>
                            <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No users found matching "{memberSearch}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

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