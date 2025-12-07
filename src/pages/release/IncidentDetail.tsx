import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from '@/components/release/PriorityBadge';
import { UserAvatar } from '@/components/release/UserAvatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import incidentsData from '@/data/incidents.json';
import type { Incident } from '@/types/release';
import { useState } from 'react';

const incidents = incidentsData.incidents as Incident[];

export default function IncidentDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'all' | 'comments' | 'history'>('all');
  const incident = incidents.find(inc => inc.id === id);
  
  if (!incident) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Incident not found</h2>
          <Link to="/release/incidents" className="text-[#C69C6D] hover:underline">Back to Incidents</Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center gap-4 px-6 py-3.5 border-b border-[#E8E8E8]">
        <Link to="/release/incidents" className="flex items-center gap-1.5 text-[#8C8C8C] hover:text-[#C69C6D] text-sm">
          <ArrowLeft className="w-4 h-4" />Back to Incidents
        </Link>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="h-9 border-[#E8E8E8]"><MoreVertical className="w-4 h-4 mr-1.5" />Actions</Button>
        <Button variant="outline" size="sm" className="h-9 border-[#E8E8E8]"><Edit className="w-4 h-4 mr-1.5" />Edit</Button>
      </div>
      <div className="flex-1 overflow-hidden grid grid-cols-[1fr_340px]">
        <div className="p-6 overflow-y-auto border-r border-[#E8E8E8]">
          <div className="mb-6">
            <span className="inline-block px-2.5 py-1 rounded text-[13px] font-semibold mb-2.5" style={{ backgroundColor: 'rgba(198,156,109,0.1)', color: '#C69C6D' }}>{incident.id}</span>
            <h1 className="text-[22px] font-semibold">{incident.summary}</h1>
          </div>
          <div className="mb-6">
            <h3 className="text-[11px] font-semibold uppercase text-[#8C8C8C] tracking-wide mb-3">Description</h3>
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-4">
              <p className="text-[#5C5C5C] leading-relaxed">{incident.description}</p>
            </div>
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase text-[#8C8C8C] tracking-wide mb-3">Activity & Comments</h3>
            <div className="bg-white border border-[#E8E8E8] rounded-lg overflow-hidden">
              <div className="flex border-b border-[#E8E8E8]">
                {(['all', 'comments', 'history'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${activeTab === tab ? 'border-[#C69C6D] text-[#C69C6D]' : 'border-transparent text-[#8C8C8C]'}`}>
                    {tab === 'all' ? 'All Activity' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {incident.comments.length === 0 ? <div className="p-8 text-center text-[#8C8C8C] text-sm">No activity yet</div> : incident.comments.map(c => (
                  <div key={c.id} className="p-4 border-b border-[#F0F0F0] last:border-b-0 flex gap-3">
                    <UserAvatar initials={c.author.initials} />
                    <div><div className="flex items-center gap-2 mb-1"><span className="font-semibold text-[13px]">{c.author.name}</span></div><p className="text-sm text-[#5C5C5C]">{c.text}</p></div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-[#E8E8E8]">
                <Textarea placeholder="Add a comment..." className="min-h-[70px] border-[#E8E8E8]" />
                <div className="flex justify-end mt-2.5"><Button size="sm" className="h-9 bg-[#C69C6D] hover:bg-[#B8894D] text-white">Post Comment</Button></div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 overflow-y-auto bg-white">
          <div className="bg-white border border-[#E8E8E8] rounded-lg p-4 mb-4">
            <h4 className="text-[11px] font-semibold uppercase text-[#8C8C8C] mb-3">Status</h4>
            <Select defaultValue={incident.status}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="in-progress">In Progress</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select>
          </div>
          <div className="bg-white border border-[#E8E8E8] rounded-lg p-4 mb-4">
            <h4 className="text-[11px] font-semibold uppercase text-[#8C8C8C] mb-3">Details</h4>
            <div className="space-y-0">
              <div className="flex justify-between items-center py-2.5 border-b border-[#F0F0F0]"><span className="text-[11px] uppercase font-medium text-[#8C8C8C]">Priority</span><PriorityBadge priority={incident.priority} /></div>
              <div className="flex justify-between items-center py-2.5 border-b border-[#F0F0F0]"><span className="text-[11px] uppercase font-medium text-[#8C8C8C]">Impact</span><span className="text-[13px] font-medium capitalize">{incident.impact}</span></div>
              <div className="flex justify-between items-center py-2.5 border-b border-[#F0F0F0]"><span className="text-[11px] uppercase font-medium text-[#8C8C8C]">Assignee</span><div className="flex items-center gap-2"><UserAvatar initials={incident.assignee.initials} size="sm" /><span className="text-[13px] font-medium">{incident.assignee.name}</span></div></div>
              <div className="flex justify-between items-center py-2.5"><span className="text-[11px] uppercase font-medium text-[#8C8C8C]">Created</span><span className="text-[13px] font-medium">{formatDate(incident.createdAt)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
