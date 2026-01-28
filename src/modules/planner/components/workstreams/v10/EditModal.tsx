// ============================================================
// WORKSTREAMS V10 EDIT MODAL
// Tabbed interface: Details | Members | Danger Zone
// ============================================================

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Settings, Users, AlertTriangle, Search, X, Trash2, Archive } from 'lucide-react';
import { WorkstreamDataV10, getWorkstreamCode } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PRESET_COLORS = [
  '#3b82f6', '#f97316', '#a855f7', '#10b981',
  '#ef4444', '#06b6d4', '#ec4899', '#eab308',
];

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  initials: string;
  color: string;
}

interface EditModalProps {
  workstream: WorkstreamDataV10 | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    color: string;
    members: { user_id: string; role: 'lead' | 'member' }[];
  }) => void;
  onArchive?: () => void;
  onDelete?: () => void;
  availableMembers: TeamMember[];
  isSaving?: boolean;
}

export function EditModal({
  workstream,
  isOpen,
  onClose,
  onSave,
  onArchive,
  onDelete,
  availableMembers,
  isSaving,
}: EditModalProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [selectedMembers, setSelectedMembers] = useState<Map<string, 'lead' | 'member'>>(new Map());
  const [memberSearch, setMemberSearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Initialize form with workstream data
  useEffect(() => {
    if (workstream) {
      setName(workstream.name);
      setDescription(workstream.description || '');
      setColor(workstream.color);
      
      const members = new Map<string, 'lead' | 'member'>();
      workstream.members.forEach((m) => {
        members.set(m.user_id, m.role);
      });
      setSelectedMembers(members);
    }
  }, [workstream]);

  if (!workstream) return null;

  const code = getWorkstreamCode(name);
  const hasChanges =
    name !== workstream.name ||
    description !== (workstream.description || '') ||
    color !== workstream.color ||
    !membersMatch();

  function membersMatch() {
    if (selectedMembers.size !== workstream!.members.length) return false;
    for (const m of workstream!.members) {
      if (selectedMembers.get(m.user_id) !== m.role) return false;
    }
    return true;
  }

  const handleSave = () => {
    const members = Array.from(selectedMembers.entries()).map(([user_id, role]) => ({
      user_id,
      role,
    }));
    onSave({ name, description, color, members });
  };

  const toggleMember = (userId: string) => {
    const newMembers = new Map(selectedMembers);
    if (newMembers.has(userId)) {
      newMembers.delete(userId);
    } else {
      newMembers.set(userId, 'member');
    }
    setSelectedMembers(newMembers);
  };

  const setMemberRole = (userId: string, role: 'lead' | 'member') => {
    const newMembers = new Map(selectedMembers);
    if (role === 'lead') {
      newMembers.forEach((r, id) => {
        if (r === 'lead') newMembers.set(id, 'member');
      });
    }
    newMembers.set(userId, role);
    setSelectedMembers(newMembers);
  };

  const filteredMembers = availableMembers.filter((m) =>
    m.full_name?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[520px] p-0 max-h-[85vh] flex flex-col">
          <DialogHeader className="p-6 pb-0 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-8 rounded-full"
                style={{ backgroundColor: color }}
              />
              <DialogTitle className="text-lg font-semibold">Edit Workstream</DialogTitle>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-3 h-9">
                <TabsTrigger value="details" className="text-xs">
                  <Settings className="w-3 h-3 mr-1" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="members" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Members
                </TabsTrigger>
                <TabsTrigger value="danger" className="text-xs text-destructive data-[state=active]:text-destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Danger
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <Tabs value={activeTab} className="p-6">
              {/* Details Tab */}
              <TabsContent value="details" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Code: <span className="font-mono font-medium">{code}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-desc">Description</Label>
                  <Textarea
                    id="edit-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex items-center gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          'w-7 h-7 rounded-full transition-all',
                          color === c
                            ? 'ring-2 ring-offset-2 ring-primary scale-110'
                            : 'hover:scale-105'
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Members Tab */}
              <TabsContent value="members" className="mt-0 space-y-4">
                {selectedMembers.size > 0 && (
                  <div className="space-y-2">
                    <Label>Current Members ({selectedMembers.size})</Label>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(selectedMembers.entries()).map(([userId, role]) => {
                        const member = availableMembers.find((m) => m.user_id === userId);
                        if (!member) return null;
                        return (
                          <Badge
                            key={userId}
                            variant="secondary"
                            className="flex items-center gap-1.5 pr-1"
                          >
                            <Avatar className="w-4 h-4">
                              <AvatarImage src={member.avatar_url || undefined} />
                              <AvatarFallback
                                className="text-[8px]"
                                style={{ backgroundColor: member.color, color: '#fff' }}
                              >
                                {member.initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{member.full_name}</span>
                            {role === 'lead' && (
                              <span className="text-[10px] text-primary">(Lead)</span>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleMember(userId)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {filteredMembers.map((member) => {
                    const isSelected = selectedMembers.has(member.user_id);
                    const role = selectedMembers.get(member.user_id);
                    return (
                      <div
                        key={member.id}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors',
                          isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                        )}
                        onClick={() => toggleMember(member.user_id)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback style={{ backgroundColor: member.color, color: '#fff' }}>
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.full_name}</p>
                            {member.job_title && (
                              <p className="text-xs text-muted-foreground">{member.job_title}</p>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <Button
                            size="sm"
                            variant={role === 'lead' ? 'default' : 'outline'}
                            className="h-6 text-[10px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMemberRole(member.user_id, role === 'lead' ? 'member' : 'lead');
                            }}
                          >
                            {role === 'lead' ? 'Lead' : 'Set Lead'}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Danger Zone Tab */}
              <TabsContent value="danger" className="mt-0 space-y-4">
                <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-start gap-3">
                    <Archive className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-foreground">Archive Workstream</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Archive this workstream to hide it from active views. Tasks will be preserved.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                        onClick={() => setShowArchiveConfirm(true)}
                      >
                        Archive Workstream
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                  <div className="flex items-start gap-3">
                    <Trash2 className="w-5 h-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-foreground">Delete Workstream</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Permanently delete this workstream and all associated tasks. This action cannot be undone.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="mt-3"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        Delete Workstream
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 pt-4 border-t border-border/50">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation */}
      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Workstream?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide "{workstream.name}" from active views. You can restore it later from the archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onArchive?.();
                setShowArchiveConfirm(false);
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workstream?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{workstream.name}" and all its tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.();
                setShowDeleteConfirm(false);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default EditModal;
