import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";

const lowlight = createLowlight(common);

/** Code block with syntax highlighting via lowlight (highlight.js languages). */
export const HighlightedCodeBlock = CodeBlockLowlight.configure({
  lowlight,
  HTMLAttributes: {
    class: "catylast-code-block",
  },
});
