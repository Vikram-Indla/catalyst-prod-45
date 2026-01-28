/**
 * Caty V4 — Barrel Export
 * All Caty components and utilities
 */

// Main Panel (V4 GOD-TIER)
export { CatyPanelV4 } from './CatyPanelV4';

// Legacy (keeping for backward compatibility)
export { CatyChatWidget } from './CatyChatWidget';
export { CatyOrb } from './CatyOrb';

// V4 Components
export { CatyHeader } from './CatyHeader';
export { CatyGreetingCard } from './CatyGreetingCard';
export { CatyMessageBubble } from './CatyMessage';
export { CatyTypingIndicator } from './CatyTypingIndicator';
export { CatyKPITiles } from './CatyKPITiles';
export { CatyDepartmentCard } from './CatyDepartmentCard';
export { CatySuggestions } from './CatySuggestions';
export { CatyInput } from './CatyInput';
export { CatySparkline } from './CatySparkline';
export { CatySkeletonCard, CatySkeletonMessage, CatyEmptyState, CatyErrorState } from './CatyStates';

// Hooks
export { useCapacityData } from './useCapacityData';
export { useCatyKeyboard } from './useCatyKeyboard';

// Types
export * from './types';
