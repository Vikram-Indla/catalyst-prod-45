/**
 * ResourceSidebar — 232px resource list sidebar
 * Stage A: Shell only
 */

interface ResourceSidebarProps {
  selectedResourceId: string | null;
  onSelectResource: (id: string | null) => void;
}

export function ResourceSidebar({ selectedResourceId, onSelectResource }: ResourceSidebarProps) {
  return <div data-component="ResourceSidebar" />;
}
