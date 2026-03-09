import { PageHeader } from '@/components/release/PageHeader';

export default function TriageQueuePage() {
  return (
    <div className="rh-page">
      <PageHeader title="Triage Queue" subtitle="Unassigned changes awaiting release assignment" />
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-10 text-center text-[#94A3B8] text-[13px] mt-4">
        Triage Queue — Stage D implementation
      </div>
    </div>
  );
}
