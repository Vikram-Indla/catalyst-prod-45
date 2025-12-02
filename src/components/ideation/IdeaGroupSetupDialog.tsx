// ==============================================
// IDEA GROUP SETUP DIALOG
// Campaign administration and configuration
// Per Jira Align Screenshot 4 specification
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateIdeaGroup } from '@/hooks/useIdeation';
import { useIdeationForms } from '@/hooks/useIdeationForms';
import { ManageFormsDialog } from './ManageFormsDialog';
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
  const [showManageForms, setShowManageForms] = useState(false);
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
    form_id: null as string | null,
  });

  const updateGroup = useUpdateIdeaGroup();
  const { data: forms } = useIdeationForms();

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
        form_id: group.form_id,
      });
    }
  }, [group]);

  const handleSave = async (closeAfter: boolean = false) => {
    if (!group) return;

    try {
      await updateGroup.mutateAsync({
        id: group.id,
        ...formData,
        external_link: formData.external_link || null,
      });
      toast.success('Campaign settings saved');
      if (closeAfter) {
        onOpenChange(false);
      }
    } catch {
      toast.error('Failed to save settings');
    }
  };

  const handleFormSelect = (formId: string | null) => {
    setFormData({ ...formData, form_id: formId });
  };

  if (!group) return null;

  const selectedForm = forms?.find(f => f.id === formData.form_id);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[90%] min-w-[500px] sm:max-w-[700px] max-h-[85vh] p-0 flex flex-col overflow-hidden">
          {/* Fixed Header */}
          <DialogHeader className="px-6 pt-6 pb-0 flex-shrink-0">
            <DialogTitle>Campaign Administration</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            {/* Fixed Tab List */}
            <TabsList className="w-full justify-start px-6 pt-4 flex-shrink-0 bg-transparent">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="visibility">Visibility</TabsTrigger>
              <TabsTrigger value="voting">Voting</TabsTrigger>
              <TabsTrigger value="external">External Access</TabsTrigger>
            </TabsList>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
              {/* General Tab */}
              <TabsContent value="general" className="mt-0 space-y-0">
                {/* 1. Edit Group (Name) */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">1. Edit Group</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Type your campaign name here..."
                    className="mt-2"
                  />
                </div>

                {/* 2. Category */}
                <div className="space-y-2 mt-6">
                  <Label htmlFor="category" className="text-sm font-medium">2. Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v as IdeaCategory })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Enhancement">Enhancement</SelectItem>
                      <SelectItem value="Question">Question</SelectItem>
                      <SelectItem value="Ticket">Ticket</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-3 pb-1">
                    Enhancement: For product improvements. Question: For customer feedback. Ticket: For support requests.
                  </p>
                </div>

                {/* 3. Admins */}
                <div className="mt-6">
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-medium">3. Admins</Label>
                    <Button variant="outline" size="sm" className="text-muted-foreground h-8">
                      + Add People
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Users who can manage this campaign
                  </p>
                </div>

                {/* 4. Contributors */}
                <div className="mt-6">
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-medium">4. Contributors</Label>
                    <Button variant="outline" size="sm" className="text-muted-foreground h-8">
                      + Add People
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Users who can submit ideas to this campaign
                  </p>
                </div>

                {/* 5. Form Builder */}
                <div className="mt-6">
                  <Label className="text-sm font-medium">5. Form Builder</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Select
                      value={formData.form_id || 'none'}
                      onValueChange={(v) => setFormData({ ...formData, form_id: v === 'none' ? null : v })}
                    >
                      <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Select Form" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Form</SelectItem>
                        {forms?.map(form => (
                          <SelectItem key={form.id} value={form.id}>
                            {form.name.replace(/\.$/, '')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="link"
                      className="text-brand-gold hover:text-brand-gold-hover p-0 h-auto"
                      onClick={() => setShowManageForms(true)}
                    >
                      Manage Forms
                    </Button>
                  </div>
                  {selectedForm && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Selected: {selectedForm.name.replace(/\.$/, '')} ({selectedForm.fields?.length || 0} fields)
                    </p>
                  )}
                </div>

                {/* 6. Enable Group Toggle */}
                <div className="flex items-center justify-between mt-6 pr-2">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">6. Enable Group</Label>
                    <p className="text-xs text-muted-foreground">
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
              <TabsContent value="visibility" className="mt-0 space-y-6">
                {/* 7. Make Public */}
                <div className="flex items-center justify-between pr-2">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">7. Make Public</Label>
                    <p className="text-xs text-muted-foreground">
                      Make this campaign visible to all users
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                  />
                </div>

                {/* 8. Make States Public */}
                <div className="flex items-center justify-between pr-2">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">8. Make States Public</Label>
                    <p className="text-xs text-muted-foreground">
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
              <TabsContent value="voting" className="mt-0 space-y-6">
                {/* 9. Allow Voting */}
                <div className="flex items-center justify-between pr-2">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">9. Allow Voting</Label>
                    <p className="text-xs text-muted-foreground">
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
                    {/* 10. Token Voting */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">10. Token Voting</Label>
                      <Select
                        value={formData.voting_type}
                        onValueChange={(v) => setFormData({ ...formData, voting_type: v as VotingType })}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ForAgainst">No (For/Against)</SelectItem>
                          <SelectItem value="Token">Yes (Token Voting)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-3">
                        For/Against: Simple up/down voting. Token: Users allocate tokens across ideas.
                      </p>
                    </div>

                    {/* 11. Max Votes per Idea */}
                    <div className="space-y-2">
                      <Label htmlFor="maxVotes" className="text-sm font-medium">11. Max Votes per Idea</Label>
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
                        className="mt-2"
                      />
                    </div>

                    {/* 12. Total User Tokens */}
                    {formData.voting_type === 'Token' && (
                      <div className="space-y-2">
                        <Label htmlFor="tokens" className="text-sm font-medium">12. Total User Tokens</Label>
                        <Input
                          id="tokens"
                          type="number"
                          min={1}
                          value={formData.total_user_tokens}
                          onChange={(e) => setFormData({ ...formData, total_user_tokens: parseInt(e.target.value) || 100 })}
                          className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-3">
                          Number of tokens each user can distribute across ideas
                        </p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* External Access Tab */}
              <TabsContent value="external" className="mt-0 space-y-6">
                {/* 13. Approve External Users */}
                <div className="flex items-center justify-between pr-2">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">13. Approve External Users</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically approve external users who register
                    </p>
                  </div>
                  <Switch
                    checked={formData.approve_external_users}
                    onCheckedChange={(checked) => setFormData({ ...formData, approve_external_users: checked })}
                  />
                </div>

                {/* 14. External Link */}
                <div className="space-y-2">
                  <Label htmlFor="externalLink" className="text-sm font-medium">14. External Link</Label>
                  <Input
                    id="externalLink"
                    readOnly
                    value={formData.external_link || 'Auto-generated when external access is enabled'}
                    className="bg-muted/50 mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-3">
                    Read-only link for external users to access this campaign
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Fixed Footer */}
          <div className="flex justify-between items-center px-6 py-4 border-t bg-background flex-shrink-0">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setFormData({ ...formData, is_enabled: true })}
                disabled={formData.is_enabled}
                className="border-border"
              >
                Enable Group
              </Button>
              <Button
                variant="destructive"
                onClick={() => setFormData({ ...formData, is_enabled: false })}
                disabled={!formData.is_enabled}
              >
                Disable Group
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleSave(false)} 
                disabled={updateGroup.isPending}
                className="bg-brand-gold hover:bg-brand-gold-hover text-brand-dark"
              >
                Save
              </Button>
              <Button 
                onClick={() => handleSave(true)} 
                disabled={updateGroup.isPending}
                className="bg-brand-gold hover:bg-brand-gold-hover text-brand-dark"
              >
                Save & Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Forms Dialog */}
      <ManageFormsDialog
        open={showManageForms}
        onOpenChange={setShowManageForms}
        onSelectForm={handleFormSelect}
      />
    </>
  );
}
