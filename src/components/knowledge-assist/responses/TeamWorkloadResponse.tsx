import React from 'react';
import { Users } from 'lucide-react';
import { CardHeader, V12Table, Row, Cell, Loz, F } from './KAResponseShared';

export function TeamWorkloadResponse() {
  return (
    <div>
      <CardHeader icon={Users} iconColor="#7C3AED" title="Team Workload" subtitle="5 team members" />
      <V12Table
        headers={['MEMBER', 'ROLE', 'ACTIVE', 'BLOCKED', 'CLOSED', 'STATUS']}
        widths={['130px', '90px', '70px', '70px', '70px', '100px']}
      >
        <Row><Cell bold>Wahid Nasri</Cell><Cell>Mobile FE</Cell><Cell mono>20</Cell><Cell mono>0</Cell><Cell mono>4</Cell><Cell><Loz status="AT CAPACITY" /></Cell></Row>
        <Row><Cell bold>Nada Alfassam</Cell><Cell>QA</Cell><Cell mono>15</Cell><Cell mono>7</Cell><Cell mono>1</Cell><Cell><Loz status="BLOCKED" /></Cell></Row>
        <Row><Cell bold>Raza Bangi</Cell><Cell>Backend</Cell><Cell mono>8</Cell><Cell mono>0</Cell><Cell mono>3</Cell><Cell><Loz status="AVAILABLE" /></Cell></Row>
        <Row><Cell bold>Yousif Al-Harbi</Cell><Cell>Backend</Cell><Cell mono>8</Cell><Cell mono>0</Cell><Cell mono>2</Cell><Cell><Loz status="AT CAPACITY" /></Cell></Row>
        <Row><Cell bold>Sara Ahmad</Cell><Cell>BA</Cell><Cell mono>4</Cell><Cell mono>0</Cell><Cell mono>2</Cell><Cell><Loz status="AVAILABLE" /></Cell></Row>
      </V12Table>
    </div>
  );
}
