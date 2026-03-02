import React from 'react';
import { FilePlus } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, ScopeBar, ExtendLink } from './KAResponseShared';

export function NewStoriesResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  return (
    <div>
      <CardHeader icon={FilePlus} iconColor="#2563EB" title="New Stories" subtitle="8 created in last 2 weeks" />
      <V12Table
        headers={['KEY', 'TITLE', 'PROJECT', 'CREATED BY', 'ASSIGNEE', 'CREATED']}
        widths={['100px', 'auto', '100px', '110px', '110px', '70px']}
      >
        <Row onClick={() => onItemClick?.('BAU-5080')}><KeyCell value="BAU-5080" /><Cell>New permit application flow</Cell><Cell bold>Senaei BAU</Cell><Cell>Vikram Indla</Cell><Cell>Wahid Nasri</Cell><Cell mono muted>1d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-5078')}><KeyCell value="BAU-5078" /><Cell>Dashboard widget redesign</Cell><Cell bold>Senaei BAU</Cell><Cell>Vikram Indla</Cell><Cell>Imran Aslam</Cell><Cell mono muted>2d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('SIMP-3290')}><KeyCell value="SIMP-3290" /><Cell>Chemical import validation rules</Cell><Cell bold>SIMP</Cell><Cell>Sara Ahmad</Cell><Cell>Nada Alfassam</Cell><Cell mono muted>3d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-5076')}><KeyCell value="BAU-5076" /><Cell>Notification preferences page</Cell><Cell bold>Senaei BAU</Cell><Cell>Vikram Indla</Cell><Cell>Wahid Nasri</Cell><Cell mono muted>4d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('MDT-560')}><KeyCell value="MDT-560" /><Cell>Employee profile API v3</Cell><Cell bold>MDT</Cell><Cell>Yousif Al-Harbi</Cell><Cell>Raza Bangi</Cell><Cell mono muted>5d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-5075')}><KeyCell value="BAU-5075" /><Cell>Search filter enhancement</Cell><Cell bold>Senaei BAU</Cell><Cell>Vikram Indla</Cell><Cell>Wahid Nasri</Cell><Cell mono muted>6d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('SIMP-3285')}><KeyCell value="SIMP-3285" /><Cell>Landing page restructure</Cell><Cell bold>SIMP</Cell><Cell>Vikram Indla</Cell><Cell>Nada Alfassam</Cell><Cell mono muted>8d ago</Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-5072')}><KeyCell value="BAU-5072" /><Cell>Entity page refactor</Cell><Cell bold>Senaei BAU</Cell><Cell>Vikram Indla</Cell><Cell>Imran Aslam</Cell><Cell mono muted>10d ago</Cell></Row>
      </V12Table>
      <ScopeBar showing={8} total={8} label="Created in last 2 weeks" />
      <ExtendLink main="Load earlier stories" hint="14 items, 2-6 weeks ago" />
    </div>
  );
}
