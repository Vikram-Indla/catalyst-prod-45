/**
 * Document Restrictions Component
 * Source: https://support.atlassian.com/confluence-cloud/docs/restrict-a-page-or-space/
 * - Restrict who can view or edit a page
 * - Supports user and group restrictions
 */
import { useState } from 'react';
import { Lock, Unlock, Plus, X, Shield, Eye, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DocumentRestrictionsProps {
  documentId: string;
}

interface Restriction {
  id: string;
  document_id: string;
  restriction_type: 'view' | 'edit';
  entity_type: 'user' | 'group';
  entity_id: string;
  created_by: string;
  created_at: string;
}

export function DocumentRestrictions({ documentId }: DocumentRestrictionsProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [newRestriction, setNewRestriction] = useState({
    type: 'edit' as 'view' | 'edit',
    entityType: 'user' as 'user' | 'group',
    entityId: '',
  });

  // Fetch restrictions
  const { data: restrictions, isLoading } = useQuery({
    queryKey: ['kb-restrictions', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_document_restrictions')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Restriction[];
    },
  });

  // Add restriction mutation
  const addRestrictionMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('kb_document_restrictions')
        .insert({
          document_id: documentId,
          restriction_type: newRestriction.type,
          entity_type: newRestriction.entityType,
          entity_id: newRestriction.entityId,
          created_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-restrictions', documentId] });
      setNewRestriction({ type: 'edit', entityType: 'user', entityId: '' });
      toast.success('Restriction added');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('This restriction already exists');
      } else {
        toast.error('Failed to add restriction');
      }
    },
  });

  // Remove restriction mutation
  const removeRestrictionMutation = useMutation({
    mutationFn: async (restrictionId: string) => {
      const { error } = await supabase
        .from('kb_document_restrictions')
        .delete()
        .eq('id', restrictionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-restrictions', documentId] });
      toast.success('Restriction removed');
    },
  });

  const handleAddRestriction = () => {
    if (!newRestriction.entityId.trim()) {
      toast.error('Please enter a user email or group name');
      return;
    }
    addRestrictionMutation.mutate();
  };

  const hasRestrictions = restrictions && restrictions.length > 0;
  const viewRestrictions = restrictions?.filter(r => r.restriction_type === 'view') || [];
  const editRestrictions = restrictions?.filter(r => r.restriction_type === 'edit') || [];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={hasRestrictions ? "text-brand-gold" : ""}
        >
          {hasRestrictions ? (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Restricted
            </>
          ) : (
            <>
              <Unlock className="h-4 w-4 mr-2" />
              Restrictions
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-gold" />
            Page Restrictions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new restriction */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
            <p className="text-sm font-medium">Add Restriction</p>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={newRestriction.type}
                onValueChange={(value: 'view' | 'edit') => 
                  setNewRestriction(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Can View
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Can Edit
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={newRestriction.entityType}
                onValueChange={(value: 'user' | 'group') => 
                  setNewRestriction(prev => ({ ...prev, entityType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                value={newRestriction.entityId}
                onChange={(e) => 
                  setNewRestriction(prev => ({ ...prev, entityId: e.target.value }))
                }
                placeholder={newRestriction.entityType === 'user' ? 'User email...' : 'Group name...'}
                className="flex-1"
              />
              <Button 
                onClick={handleAddRestriction}
                disabled={!newRestriction.entityId.trim() || addRestrictionMutation.isPending}
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Current restrictions */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading restrictions...</p>
          ) : !hasRestrictions ? (
            <div className="text-center py-6 text-muted-foreground">
              <Unlock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No restrictions set</p>
              <p className="text-xs">Anyone can view and edit this page</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* View restrictions */}
              {viewRestrictions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    View Restrictions
                  </p>
                  <div className="space-y-1">
                    {viewRestrictions.map((restriction) => (
                      <RestrictionItem
                        key={restriction.id}
                        restriction={restriction}
                        onRemove={() => removeRestrictionMutation.mutate(restriction.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Edit restrictions */}
              {editRestrictions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Edit Restrictions
                  </p>
                  <div className="space-y-1">
                    {editRestrictions.map((restriction) => (
                      <RestrictionItem
                        key={restriction.id}
                        restriction={restriction}
                        onRemove={() => removeRestrictionMutation.mutate(restriction.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RestrictionItemProps {
  restriction: Restriction;
  onRemove: () => void;
}

function RestrictionItem({ restriction, onRemove }: RestrictionItemProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-card border">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {restriction.entity_type}
        </Badge>
        <span className="text-sm">{restriction.entity_id}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
