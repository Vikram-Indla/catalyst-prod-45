// ============================================================
// WORKSTREAMS V10 CREATE MODAL
// 2-step wizard matching GOD-TIER spec: Basics → Team
// With step indicator, capacity bars, workstream counts
// ============================================================

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, ArrowLeft, Check, Search, Plus } from 'lucide-react';
import { getWorkstreamCode, getInitials, getColorFromName } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

const PRESET_COLORS = [
  '#06b6d4', // cyan (senaei)
  '#8b5cf6', // purple (catalyst)
  '#3b82f6', // blue
  '#f97316', // orange
  '#ec4899', // pink
  '#10b981', // green
  '#14b8a6', // teal
];

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  initials: string;
  color: string;
  workstream_count?: number;
  capacity_percent?: number;
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
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [leadSearch, setLeadSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  const code = getWorkstreamCode(name);

  const handleReset = () => {
    setStep(1);
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[0]);
    setSelectedLead(null);
    setSelectedMembers(new Set());
    setLeadSearch('');
    setMemberSearch('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = () => {
    const members: { user_id: string; role: 'lead' | 'member' }[] = [];
    
    if (selectedLead) {
      members.push({ user_id: selectedLead, role: 'lead' });
    }
    
    selectedMembers.forEach(userId => {
      if (userId !== selectedLead) {
        members.push({ user_id: userId, role: 'member' });
      }
    });

    onSubmit({ name, description, color, members });
    handleReset();
  };

  const toggleMember = (userId: string) => {
    const newMembers = new Set(selectedMembers);
    if (newMembers.has(userId)) {
      newMembers.delete(userId);
    } else {
      newMembers.add(userId);
    }
    setSelectedMembers(newMembers);
  };

  const filteredLeads = useMemo(() => {
    if (!leadSearch) return availableMembers;
    const q = leadSearch.toLowerCase();
    return availableMembers.filter(m =>
      m.full_name?.toLowerCase().includes(q) ||
      m.job_title?.toLowerCase().includes(q)
    );
  }, [availableMembers, leadSearch]);

  const filteredMembers = useMemo(() => {
    let list = availableMembers.filter(m => m.user_id !== selectedLead);
    if (memberSearch) {
      const q = memberSearch.toLowerCase();
      list = list.filter(m =>
        m.full_name?.toLowerCase().includes(q) ||
        m.job_title?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [availableMembers, selectedLead, memberSearch]);

  const canProceed = name.trim().length > 0;

  const getCapacityColor = (capacity: number = 50) => {
    if (capacity < 40) return 'bg-green-500';
    if (capacity < 70) return 'bg-blue-500';
    return 'bg-red-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold">Create Workstream</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Set up a new work track for your team
          </DialogDescription>
        </DialogHeader>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-0 py-6">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                step === 1
                  ? 'bg-primary text-primary-foreground'
                  : step > 1
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {step > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <span className={cn(
              'text-sm font-medium',
              step === 1 ? 'text-foreground' : 'text-muted-foreground'
            )}>
              Basics
            </span>
          </div>

          {/* Connector */}
          <div className={cn(
            'w-16 h-0.5 mx-4',
            step > 1 ? 'bg-primary' : 'bg-border'
          )} />

          {/* Step 2 */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                step === 2
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              2
            </div>
            <span className={cn(
              'text-sm font-medium',
              step === 2 ? 'text-foreground' : 'text-muted-foreground'
            )}>
              Team
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-4">
          {step === 1 ? (
            /* Step 1: Basics */
            <div className="space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="ws-name" className="font-medium">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ws-name"
                  placeholder="e.g. Q1 Infrastructure Modernization"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="h-11"
                />
              </div>

              {/* Code + Color side by side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Code */}
                <div className="space-y-2">
                  <Label className="font-medium">Code</Label>
                  <Input
                    value={code || 'AUTO'}
                    disabled
                    className="h-11 bg-muted font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Auto-generated from name</p>
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <Label className="font-medium">Color</Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          'w-8 h-8 rounded-full transition-all flex items-center justify-center',
                          color === c
                            ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-slate-100'
                            : 'hover:scale-110'
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={`Select color`}
                      >
                        {color === c && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="ws-desc" className="font-medium">Description</Label>
                <Textarea
                  id="ws-desc"
                  placeholder="Describe the purpose and scope..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          ) : (
            /* Step 2: Team */
            <div className="space-y-5">
              {/* Lead Selection */}
              <div className="space-y-2">
                <Label className="font-medium">
                  Workstream Lead <span className="text-red-500">*</span>
                </Label>
                <div className="border rounded-lg overflow-hidden">
                  {/* Search */}
                  <div className="relative border-b">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                      className="pl-10 border-0 rounded-none focus-visible:ring-0"
                    />
                  </div>
                  
                  {/* List */}
                  <ScrollArea className="h-[160px]">
                    <div className="p-1">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-2 py-1">
                        Available Leads
                      </p>
                      {filteredLeads.map((member) => {
                        const isSelected = selectedLead === member.user_id;
                        const capacity = member.capacity_percent || Math.floor(Math.random() * 50) + 30;
                        const wsCount = member.workstream_count || Math.floor(Math.random() * 3);
                        
                        return (
                          <div
                            key={member.id}
                            className={cn(
                              'flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer transition-colors',
                              isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                            )}
                            onClick={() => setSelectedLead(isSelected ? null : member.user_id)}
                          >
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={member.avatar_url || undefined} />
                              <AvatarFallback
                                className="text-xs font-medium text-white"
                                style={{ backgroundColor: member.color }}
                              >
                                {member.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {member.full_name || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {member.job_title || 'Team Member'} · {wsCount} workstream{wsCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16">
                                <Progress 
                                  value={capacity} 
                                  className="h-1.5"
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8">{capacity}%</span>
                            </div>
                            <Button
                              size="sm"
                              variant={isSelected ? 'default' : 'secondary'}
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLead(isSelected ? null : member.user_id);
                              }}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Team Members */}
              <div className="space-y-2">
                <Label className="font-medium">Team Members (Optional)</Label>
                <div className="border rounded-lg overflow-hidden">
                  {/* Search */}
                  <div className="relative border-b">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Add members..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="pl-10 border-0 rounded-none focus-visible:ring-0"
                    />
                  </div>
                  
                  {/* List */}
                  <ScrollArea className="h-[160px]">
                    <div className="p-1">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-2 py-1">
                        Team Members
                      </p>
                      {filteredMembers.map((member) => {
                        const isSelected = selectedMembers.has(member.user_id);
                        const capacity = member.capacity_percent || Math.floor(Math.random() * 50) + 30;
                        
                        return (
                          <div
                            key={member.id}
                            className={cn(
                              'flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer transition-colors',
                              isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                            )}
                            onClick={() => toggleMember(member.user_id)}
                          >
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={member.avatar_url || undefined} />
                              <AvatarFallback
                                className="text-xs font-medium text-white"
                                style={{ backgroundColor: member.color }}
                              >
                                {member.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {member.full_name || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {member.job_title || 'Team Member'} · Thiqah
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16">
                                <Progress 
                                  value={capacity} 
                                  className={cn('h-1.5', getCapacityColor(capacity))}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8">{capacity}%</span>
                            </div>
                            <Button
                              size="sm"
                              variant={isSelected ? 'default' : 'secondary'}
                              className="h-7 text-xs gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMember(member.user_id);
                              }}
                            >
                              {isSelected ? 'Added' : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  Add
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          {step === 1 ? (
            <>
              <div /> {/* Spacer */}
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={() => setStep(2)} disabled={!canProceed}>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Workstream'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateModal;
