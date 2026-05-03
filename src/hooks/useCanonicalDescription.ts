import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { descriptionApi } from '@/lib/descriptionApi';
import type { WorkItemType } from '@/components/shared/CanonicalDescriptionField/description.types';

interface UseCanonicalDescriptionOptions {
  onSuccess?: (description: string) => void;
  onError?: (error: Error) => void;
}

export function useCanonicalDescription(
  workItemId: string,
  workItemType: WorkItemType,
  options?: UseCanonicalDescriptionOptions
) {
  const queryClient = useQueryClient();
  const queryKey = ['description', workItemId, workItemType];

  // Fetch description
  const {
    data: description = '',
    isLoading: isLoadingDescription,
    error: fetchError,
  } = useQuery({
    queryKey,
    queryFn: () => descriptionApi.fetch(workItemId, workItemType),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Save mutation
  const {
    mutate: save,
    isPending: isSaving,
    error: saveError,
  } = useMutation({
    mutationFn: (value: string) =>
      descriptionApi.update(workItemId, workItemType, value),
    onSuccess: (_, value) => {
      queryClient.setQueryData(queryKey, value);
      options?.onSuccess?.(value);
    },
    onError: (error) => {
      options?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    },
  });

  return {
    description,
    isLoading: isLoadingDescription,
    isSaving,
    error: fetchError || saveError,
    save,
  };
}
