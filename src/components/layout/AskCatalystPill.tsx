import { Box, Flex, Text, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';

const pillStyles = xcss({
  borderRadius: 'border.radius.100',
  borderColor: 'color.border',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  backgroundColor: 'color.background.input',
  paddingInline: 'space.100',
  paddingBlock: 'space.050',
});

export function AskCatalystPill() {
  return (
    <Box as="div" aria-disabled="true" xcss={pillStyles} style={{ opacity: 0.7, cursor: 'not-allowed' }}>
      <Flex alignItems="center" gap="space.100">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 1.5l1.2 3.3 3.3 1.2-3.3 1.2L8 10.5 6.8 7.2 3.5 6l3.3-1.2L8 1.5zM12 9l.7 1.8 1.8.7-1.8.7L12 14l-.7-1.8-1.8-.7 1.8-.7L12 9z" fill={token('color.icon.accent.blue')} />
        </svg>
        <Text size="small" weight="medium">Ask Catalyst</Text>
      </Flex>
    </Box>
  );
}
