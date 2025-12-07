import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/release/PageHeader';
import { Button } from '@/components/ui/button';

export default function IncidentsDashboard() {
  return (
    <div className="h-full flex flex-col bg-white overflow-auto">
      <PageHeader title="Incidents Dashboard" actions={<Link to="/release/incidents"><Button variant="outline" size="sm" className="h-9 border-[#E8E8E8]">View List</Button></Link>} />
      <div className="p-6 grid grid-cols-5 gap-4">
        {[{ label: 'Critical Incidents', value: 3, color: '#C62828' }, { label: 'Open Incidents', value: 24, color: '#E65100' }, { label: 'Resolved This Week', value: 18, color: '#2E7D32' }, { label: 'Avg Resolution Time', value: '4.2h', color: '#1A1A1A' }, { label: 'SLA Compliance', value: '94%', color: '#2E7D32' }].map((stat, i) => (
          <div key={i} className="bg-white border border-[#E8E8E8] rounded-lg p-5">
            <div className="text-[11px] uppercase font-semibold text-[#8C8C8C] mb-2">{stat.label}</div>
            <div className="text-[28px] font-bold" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
