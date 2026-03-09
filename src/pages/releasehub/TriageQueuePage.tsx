import { PageHeader } from '@/components/release/PageHeader';

export default function TriageQueuePage() {
  return (
    <div className="rh-page">
      <PageHeader title="Triage Queue" subtitle="Unassigned changes awaiting release assignment" />
      {/* STAGE C builds all content here */}
    </div>
  );
}
