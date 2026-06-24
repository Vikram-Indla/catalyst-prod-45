/**
 * Global Lock Banner
 *
 * Shows when another user is already preparing an Evidence Pack.
 * Only one user can prepare evidence at a time.
 */

import React from 'react';
import { Box, Heading, Inline, Stack } from '@atlaskit/primitives';

interface GlobalLockBannerProps {
  owner: string;
  itemKey: string;
}

export function GlobalLockBanner({ owner, itemKey }: GlobalLockBannerProps) {
  return (
    <Box
      backgroundColor="R75"
      borderColor="R400"
      borderWidth="border.width.0"
      padding="space.200"
      borderStartWidth="border.width.400"
      borderStartColor="R400"
    >
      <Stack space="space.100">
        <Inline space="space.100" alignBlock="center">
          <span style={{ fontSize: '20px' }}>🔒</span>
          <Heading as="h2" level="h300">
            Evidence-to-Execution is currently locked
          </Heading>
        </Inline>
        <div style={{ fontSize: '14px', color: '#172B4D', marginLeft: 24 }}>
          <strong>{owner}</strong> is preparing evidence for <strong>{itemKey}</strong> — Industrial
          License Renewal Enhancement.
        </div>
        <div style={{ fontSize: '13px', color: '#626F86', marginLeft: 24 }}>
          Evidence-to-Execution is locked until this job completes. Check back in a few seconds.
        </div>
      </Stack>
    </Box>
  );
}
