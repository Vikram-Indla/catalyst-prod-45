import React from 'react';
import { RotateCcw } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, Loz, ScopeBar, ExtendLink } from './KAResponseShared';

export function ReopenedItemsResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  return (
    <div>
      <CardHeader icon={RotateCcw} iconColor="#D97706" title="Re-opened Items" titleColor="#D97706" subtitle="5 bounced back" />
      <V12Table
        headers={['KEY', 'TITLE', 'STATUS', 'ASSIGNEE', 'PROJECT', 'RE-OPENED']}
        widths={['90px', 'auto', '100px', '110px', '100px', '80px']}
      >
        <Row onClick={() => onItemClick?.('BAU-5054')}><KeyCell value="BAU-5054" /><Cell>My Requests missing Search & Filter</Cell><Cell><Loz status="RE-OPEN" /></Cell><Cell>Wahid Nasri</Cell><Cell bold>Senaei BAU</Cell><Cell mono muted>3h ago</Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-5074')}><KeyCell value="BAU-5074" /><Cell>Notification Screen Issues</Cell><Cell><Loz status="RE-OPEN" /></Cell><Cell>Wahid Nasri</Cell><Cell bold>Senaei BAU</Cell><Cell mono muted>5h ago</Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-5070')}><KeyCell value="BAU-5070" /><Cell>Individual Dashboard Issues</Cell><Cell><Loz status="RE-OPEN" /></Cell><Cell>Raza Bangi</Cell><Cell bold>Senaei BAU</Cell><Cell mono muted>8h ago</Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-5073')}><KeyCell value="BAU-5073" /><Cell>More Screen Issues</Cell><Cell><Loz status="RE-OPEN" /></Cell><Cell>Wahid Nasri</Cell><Cell bold>Senaei BAU</Cell><Cell mono muted>12h ago</Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-5027')}><KeyCell value="BAU-5027" /><Cell>Entity Page Issues</Cell><Cell><Loz status="RE-OPEN" /></Cell><Cell>Wahid Nasri</Cell><Cell bold>Senaei BAU</Cell><Cell mono muted>17h ago</Cell></Row>
      </V12Table>
      <ScopeBar showing={5} total={5} label="Re-opened in last 2 weeks" />
      <ExtendLink main="Load older re-opens" hint="3 items, 2-6 weeks ago" />
    </div>
  );
}
