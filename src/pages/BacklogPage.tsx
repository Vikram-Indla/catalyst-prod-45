import { useState } from 'react';
import { BacklogHeader } from '@/components/backlog/BacklogHeader';
import { BacklogSection } from '@/components/backlog/BacklogSection';
import { VIEWING_OPTIONS, BACKLOG_SECTIONS, PROGRAMS } from '@/data/backlogSeedData';
import { BacklogSection as BacklogSectionType } from '@/types/backlog.types';

export default function BacklogPage() {
  const [selectedViewingId, setSelectedViewingId] = useState('epic');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'list' | 'kanban' | 'unassigned'>('list');
  const [sections, setSections] = useState<BacklogSectionType[]>(BACKLOG_SECTIONS);

  const handleToggleExpand = (sectionId: string) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, isExpanded: !section.isExpanded }
        : section
    ));
  };

  const handleAddEpic = (title: string, programId: string) => {
    console.log('Adding epic:', title, programId);
    // TODO: Implement actual epic creation
  };

  const handleEpicClick = (epicId: string) => {
    console.log('Epic clicked:', epicId);
    // TODO: Phase 3 - Open detail panel
  };

  return (
    <div className="min-h-screen bg-white">
      <BacklogHeader 
        viewingOptions={VIEWING_OPTIONS}
        selectedViewingId={selectedViewingId}
        onViewingSelect={setSelectedViewingId}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <div className="px-6 py-6">
        <h2 className="text-2xl font-semibold text-[#172B4D] mb-6">
          All Programs for Digital Services
        </h2>

        {sections.map((section) => (
          <BacklogSection 
            key={section.id}
            section={section}
            programs={PROGRAMS}
            onToggleExpand={handleToggleExpand}
            onAddEpic={handleAddEpic}
            onEpicClick={handleEpicClick}
          />
        ))}
      </div>
    </div>
  );
}
