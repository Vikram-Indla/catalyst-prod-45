import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trash2, Palette, Unlink, Target, Layers, MessageSquare, History } from 'lucide-react';
import type { StrategicTheme } from '@/types/strategicBacklog';
import { useUpdateTheme, useDeleteTheme } from '@/hooks/useStrategicBacklog';
import { CommentsSection } from '@/components/shared/CommentsSection';
import { FeatureAuditTab } from '@/components/items/features/tabs/FeatureAuditTab';
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
import { format } from 'date-fns';

const COLOR_OPTIONS = [
  { value: '#c69c6d', label: 'Gold' },
  { value: '#5c7c5c', label: 'Olive' },
  { value: '#8b7355', label: 'Bronze' },
  { value: '#d4b896', label: 'Champagne' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#14b8a6', label: 'Teal' },
];

interface ThemeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: StrategicTheme | null;
  isArchived: boolean;
}

export function ThemeDrawer({ open, onOpenChange, theme, isArchived }: ThemeDrawerProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [colorTag, setColorTag] = useState('#c69c6d');
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>('active');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const updateTheme = useUpdateTheme();
  const deleteTheme = useDeleteTheme();

  useEffect(() => {
    if (theme) {
      setName(theme.name);
      setDescription(theme.description || '');
      setColorTag(theme.color_tag || '#c69c6d');
      setStatus((theme.status as 'active' | 'draft' | 'archived') || 'active');
      setActiveTab('details');
    }
  }, [theme]);

  const handleSave = async () => {
    if (!theme?.id || isArchived) return;

    await updateTheme.mutateAsync({
      id: theme.id,
      name,
      description,
      color_tag: colorTag,
      status,
    });
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!theme?.id || isArchived) return;
    await deleteTheme.mutateAsync(theme.id);
    setDeleteOpen(false);
    onOpenChange(false);
  };

  const isReadOnly = isArchived || status === 'archived';

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[480px] sm:max-w-[480px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex-shrink-0"
                style={{ backgroundColor: colorTag }}
              />
              <SheetTitle className="text-lg flex-1 truncate">{theme?.name || 'Theme'}</SheetTitle>
              {status === 'archived' && (
                <Badge variant="outline" className="text-muted-foreground">Archived</Badge>
              )}
            </div>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mx-6 mt-4 justify-start bg-transparent border-b border-border rounded-none p-0 h-auto">
              <TabsTrigger 
                value="details" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-gold data-[state=active]:bg-transparent px-4 pb-2"
              >
                Details
              </TabsTrigger>
              <TabsTrigger 
                value="alignment"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-gold data-[state=active]:bg-transparent px-4 pb-2"
              >
                Alignment
              </TabsTrigger>
              <TabsTrigger 
                value="discussions"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-gold data-[state=active]:bg-transparent px-4 pb-2"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Discussions
              </TabsTrigger>
              <TabsTrigger 
                value="audit"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-gold data-[state=active]:bg-transparent px-4 pb-2"
              >
                <History className="h-3.5 w-3.5 mr-1.5" />
                Audit Trail
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 overflow-auto px-6 py-4 mt-0">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Theme Name *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isReadOnly}
                    placeholder="Enter theme name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isReadOnly}
                    placeholder="Enter theme description"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Color Tag</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => setColorTag(color.value)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          colorTag === color.value ? 'border-foreground scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as any)} disabled={isReadOnly}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {theme && (
                  <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
                    <p>Created: {format(new Date(theme.created_at), 'MMM d, yyyy')}</p>
                    <p>Updated: {format(new Date(theme.updated_at), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="alignment" className="flex-1 overflow-auto px-6 py-4 mt-0">
              <div className="space-y-6">
                {/* Objectives Alignment */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-brand-gold" />
                      <Label className="text-sm font-medium">Aligned Objectives</Label>
                    </div>
                    {!isReadOnly && (
                      <Button variant="outline" size="sm" disabled>
                        Link Objectives
                      </Button>
                    )}
                  </div>
                  <div className="border border-dashed border-border rounded-lg p-6 text-center">
                    <Target className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No objectives linked yet</p>
                  </div>
                </div>

                {/* Epics Alignment */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-brand-gold" />
                      <Label className="text-sm font-medium">Aligned Epics</Label>
                    </div>
                    {!isReadOnly && (
                      <Button variant="outline" size="sm" disabled>
                        Link Epics
                      </Button>
                    )}
                  </div>
                  <div className="border border-dashed border-border rounded-lg p-6 text-center">
                    <Layers className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No epics linked yet</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Discussions Tab - reusing CommentsSection */}
            <TabsContent value="discussions" className="flex-1 overflow-auto px-6 py-4 mt-0">
              {theme?.id ? (
                <CommentsSection entityType="themes" entityId={theme.id} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Save theme to enable discussions
                </div>
              )}
            </TabsContent>

            {/* Audit Trail Tab - reusing FeatureAuditTab (generic activity_logs) */}
            <TabsContent value="audit" className="flex-1 overflow-auto px-6 py-4 mt-0">
              {theme?.id ? (
                <FeatureAuditTab featureId={theme.id} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Save theme to view audit trail
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between p-4 border-t border-border bg-card">
            {!isReadOnly && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {!isReadOnly && (
                <Button onClick={handleSave} className="bg-brand-gold hover:bg-brand-gold/90">
                  Save
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete theme?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this theme. Snapshots may require at least one theme to be activated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
