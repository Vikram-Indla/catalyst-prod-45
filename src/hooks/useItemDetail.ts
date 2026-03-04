import { useQuery } from '@tanstack/react-query';
import { fetchItemDetail } from '@/lib/r360/fetchItemDetail';

export function useItemDetail(itemId: string | null) {
  return useQuery({
    queryKey: ['item-detail', itemId],
    queryFn: () => fetchItemDetail(itemId!),
    enabled: !!itemId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
