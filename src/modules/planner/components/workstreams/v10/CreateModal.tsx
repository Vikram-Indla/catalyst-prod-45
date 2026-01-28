// ============================================================
// WORKSTREAMS V10 CREATE MODAL
// 2-step wizard: Name/Color → Members
// ============================================================

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, ArrowLeft, Check, Users, Search, X } from 'lucide-react';
import { getWorkstreamCode, getColorFromName, getInitials } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#f97316', // orange
  '#a855f7', // purple
  '#10b981', // green
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#eab308', // yellow
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

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    color: string;
    members: { user_id: string; role: 'lead' | 'member' }[];
  }) => void;
  availableMembers: TeamMember[];
  isSubmitting?: boolean;
}

export function CreateModal({
  isOpen,
  onClose,
  onSubmit,
  availableMembers,
  isSubmitting,
}: CreateModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [selectedMembers, setSelectedMembers] = useState<Map<string, 'lead' | 'member'>>(new Map());
  const [memberSearch, setMemberSearch] = useState('');

  const code = getWorkstreamCode(name);

  const handleReset = () => {
    setStep(1);
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[0]);
    setSelectedMembers(new Map());
    setMemberSearch('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = () => {
    const members = Array.from(selectedMembers.entries()).map(([user_id, role]) => ({
      user_id,
      role,
    }));
    onSubmit({ name, description, color, members });
    handleReset();
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
    // If setting as lead, demote current lead
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

  const canProceed = step === 1 ? name.trim().length > 0 : true;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[480px] p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {step === 1 ? 'Create Workstream' : 'Add Members'}
            </DialogTitle>
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                  step === 1
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {step > 1 ? <Check className="w-3 h-3" /> : '1'}
              </div>
              <div className="w-8 h-px bg-border" />
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                  step === 2
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                2
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          {step === 1 ? (
            /* Step 1: Name, Description, Color */
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="ws-name">Name</Label>
                <Input
                  id="ws-name"
                  placeholder="e.g., Product Launch"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
                {name && (
                  <p className="text-xs text-muted-foreground">
                    Code: <span className="font-mono font-medium">{code}</span>
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="ws-desc">Description (optional)</Label>
                <Textarea
                  id="ws-desc"
                  placeholder="What is this workstream about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Color */}
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
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2">
                  <div
                    className="w-1 h-8 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <div>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded mr-2"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      {code || '???'}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {name || 'Workstream Name'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: Members */
            <div className="space-y-4">
              {/* Selected members */}
              {selectedMembers.size > 0 && (
                <div className="space-y-2">
                  <Label>Selected ({selectedMembers.size})</Label>
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

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search team members..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Member list */}
              <ScrollArea className="h-[240px]">
                <div className="space-y-1">
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
                            <AvatarFallback
                              style={{ backgroundColor: member.color, color: '#fff' }}
                            >
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {member.full_name}
                            </p>
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
                  {filteredMembers.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      No members found
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 pt-4 border-t border-border/50">
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep(2)} disabled={!canProceed}>
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Workstream'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateModal;
