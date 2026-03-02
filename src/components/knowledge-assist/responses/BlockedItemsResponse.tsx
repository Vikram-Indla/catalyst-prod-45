import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, ScopeBar, ExtendLink } from './KAResponseShared';

export function BlockedItemsResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  return (
    <div>
      <CardHeader icon={ShieldAlert} iconColor="#DC2626" title="Blocked Items" titleColor="#DC2626" subtitle="10 total" />
      <V12Table
        headers={['KEY', 'TITLE', 'REASON', 'ASSIGNEE', 'PROJECT', 'BLOCKED SINCE']}
        widths={['90px', 'auto', '160px', '110px', '90px', '90px']}
      >
        <Row onClick={() => onItemClick?.('SIMP-3172')}><KeyCell value="SIMP-3172" /><Cell>Restricted Chemical Imports Permit</Cell><Cell muted>Accessibility &lt;100</Cell><Cell>Nada Alfassam</Cell><Cell bold>SIMP</Cell><Cell mono muted>2d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('SIMP-3166')}><KeyCell value="SIMP-3166" /><Cell>Restricted Chemical Imports Permit</Cell><Cell muted>Accessibility &lt;100</Cell><Cell>Nada Alfassam</Cell><Cell bold>SIMP</Cell><Cell mono muted>2d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('SIMP-3245')}><KeyCell value="SIMP-3245" /><Cell>Landing Page — Program & Incentives</Cell><Cell muted>Card color mismatch with Figma</Cell><Cell>Nada Alfassam</Cell><Cell bold>SIMP</Cell><Cell mono muted>5d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('SIMP-3133')}><KeyCell value="SIMP-3133" /><Cell>Usage and Disclaimer page</Cell><Cell muted>Accessibility &lt;100</Cell><Cell>Nada Alfassam</Cell><Cell bold>SIMP</Cell><Cell mono muted>3d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('SIMP-3128')}><KeyCell value="SIMP-3128" /><Cell>Usage and Disclaimer footer</Cell><Cell muted>Accessibility &lt;100</Cell><Cell>Nada Alfassam</Cell><Cell bold>SIMP</Cell><Cell mono muted>3d ago</Cell></Row>
      </V12Table>
      <ScopeBar showing={5} total={10} label="Blocked in last 6 weeks" />
      <ExtendLink main="Load older blocked items" hint="3 items beyond 6 weeks" />
    </div>
  );
}
