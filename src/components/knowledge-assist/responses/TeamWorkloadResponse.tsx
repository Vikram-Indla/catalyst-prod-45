import React from 'react';
import { Users, Loader2 } from 'lucide-react';
import { CardHeader, V12Table, Row, Cell, Loz } from './KAResponseShared';
import { useTeamWorkload } from './useKAData';

function getCapacityStatus(active: number, blocked: number): string {
  if (blocked > 3) return 'BLOCKED';
  if (active > 15) return 'AT CAPACITY';
  return 'AVAILABLE';
}

export function TeamWorkloadResponse() {
  const { data, loading } = useTeamWorkload();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 size={20} className="animate-spin" color="#2563EB" /></div>;
  if (!data.length) return <div style={{ padding: 24, color: '#64748B', fontSize: 13, textAlign: 'center' }}>No team workload data available.</div>;

  return (
    <div>
      <CardHeader icon={Users} iconColor="#2563EB" title="Team Workload" subtitle={`${data.length} team members`} />
      <V12Table
        headers={['MEMBER', 'ACTIVE', 'BLOCKED', 'CLOSED (2W)', 'STATUS']}
        widths={['auto', '70px', '70px', '90px', '110px']}
      >
        {data.map(m => (
          <Row key={m.name}>
            <Cell bold>{m.name}</Cell>
            <Cell mono>{m.active}</Cell>
            <Cell mono>{m.blocked}</Cell>
            <Cell mono>{m.closedRecent}</Cell>
            <Cell><Loz status={getCapacityStatus(m.active, m.blocked)} /></Cell>
          </Row>
        ))}
      </V12Table>
    </div>
  );
}
