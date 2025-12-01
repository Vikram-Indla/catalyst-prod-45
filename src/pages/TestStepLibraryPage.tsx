import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSharedSteps, useDeleteSharedStep } from '@/hooks/useSharedSteps';
import { useToast } from '@/hooks/use-toast';
import { SharedStepCard } from '@/components/test-management/SharedStepCard';
import { CreateSharedStepModal } from '@/components/test-management/CreateSharedStepModal';
import { EditSharedStepModal } from '@/components/test-management/EditSharedStepModal';
import { SharedStepUsage } from '@/components/test-management/SharedStepUsage';
import type { SharedTestStep } from '@/types/sharedSteps.types';

export const TestStepLibraryPage: React.FC = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<string>('usage_desc');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<SharedTestStep | null>(null);
  const [usageStep, setUsageStep] = useState<SharedTestStep | null>(null);

  const { data: sharedSteps = [], isLoading } = useSharedSteps({ 
    search, 
    sort: sort as any,
    limit: 100,
  });
  
  const deleteMutation = useDeleteSharedStep();

  const handleDelete = async (step: SharedTestStep) => {
    if (step.usage_count > 0) {
      toast({
        title: 'Cannot Delete',
        description: 'This step is in use. Remove it from all test cases first.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Delete shared step "${step.title}"?`)) return;

    try {
      await deleteMutation.mutateAsync(step.id);
      toast({
        title: 'Success',
        description: 'Shared step deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete shared step',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b-2 border-brand-gold bg-background p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Test Step Library</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage reusable test steps
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-brand-gold text-brand-dark hover:bg-brand-gold-hover"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Shared Step
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shared steps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="usage_desc">Most Used</SelectItem>
              <SelectItem value="usage_asc">Least Used</SelectItem>
              <SelectItem value="title_asc">Title (A-Z)</SelectItem>
              <SelectItem value="title_desc">Title (Z-A)</SelectItem>
              <SelectItem value="recent">Recently Created</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold" />
          </div>
        ) : sharedSteps.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {search ? 'No shared steps found' : 'No shared steps yet'}
            </div>
            {!search && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-brand-gold text-brand-dark hover:bg-brand-gold-hover"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Shared Step
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedSteps.map((step) => (
              <SharedStepCard
                key={step.id}
                step={step}
                onEdit={setEditingStep}
                onViewUsage={setUsageStep}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateSharedStepModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <EditSharedStepModal
        step={editingStep}
        isOpen={!!editingStep}
        onClose={() => setEditingStep(null)}
        onViewUsage={() => {
          if (editingStep) {
            setUsageStep(editingStep);
            setEditingStep(null);
          }
        }}
      />

      <SharedStepUsage
        step={usageStep}
        isOpen={!!usageStep}
        onClose={() => setUsageStep(null)}
      />
    </div>
  );
};

export default TestStepLibraryPage;
