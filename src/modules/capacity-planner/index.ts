// Capacity Planner Module Exports
export { useCapacityData } from './hooks/useCapacityData';
export { useAssignments } from './hooks/useAssignments';
export { useAiRecommendations } from './hooks/useAiRecommendations';
export { useCapacityDepartments } from './hooks/useCapacityDepartments';
export { useResourceManagement } from './hooks/useResourceManagement';
export { useResourceAssignments } from './hooks/useResourceAssignments';
export { useResourceAllocations } from './hooks/useResourceAllocations';
export { exportCapacityToPdf } from './lib/pdf-export';
export * from './types';

// Re-export from capacity-planning module
export { CapacityPlanning, useCapacityBookings, useCreateBooking, useUpdateBooking, useDeleteBooking } from '@/modules/capacity-planning';

// Re-export allocation modal
export { AllocationBookingModal } from '@/components/capacity/AllocationBookingModal';
