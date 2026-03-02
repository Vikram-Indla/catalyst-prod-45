import React from 'react';
import { CalendarDays } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, Loz, ScopeBar, ExtendLink, F } from './KAResponseShared';

export function ChangedYesterdayResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  return (
    <div>
      <CardHeader icon={CalendarDays} iconColor="#2563EB" title="Changes Since Yesterday" subtitle="14 items updated" />
      <V12Table
        headers={['KEY', 'TITLE', 'CHANGE', 'ASSIGNEE', 'PROJECT', 'WHEN']}
        widths={['100px', 'auto', '180px', '110px', '100px', '70px']}
      >
        <Row onClick={() => onItemClick?.('BAU-5054')}>
          <KeyCell value="BAU-5054" />
          <Cell>My Requests missing Search & Filter</Cell>
          <Cell><Loz status="RE-OPEN" /> <span style={{ color: '#64748B', margin: '0 4px' }}>→</span> <Loz status="IN PROGRESS" /></Cell>
          <Cell>Wahid Nasri</Cell>
          <Cell bold>Senaei BAU</Cell>
          <Cell mono muted>3h ago</Cell>
        </Row>
        <Row onClick={() => onItemClick?.('BAU-5074')}>
          <KeyCell value="BAU-5074" />
          <Cell>Notification Screen Issues</Cell>
          <Cell><Loz status="DEFERRED" /> <span style={{ color: '#64748B', margin: '0 4px' }}>→</span> <Loz status="RE-OPEN" /></Cell>
          <Cell>Wahid Nasri</Cell>
          <Cell bold>Senaei BAU</Cell>
          <Cell mono muted>5h ago</Cell>
        </Row>
        <Row onClick={() => onItemClick?.('SIMP-3245')}>
          <KeyCell value="SIMP-3245" />
          <Cell>Landing Page — Program & Incentives</Cell>
          <Cell><span style={{ color: '#94A3B8' }}>Priority: Medium</span> <span style={{ color: '#64748B' }}>→</span> <span style={{ fontWeight: 600, color: '#0F172A' }}>High</span></Cell>
          <Cell>Nada Alfassam</Cell>
          <Cell bold>SIMP</Cell>
          <Cell mono muted>6h ago</Cell>
        </Row>
        <Row onClick={() => onItemClick?.('BAU-5070')}>
          <KeyCell value="BAU-5070" />
          <Cell>Individual Dashboard Issues</Cell>
          <Cell><span style={{ color: '#94A3B8' }}>Assignee: —</span> <span style={{ color: '#64748B' }}>→</span> <span style={{ fontWeight: 600, color: '#0F172A' }}>Raza Bangi</span></Cell>
          <Cell>Raza Bangi</Cell>
          <Cell bold>Senaei BAU</Cell>
          <Cell mono muted>8h ago</Cell>
        </Row>
        <Row onClick={() => onItemClick?.('MDT-533')}>
          <KeyCell value="MDT-533" />
          <Cell>Request Query Optimization</Cell>
          <Cell><Loz status="IN PROGRESS" /> <span style={{ color: '#64748B', margin: '0 4px' }}>→</span> <Loz status="CODE REVIEW" /></Cell>
          <Cell>Yousif Al-Harbi</Cell>
          <Cell bold>MDT</Cell>
          <Cell mono muted>10h ago</Cell>
        </Row>
        <Row onClick={() => onItemClick?.('BAU-5073')}>
          <KeyCell value="BAU-5073" />
          <Cell>More Screen Issues</Cell>
          <Cell><span style={{ fontStyle: 'italic', color: '#64748B', fontSize: 12 }}>Comment: "Figma updated, ready…"</span></Cell>
          <Cell>Wahid Nasri</Cell>
          <Cell bold>Senaei BAU</Cell>
          <Cell mono muted>12h ago</Cell>
        </Row>
        <Row onClick={() => onItemClick?.('SIMP-3172')}>
          <KeyCell value="SIMP-3172" />
          <Cell>Restricted Chemical Imports Permit</Cell>
          <Cell><Loz status="BLOCKED" /> <span style={{ color: '#64748B', margin: '0 4px' }}>→</span> <Loz status="IN PROGRESS" /></Cell>
          <Cell>Nada Alfassam</Cell>
          <Cell bold>SIMP</Cell>
          <Cell mono muted>14h ago</Cell>
        </Row>
      </V12Table>
      <ScopeBar showing={7} total={14} label="Since yesterday" />
      <ExtendLink main="Show full activity log" hint="14 items in last 24 hours" />
    </div>
  );
}
