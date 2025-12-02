// ==============================================
// CREATE IDEA DIALOG
// Form for creating new ideas
// Based on Jira Align Ideation documentation
// ==============================================

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateIdea, useUploadAttachment, useToggleSubscription, useIdeaGroups, useIdeationForm } from '@/hooks/useIdeation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IdeaAttachmentUpload } from './IdeaAttachmentUpload';
import { toast } from 'sonner';
import type { CreateIdeaRequest, IdeationFormField } from '@/types/ideation';

interface CreateIdeaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ideaGroupId: string;
  userId: string;
}

export function CreateIdeaDialog({
  open,
  onOpenChange,
  ideaGroupId,
  userId,
}: CreateIdeaDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [ownerId, setOwnerId] = useState(userId);
  const [subscribeToIdea, setSubscribeToIdea] = useState(true);
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(ideaGroupId);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  const createIdea = useCreateIdea();
  const uploadAttachment = useUploadAttachment();
  const toggleSubscription = useToggleSubscription();
  
  // Fetch all groups for group selector
  const { data: groups = [] } = useIdeaGroups();
  
  // Fetch the selected group to get form_id
  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  
  // Fetch form fields if group has a form
  const { data: formData } = useIdeationForm(selectedGroup?.form_id || null);
  
  // Fetch users for owner dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['profiles-for-owner'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Update selected group when prop changes
  useEffect(() => {
    setSelectedGroupId(ideaGroupId);
  }, [ideaGroupId]);

  const handleSubmit = async (closeAfter: boolean) => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    // Validate required custom fields
    if (formData?.fields) {
      for (const field of formData.fields) {
        if (field.is_required && field.is_active && !customFieldValues[field.id]) {
          toast.error(`${field.label} is required`);
          return;
        }
      }
    }

    const request: CreateIdeaRequest = {
      idea_group_id: selectedGroupId,
      title: title.trim(),
      description: description.trim(),
      owner_id: ownerId,
      is_public: isPublic,
      custom_fields: customFieldValues,
    };

    try {
      const newIdea = await createIdea.mutateAsync(request);
      
      // Upload pending attachments
      for (const file of pendingAttachments) {
        await uploadAttachment.mutateAsync({ ideaId: newIdea.id, file });
      }
      
      // Subscribe if checkbox was checked
      if (subscribeToIdea) {
        await toggleSubscription.mutateAsync({ ideaId: newIdea.id, isSubscribed: false });
      }
      
      toast.success('Idea created successfully');
      
      if (closeAfter) {
        onOpenChange(false);
        resetForm();
      } else {
        // Reset form but keep dialog open for another idea
        resetForm();
      }
    } catch (error) {
      toast.error('Failed to create idea');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setIsPublic(true);
    setOwnerId(userId);
    setSubscribeToIdea(true);
    setPendingAttachments([]);
    setCustomFieldValues({});
  };
  
  const handleAttachmentSelect = (files: File[]) => {
    setPendingAttachments(prev => [...prev, ...files]);
  };

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const renderCustomField = (field: IdeationFormField) => {
    if (!field.is_active) return null;
    
    const value = customFieldValues[field.id] || '';
    
    switch (field.field_type) {
      case 'textbox':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.is_required && '*'}
            </Label>
            <Input
              id={field.id}
              value={value}
              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
              placeholder={field.help_text || ''}
            />
          </div>
        );
      case 'opentext':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.is_required && '*'}
            </Label>
            <Textarea
              id={field.id}
              value={value}
              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
              placeholder={field.help_text || ''}
              rows={3}
            />
          </div>
        );
      case 'dropdown':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.is_required && '*'}
            </Label>
            <Select value={value} onValueChange={(v) => handleCustomFieldChange(field.id, v)}>
              <SelectTrigger>
                <SelectValue placeholder={field.help_text || 'Select...'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Idea</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Group Selector - per spec */}
          <div className="space-y-2">
            <Label htmlFor="group">Campaign (Idea Group)</Label>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter idea title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your idea..."
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          {/* Owner dropdown per spec */}
          <div className="space-y-2">
            <Label htmlFor="owner">Owner</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || 'Unknown User'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Form Fields - per spec */}
          {formData?.fields && formData.fields.length > 0 && (
            <div className="space-y-4 border-t pt-4">
              <Label className="text-sm font-medium">Custom Fields</Label>
              {formData.fields
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(renderCustomField)}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Public Idea</Label>
              <p className="text-sm text-muted-foreground">
                Make this idea visible to all users
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          
          {/* Subscribe checkbox per spec */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="subscribe" 
              checked={subscribeToIdea} 
              onCheckedChange={(checked) => setSubscribeToIdea(!!checked)}
            />
            <Label htmlFor="subscribe" className="text-sm cursor-pointer">
              Subscribe to this idea
            </Label>
          </div>
          
          {/* Attachments section per spec */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            <IdeaAttachmentUpload 
              onUpload={handleAttachmentSelect}
              compact
            />
            {pendingAttachments.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {pendingAttachments.length} file(s) will be uploaded when idea is created
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => handleSubmit(false)} 
            disabled={createIdea.isPending}
          >
            Save
          </Button>
          <Button onClick={() => handleSubmit(true)} disabled={createIdea.isPending}>
            {createIdea.isPending ? 'Creating...' : 'Save & Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
