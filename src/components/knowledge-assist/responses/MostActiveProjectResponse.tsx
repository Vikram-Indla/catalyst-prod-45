import React from 'react';
import { FolderOpen } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, Loz, ScopeBar, ExtendLink, F } from './KAResponseShared';

function MiniStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{
      flex: 1, padding: '12px 14px',
      border: '1.5px solid rgba(15,23,42,0.08)', borderRadius: 8,
      background: '#FFFFFF',
    }}>
      <div style={{ fontFamily: F.mono, fontSize: 18, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#64748B', marginTop: 2, fontFamily: F.inter }}>{label}</div>
    </div>
  );
}

export function MostActiveProjectResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  return (
    <div>
      <CardHeader icon={FolderOpen} iconColor="#2563EB" title="Most Active: Senaei BAU" subtitle="34 updates this week" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        <MiniStat value="+8" label="New items" color="#1D4ED8" />
        <MiniStat value="12" label="Closed" color="#16A34A" />
        <MiniStat value="3" label="Blocked" color="#DC2626" />
        <MiniStat value="34" label="Updates" color="#64748B" />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8, fontFamily: F.inter, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Latest Activity
      </div>
      <V12Table
        headers={['KEY', 'TITLE', 'CHANGE', 'ASSIGNEE', 'WHEN']}
        widths={['90px', 'auto', '180px', '110px', '70px']}
      >
        <Row onClick={() => onItemClick?.('BAU-5082')}><KeyCell value="BAU-5082" /><Cell>Login timeout on mobile Safari</Cell><Cell><span style={{ color: '#64748B', fontSize: 12 }}>NEW — P1 defect</span></Cell><Cell>Wahid Nasri</Cell><Cell mono muted>4h ago</Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-5054')}><KeyCell value="BAU-5054" /><Cell>My Requests missing Search & Filter</Cell><Cell><Loz status="RE-OPEN" /> <span style={{ color: '#64748B', margin: '0 4px' }}>→</span> <Loz status="IN PROGRESS" /></Cell><Cell>Wahid Nasri</Cell><Cell mono muted>6h ago</Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-5080')}><KeyCell value="BAU-5080" /><Cell>New permit application flow</Cell><Cell><span style={{ color: '#64748B', fontSize: 12 }}>NEW — Story</span></Cell><Cell>Wahid Nasri</Cell><Cell mono muted>1d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-4988')}><KeyCell value="BAU-4988" /><Cell>Operational Safety — Acknowledgement Flag</Cell><Cell><Loz status="IN PROGRESS" /> <span style={{ color: '#64748B', margin: '0 4px' }}>→</span> <Loz status="DONE" /></Cell><Cell>Imran Aslam</Cell><Cell mono muted>1d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-5074')}><KeyCell value="BAU-5074" /><Cell>Notification Screen Issues</Cell><Cell><Loz status="DEFERRED" /> <span style={{ color: '#64748B', margin: '0 4px' }}>→</span> <Loz status="RE-OPEN" /></Cell><Cell>Wahid Nasri</Cell><Cell mono muted>1d ago</Cell></Row>
      </V12Table>
      <ScopeBar showing={5} total={34} label="Activity this week" />
      <ExtendLink main="Show all 34 updates this week" hint="" />
    </div>
  );
}
