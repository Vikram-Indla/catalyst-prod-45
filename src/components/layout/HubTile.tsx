import { Box, Flex, Stack, Text, xcss } from '@atlaskit/primitives';
import type { ReactNode } from 'react';
import type { HubTileColor } from '@/lib/hubs';

const tileStyles = {
  purple: xcss({ backgroundColor: 'color.background.accent.purple.bolder', color: 'color.text.inverse' }),
  blue: xcss({ backgroundColor: 'color.background.accent.blue.bolder', color: 'color.text.inverse' }),
  teal: xcss({ backgroundColor: 'color.background.accent.teal.bolder', color: 'color.text.inverse' }),
  orange: xcss({ backgroundColor: 'color.background.accent.orange.bolder', color: 'color.text.inverse' }),
  green: xcss({ backgroundColor: 'color.background.accent.green.bolder', color: 'color.text.inverse' }),
  red: xcss({ backgroundColor: 'color.background.accent.red.bolder', color: 'color.text.inverse' }),
  yellow: xcss({ backgroundColor: 'color.background.accent.yellow.bolder', color: 'color.text.inverse' }),
  magenta: xcss({ backgroundColor: 'color.background.accent.magenta.bolder', color: 'color.text.inverse' }),
  lime: xcss({ backgroundColor: 'color.background.accent.lime.bolder', color: 'color.text.inverse' }),
} as const;

const tileLayoutStyles = xcss({
  width: '96px',
  height: '96px',
  borderRadius: 'border.radius.200',
  padding: 'space.100',
});

const glyphStyles = xcss({ width: '24px', height: '24px' });
const labelStyles = xcss({ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });

interface HubTileProps {
  label: string;
  color: HubTileColor;
  glyph?: ReactNode;
  href?: string;
}

export function HubTile({ label, color, glyph, href }: HubTileProps) {
  const content = (
    <Box xcss={[tileLayoutStyles, tileStyles[color]]}>
      <Stack alignInline="center" space="space.150">
        <Box xcss={glyphStyles}>{glyph}</Box>
        <Text size="small" weight="semibold" color="color.text.inverse" xcss={labelStyles}>{label}</Text>
      </Stack>
    </Box>
  );

  if (href) {
    return <a href={href} aria-label={label}>{content}</a>;
  }

  return (
    <Flex alignItems="center" justifyContent="center">
      {content}
    </Flex>
  );
}
