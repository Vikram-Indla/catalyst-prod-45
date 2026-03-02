import React from 'react';
import { User } from 'lucide-react';
import { CardHeader, V12Table, Row, KeyCell, Cell, Loz, AgeingDot, ScopeBar, ExtendLink, F } from './KAResponseShared';

export function PersonWorkResponse({ onItemClick }: { onItemClick?: (key: string) => void }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <User size={16} strokeWidth={2} color="#2563EB" />
          <span style={{ fontFamily: F.sora, fontSize: 14, fontWeight: 650, color: '#0F172A' }}>Wahid Nasri</span>
          <span style={{ fontSize: 12, color: '#64748B', fontFamily: F.inter }}>— Mobile Developer</span>
        </div>
        <span style={{ fontFamily: F.mono, fontSize: 12, color: '#64748B' }}>📁 Delivery · 20 items</span>
      </div>
      <V12Table
        headers={['KEY', 'TYPE', 'TITLE', 'STATUS', 'REPORTED BY', 'AGEING']}
        widths={['90px', '50px', 'auto', '100px', '110px', '70px']}
      >
        <Row onClick={() => onItemClick?.('BAU-5054')}><KeyCell value="BAU-5054" /><Cell>FE</Cell><Cell>My Requests missing Search & Filter</Cell><Cell><Loz status="RE-OPEN" /></Cell><Cell>Vikram Indla</Cell><Cell><AgeingDot value="4h" /></Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-5070')}><KeyCell value="BAU-5070" /><Cell>FE</Cell><Cell>Individual Dashboard Issues</Cell><Cell><Loz status="RE-OPEN" /></Cell><Cell>Vikram Indla</Cell><Cell><AgeingDot value="4h" /></Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-5073')}><KeyCell value="BAU-5073" /><Cell>FE</Cell><Cell>More Screen Issues</Cell><Cell><Loz status="RE-OPEN" /></Cell><Cell>Vikram Indla</Cell><Cell><AgeingDot value="5h" /></Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-5074')}><KeyCell value="BAU-5074" /><Cell>FE</Cell><Cell>Notification Screen Issues</Cell><Cell><Loz status="DEFERRED" /></Cell><Cell>Vikram Indla</Cell><Cell><AgeingDot value="15h" /></Cell></Row>
        <Row onClick={() => onItemClick?.('BAU-5027')}><KeyCell value="BAU-5027" /><Cell>FE</Cell><Cell>Entity Page Issues</Cell><Cell><Loz status="RE-OPEN" /></Cell><Cell>Vikram Indla</Cell><Cell><AgeingDot value="17h" /></Cell></Row>
      </V12Table>
      <ScopeBar showing={5} total={14} label="Active in last 6 weeks" />
      <ExtendLink main="Load older items" hint="6 items beyond 6 weeks" />
    </div>
  );
}
