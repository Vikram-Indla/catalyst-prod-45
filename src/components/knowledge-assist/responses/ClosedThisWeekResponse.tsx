import React from 'react';
import { CheckCircle } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, ScopeBar, ExtendLink } from './KAResponseShared';

export function ClosedThisWeekResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  return (
    <div>
      <CardHeader icon={CheckCircle} iconColor="#16A34A" title="Closed This Week" titleColor="#16A34A" subtitle="12 resolved" />
      <V12Table
        headers={['KEY', 'TITLE', 'TYPE', 'PROJECT', 'CLOSED BY', 'CLOSED']}
        widths={['90px', 'auto', '70px', '100px', '110px', '70px']}
      >
        <Row onClick={() => onItemClick?.('BAU-4988')}><KeyCell value="BAU-4988" /><Cell>Operational Safety — Acknowledgement Flag</Cell><Cell>Story</Cell><Cell bold>Senaei BAU</Cell><Cell>Imran Aslam</Cell><Cell mono muted>1d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-4986')}><KeyCell value="BAU-4986" /><Cell>Backoffice Visibility & Access Control</Cell><Cell>Story</Cell><Cell bold>Senaei BAU</Cell><Cell>Imran Aslam</Cell><Cell mono muted>1d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-4984')}><KeyCell value="BAU-4984" /><Cell>Request Details Screen (Investor Side)</Cell><Cell>Story</Cell><Cell bold>Senaei BAU</Cell><Cell>Imran Aslam</Cell><Cell mono muted>2d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('SIMP-3260')}><KeyCell value="SIMP-3260" /><Cell>Chemical permit workflow validation fix</Cell><Cell>Defect</Cell><Cell bold>SIMP</Cell><Cell>Nada Alfassam</Cell><Cell mono muted>3d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('MDT-550')}><KeyCell value="MDT-550" /><Cell>Employee search index optimization</Cell><Cell>Story</Cell><Cell bold>MDT</Cell><Cell>Yousif Al-Harbi</Cell><Cell mono muted>3d ago</Cell></Row>
      </V12Table>
      <ScopeBar showing={5} total={12} label="Closed in last 2 weeks" />
      <ExtendLink main="Load earlier closures" hint="28 items, 2-6 weeks ago" />
    </div>
  );
}
