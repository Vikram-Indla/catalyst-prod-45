import { BacklogItem, BacklogMeta, BacklogPISection } from '../types';
import { BacklogSection } from './BacklogSection';

interface BacklogListViewProps {
  items: BacklogItem[];
  sections?: BacklogPISection[];
  meta?: BacklogMeta;
  selectedItems: string[];
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
}

export function BacklogListView({
  items,
  sections,
  meta,
  selectedItems,
  onItemClick,
  onItemSelect,
}: BacklogListViewProps) {
  // If we have sections, render grouped by PI
  if (sections && sections.length > 0) {
    return (
      <div className="p-4 space-y-4">
        {sections.map((section) => (
          <BacklogSection
            key={section.id}
            section={section}
            selectedItems={selectedItems}
            onItemClick={onItemClick}
            onItemSelect={onItemSelect}
          />
        ))}
      </div>
    );
  }

  // Otherwise render flat list
  return (
    <div className="p-4">
      <BacklogSection
        section={{
          id: 'all',
          type: 'pi',
          title: 'All Items',
          itemCount: items.length,
          isExpanded: true,
          items,
        }}
        selectedItems={selectedItems}
        onItemClick={onItemClick}
        onItemSelect={onItemSelect}
      />
    </div>
  );
}

