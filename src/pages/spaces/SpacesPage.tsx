// ════════════════════════════════════════════════════════════════════════════
// SPACES DIRECTORY PAGE
// ════════════════════════════════════════════════════════════════════════════

import { SpacesDirectory, CreateSpaceModal } from '@/components/spaces';

export default function SpacesPage() {
  return (
    <>
      <SpacesDirectory />
      <CreateSpaceModal />
    </>
  );
}
