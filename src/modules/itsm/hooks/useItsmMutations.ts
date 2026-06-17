// ============================================================
// ITSM MUTATION HOOKS — create / update / delete with cache
// invalidation + canonical catalystToast (ADS @atlaskit/flag) feedback.
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { catalystToast } from '@/lib/catalystToast';
import {
  createIncident,
  updateIncident,
  deleteIncident,
  type CreateIncidentInput,
  type UpdateIncidentPatch,
} from '../services/itsmService';
import { itsmKeys } from './itsmKeys';

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIncidentInput) => createIncident(input),
    onSuccess: (incident) => {
      qc.invalidateQueries({ queryKey: itsmKeys.incidents() });
      catalystToast.show({ type: 'success', title: 'Incident created', message: incident.incidentKey });
    },
    onError: (err: any) => {
      catalystToast.show({ type: 'error', title: 'Could not create incident', message: err?.message ?? 'Unknown error' });
    },
  });
}

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateIncidentPatch }) => updateIncident(id, patch),
    onSuccess: (incident) => {
      qc.invalidateQueries({ queryKey: itsmKeys.incidents() });
      qc.invalidateQueries({ queryKey: itsmKeys.incident(incident.incidentKey) });
      qc.invalidateQueries({ queryKey: itsmKeys.timeline(incident.id) });
      qc.invalidateQueries({ queryKey: itsmKeys.statusHistory(incident.id) });
    },
    onError: (err: any) => {
      catalystToast.show({ type: 'error', title: 'Could not update incident', message: err?.message ?? 'Unknown error' });
    },
  });
}

export function useDeleteIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIncident(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itsmKeys.incidents() });
      catalystToast.show({ type: 'success', title: 'Incident deleted' });
    },
    onError: (err: any) => {
      catalystToast.show({ type: 'error', title: 'Could not delete incident', message: err?.message ?? 'Unknown error' });
    },
  });
}
