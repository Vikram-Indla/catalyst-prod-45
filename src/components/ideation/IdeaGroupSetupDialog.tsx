// ==============================================
// IDEA GROUP SETUP DIALOG
// Campaign administration and configuration
// ==============================================

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateIdeaGroup } from '@/hooks/useIdeation';
import { toast } from 'sonner';
import type { IdeaGroup, IdeaCategory, VotingType } from '@/types/ideation';

interface IdeaGroupSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: IdeaGroup | null;
}

export function IdeaGroupSetupDialog({
  open,
  onOpenChange,
  group,
}: IdeaGroupSetupDialogProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    name: '',
    category: 'Enhancement' as IdeaCategory,
    is_enabled: true,
    is_public: true,
    make_states_public: true,
    allow_voting: true,
    voting_type: 'ForAgainst' as VotingType,
    max_votes_per_idea: null as number | null,
    total_user_tokens: 100,
    approve_external_users: false,
    external_link: '',
  });

  const updateGroup = useUpdateIdeaGroup();

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        category: group.category,
        is_enabled: group.is_enabled,
        is_public: group.is_public,
        make_states_public: group.make_states_public,
        allow_voting: group.allow_voting,
        voting_type: group.voting_type,
        max_votes_per_idea: group.max_votes_per_idea,
        total_user_tokens: group.total_user_tokens,
        approve_external_users: group.approve_external_users,
        external_link: group.external_link || '',
      });
    }
  }, [group]);

  const handleSave = async () => {
    if (!group) return;

    try {
      await updateGroup.mutateAsync({
        id: group.id,
        ...formData,
        external_link: formData.external_link || null,
      });
      toast.success('Campaign settings saved');
      onOpenChange(false);
    } catch {
      toast.error('Failed to save settings');
    }
  };

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Campaign Setup: {group.name}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="visibility">Visibility</TabsTrigger>
            <TabsTrigger value="voting">Voting</TabsTrigger>
            <TabsTrigger value="external">External Access</TabsTrigger>
          </TabsList>

          <div className="overflow-auto flex-1 py-4">
            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as IdeaCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Enhancement">Enhancement</SelectItem>
                    <SelectItem value="Question">Question</SelectItem>
                    <SelectItem value="Ticket">Ticket</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Enhancement: For product improvements. Question: For customer feedback. Ticket: For support requests.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow new ideas to be submitted
                  </p>
                </div>
                <Switch
                  checked={formData.is_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
                />
              </div>
            </TabsContent>

            {/* Visibility Tab */}
            <TabsContent value="visibility" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Public Campaign</Label>
                  <p className="text-sm text-muted-foreground">
                    Make this campaign visible to all users
                  </p>
                </div>
                <Switch
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Idea States</Label>
                  <p className="text-sm text-muted-foreground">
                    Display idea status (New, Open, Planned, etc.) publicly
                  </p>
                </div>
                <Switch
                  checked={formData.make_states_public}
                  onCheckedChange={(checked) => setFormData({ ...formData, make_states_public: checked })}
                />
              </div>
            </TabsContent>

            {/* Voting Tab */}
            <TabsContent value="voting" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Voting</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable users to vote on ideas
                  </p>
                </div>
                <Switch
                  checked={formData.allow_voting}
                  onCheckedChange={(checked) => setFormData({ ...formData, allow_voting: checked })}
                />
              </div>

              {formData.allow_voting && (
                <>
                  <div className="space-y-2">
                    <Label>Voting Type</Label>
                    <Select
                      value={formData.voting_type}
                      onValueChange={(v) => setFormData({ ...formData, voting_type: v as VotingType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ForAgainst">For / Against</SelectItem>
                        <SelectItem value="Token">Token Voting</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      For/Against: Simple up/down voting. Token: Users allocate tokens across ideas.
                    </p>
                  </div>

                  {formData.voting_type === 'Token' && (
                    <div className="space-y-2">
                      <Label htmlFor="tokens">Total User Tokens</Label>
                      <Input
                        id="tokens"
                        type="number"
                        min={1}
                        value={formData.total_user_tokens}
                        onChange={(e) => setFormData({ ...formData, total_user_tokens: parseInt(e.target.value) || 100 })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Number of tokens each user can distribute across ideas
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="maxVotes">Max Votes Per Idea (Optional)</Label>
                    <Input
                      id="maxVotes"
                      type="number"
                      min={1}
                      placeholder="Unlimited"
                      value={formData.max_votes_per_idea || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        max_votes_per_idea: e.target.value ? parseInt(e.target.value) : null 
                      })}
                    />
                  </div>
                </>
              )}
            </TabsContent>

            {/* External Access Tab */}
            <TabsContent value="external" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Approve External Users</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically approve external users who register
                  </p>
                </div>
                <Switch
                  checked={formData.approve_external_users}
                  onCheckedChange={(checked) => setFormData({ ...formData, approve_external_users: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="externalLink">External Portal Link</Label>
                <Input
                  id="externalLink"
                  placeholder="https://..."
                  value={formData.external_link}
                  onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Optional link to share with external users for idea submission
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateGroup.isPending}>
            {updateGroup.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
