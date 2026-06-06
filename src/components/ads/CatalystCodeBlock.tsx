/**
 * CatalystCodeBlock — ADS-canonical code display.
 * Inline code + code blocks for descriptions and comments.
 */
import { Code, CodeBlock } from '@atlaskit/code';

interface CatalystInlineCodeProps {
  children: string;
}

export function CatalystInlineCode({ children }: CatalystInlineCodeProps) {
  return <Code>{children}</Code>;
}

interface CatalystCodeBlockProps {
  text: string;
  language?: string;
  showLineNumbers?: boolean;
}

export function CatalystCodeBlock({
  text,
  language = 'typescript',
  showLineNumbers = true,
}: CatalystCodeBlockProps) {
  return (
    <CodeBlock
      text={text}
      language={language}
      showLineNumbers={showLineNumbers}
    />
  );
}
