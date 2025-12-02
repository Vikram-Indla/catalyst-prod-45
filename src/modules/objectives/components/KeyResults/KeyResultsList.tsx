import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KeyResultCard } from './KeyResultCard';
import { KeyResultForm } from './KeyResultForm';
import { useKeyResults, useCreateKeyResult } from '@/hooks/useKeyResults';

interface KeyResultsListProps {
  objectiveId: string;
  readOnly?: boolean;
}

export function KeyResultsList({ objectiveId, readOnly = false }: KeyResultsListProps) {
  const [showForm, setShowForm] = useState(false);
  const { data: keyResults, isLoading } = useKeyResults(objectiveId);
  const createKeyResult = useCreateKeyResult();

  const handleCreate = async (data: any) => {
    await createKeyResult.mutateAsync({
      ...data,
      objective_id: objectiveId,
    });
    setShowForm(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-20 bg-muted animate-pulse rounded-lg" />
        <div className="h-20 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Key Results {keyResults && keyResults.length > 0 && `(${keyResults.length})`}
        </h3>
        {!readOnly && !showForm && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowForm(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Key Result
          </Button>
        )}
      </div>

      {showForm && (
        <KeyResultForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          isLoading={createKeyResult.isPending}
        />
      )}

      {keyResults && keyResults.length > 0 ? (
        <div className="space-y-2">
          {keyResults.map((keyResult) => (
            <KeyResultCard
              key={keyResult.id}
              keyResult={keyResult}
              objectiveId={objectiveId}
              readOnly={readOnly}
            />
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground mb-3">
              No key results yet
            </p>
            {!readOnly && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Key Result
              </Button>
            )}
          </div>
        )
      )}
    </div>
  );
}
