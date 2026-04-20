import { Box, Flex, Text, xcss } from '@atlaskit/primitives';
import type { ReactNode } from 'react';

const tileStyles = xcss({
  width: 'size.400',
  height: 'size.400',
  borderRadius: 'border.radius.100',
  color: 'color.text.inverse',
});

interface HubTileProps {
  label: string;
  backgroundColor: string;
  glyph?: ReactNode;
  initials?: string;
}

export function HubTile({ label, backgroundColor, glyph, initials }: HubTileProps) {
  return (
    <Box xcss={tileStyles} backgroundColor={backgroundColor as never} aria-hidden="true">
      <Flex alignItems="center" justifyContent="center" xcss={xcss({ height: '100%' })}>
        {glyph ?? <Text size="small" weight="bold" color="color.text.inverse">{initials ?? label.slice(0, 2).toUpperCase()}</Text>}
      </Flex>
    </Box>
  );
}
