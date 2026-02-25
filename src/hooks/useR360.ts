import { useQuery } from '@tanstack/react-query';
import { r360Service } from '@/services/r360Service';
import type { R360Filters } from '@/types/r360';

export const useR360Resources = () =>
  useQuery({ queryKey: ['r360','resources'], queryFn: () => r360Service.getResources() });

export const useR360Overview = (id: string) =>
  useQuery({ queryKey: ['r360','overview',id], queryFn: () => r360Service.getMemberOverview(id), enabled: !!id });

export const useR360WorkItems = (id: string, filters?: R360Filters) =>
  useQuery({ queryKey: ['r360','items',id,filters], queryFn: () => r360Service.getMemberWorkItems(id, filters), enabled: !!id });

export const useR360Siblings = (key: string | null) =>
  useQuery({ queryKey: ['r360','siblings',key], queryFn: () => r360Service.getSiblings(key!), enabled: !!key });
