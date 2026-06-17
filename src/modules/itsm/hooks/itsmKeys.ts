// Stable react-query key factory for the ITSM module.
export const itsmKeys = {
  all: ['itsm'] as const,
  incidents: () => [...itsmKeys.all, 'incidents'] as const,
  incident: (key: string) => [...itsmKeys.all, 'incident', key] as const,
  sla: () => [...itsmKeys.all, 'sla'] as const,
  timeline: (incidentId: string) => [...itsmKeys.all, 'timeline', incidentId] as const,
  statusHistory: (incidentId: string) => [...itsmKeys.all, 'status-history', incidentId] as const,
};
