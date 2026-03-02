import React from 'react';
import { Bug } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, Loz, ScopeBar, ExtendLink } from './KAResponseShared';

export function NewDefectsResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  return (
    <div>
      <CardHeader icon={Bug} iconColor="#DC2626" title="New Defects" titleColor="#DC2626" subtitle="14 logged this week" />
      <V12Table
        headers={['KEY', 'TITLE', 'SEVERITY', 'PROJECT', 'REPORTED BY', 'ASSIGNEE', 'LOGGED']}
        widths={['90px', 'auto', '60px', '90px', '100px', '100px', '65px']}
      >
        <Row onClick={() => onItemClick?.('BAU-5082')}><KeyCell value="BAU-5082" /><Cell>Login timeout on mobile Safari</Cell><Cell><Loz status="P1" /></Cell><Cell bold>Senaei BAU</Cell><Cell>Vikram Indla</Cell><Cell>Wahid Nasri</Cell><Cell mono muted>4h ago</Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-5081')}><KeyCell value="BAU-5081" /><Cell>Search returns stale cached results</Cell><Cell><Loz status="P2" /></Cell><Cell bold>Senaei BAU</Cell><Cell>Nada Alfassam</Cell><Cell>Imran Aslam</Cell><Cell mono muted>6h ago</Cell></Row>
        <Row onClick={() => onItemClick?.('SIMP-3295')}><KeyCell value="SIMP-3295" /><Cell>Permit PDF generation fails on Arabic text</Cell><Cell><Loz status="P1" /></Cell><Cell bold>SIMP</Cell><Cell>Sara Ahmad</Cell><Cell>Raza Bangi</Cell><Cell mono muted>1d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-5079')}><KeyCell value="BAU-5079" /><Cell>Dashboard chart axis misalignment</Cell><Cell><Loz status="P3" /></Cell><Cell bold>Senaei BAU</Cell><Cell>Wahid Nasri</Cell><Cell>Imran Aslam</Cell><Cell mono muted>1d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('MDT-558')}><KeyCell value="MDT-558" /><Cell>Employee data sync 15min delay</Cell><Cell><Loz status="P2" /></Cell><Cell bold>MDT</Cell><Cell>Yousif Al-Harbi</Cell><Cell>Raza Bangi</Cell><Cell mono muted>2d ago</Cell></Row>
      </V12Table>
      <ScopeBar showing={5} total={14} label="Logged in last 2 weeks" />
      <ExtendLink main="Load older defects" hint="23 items, 2-6 weeks ago" />
    </div>
  );
}
