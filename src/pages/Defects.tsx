import { DefectListView } from '@/components/defects/list/DefectListView';

// Default project ID - in a real app, this would come from context or route params
const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

export default function Defects() {
  return <DefectListView projectId={DEFAULT_PROJECT_ID} />;
}
