// Primary exports - Linear/Notion style timeline with horizontal bars
export { AllocationModal, ResourceAllocationModal } from './ResourceAllocationModal';
export { TimelineGrid } from './TimelineGrid';
export { AllocationBar } from './AllocationBar';
export { AddAssignmentModal } from './AddAssignmentModal';
export { EditAllocationModal } from './EditAllocationModal';
export { ViewToggle } from './ViewToggle';
export { StatusLegend } from './StatusLegend';

// Legacy drawer (deprecated - use AllocationModal instead)
export { AllocationDrawer } from './AllocationDrawer';

// Default export is the new modal
export { AllocationModal as default } from './ResourceAllocationModal';
