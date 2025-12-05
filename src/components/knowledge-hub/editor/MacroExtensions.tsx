import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Info, AlertTriangle, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

// Info Panel Extension
const InfoPanelComponent = () => {
  return (
    <NodeViewWrapper className="info-panel">
      <div className="flex items-start gap-2">
        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <NodeViewContent className="flex-1" />
      </div>
    </NodeViewWrapper>
  );
};

export const InfoPanelExtension = Node.create({
  name: 'infoPanel',
  group: 'block',
  content: 'block+',
  
  parseHTML() {
    return [{ tag: 'div[data-type="info-panel"]' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'info-panel', class: 'info-panel' }), 0];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(InfoPanelComponent);
  },
});

// Warning Panel Extension
const WarningPanelComponent = () => {
  return (
    <NodeViewWrapper className="warning-panel">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <NodeViewContent className="flex-1" />
      </div>
    </NodeViewWrapper>
  );
};

export const WarningPanelExtension = Node.create({
  name: 'warningPanel',
  group: 'block',
  content: 'block+',
  
  parseHTML() {
    return [{ tag: 'div[data-type="warning-panel"]' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'warning-panel', class: 'warning-panel' }), 0];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(WarningPanelComponent);
  },
});

// Note Panel Extension
const NotePanelComponent = () => {
  return (
    <NodeViewWrapper className="note-panel">
      <div className="flex items-start gap-2">
        <FileText className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
        <NodeViewContent className="flex-1" />
      </div>
    </NodeViewWrapper>
  );
};

export const NotePanelExtension = Node.create({
  name: 'notePanel',
  group: 'block',
  content: 'block+',
  
  parseHTML() {
    return [{ tag: 'div[data-type="note-panel"]' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'note-panel', class: 'note-panel' }), 0];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(NotePanelComponent);
  },
});

// Expand/Collapse Extension
const ExpandComponent = ({ node }: { node: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <NodeViewWrapper className="expand-panel" data-open={isOpen}>
      <div 
        className="expand-header flex items-center gap-2 p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span className="font-medium">{node.attrs.title || 'Click to expand'}</span>
      </div>
      {isOpen && (
        <div className="expand-content p-3">
          <NodeViewContent />
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const ExpandExtension = Node.create({
  name: 'expand',
  group: 'block',
  content: 'block+',
  
  addAttributes() {
    return {
      title: {
        default: 'Click to expand',
      },
    };
  },
  
  parseHTML() {
    return [{ tag: 'details[data-type="expand"]' }];
  },
  
  renderHTML({ HTMLAttributes, node }) {
    return [
      'details',
      mergeAttributes(HTMLAttributes, { 'data-type': 'expand', class: 'expand-panel' }),
      ['summary', {}, node.attrs.title],
      ['div', { class: 'expand-content' }, 0],
    ];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(ExpandComponent);
  },
});
