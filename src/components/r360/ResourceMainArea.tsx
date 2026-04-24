/**
 * ResourceMainArea — main content area
 * Stage A: Shell only
 */

interface ResourceMainAreaProps {
  selectedResourceId: string | null;
}

export function ResourceMainArea({ selectedResourceId }: ResourceMainAreaProps) {
  return <div data-component="ResourceMainArea" />;
}
