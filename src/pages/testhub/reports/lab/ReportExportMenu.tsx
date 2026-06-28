import React from 'react';
import Button from '@atlaskit/button/standard-button';
import Tooltip from '@atlaskit/tooltip';

const LAB_MSG = 'Export available after lab approval and real data wiring.';

export default function ReportExportMenu() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <Tooltip content={LAB_MSG}>
        <Button appearance="subtle" isDisabled>
          Export CSV
        </Button>
      </Tooltip>
      <Tooltip content={LAB_MSG}>
        <Button appearance="subtle" isDisabled>
          Export XLSX
        </Button>
      </Tooltip>
      <Tooltip content={LAB_MSG}>
        <Button appearance="subtle" isDisabled>
          Share
        </Button>
      </Tooltip>
      <Tooltip content={LAB_MSG}>
        <Button appearance="subtle" isDisabled>
          Save view
        </Button>
      </Tooltip>
    </div>
  );
}
