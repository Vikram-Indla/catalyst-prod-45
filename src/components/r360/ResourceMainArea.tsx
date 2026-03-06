/**
 * ResourceMainArea — placeholder when no resource selected
 */

interface ResourceMainAreaProps {
  selectedResourceId: string | null;
}

export function ResourceMainArea({ selectedResourceId }: ResourceMainAreaProps) {
  return (
    <div className="r3p-main">
      <div className="r3p-main-placeholder">
        Select a resource from the sidebar to view their 360° profile
      </div>
    </div>
  );
}
