import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Program } from '@/types/backlog.types';

interface QuickAddRowProps {
  programs: Program[];
  onAdd: (title: string, programId: string) => void;
}

export function QuickAddRow({ programs, onAdd }: QuickAddRowProps) {
  const [epicName, setEpicName] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string>('');

  const handleAdd = () => {
    if (epicName.trim() && selectedProgram) {
      onAdd(epicName.trim(), selectedProgram);
      setEpicName('');
      setSelectedProgram('');
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-b border-[#EBECF0] bg-white">
      <input
        type="text"
        placeholder="New Epic Name..."
        value={epicName}
        onChange={(e) => setEpicName(e.target.value)}
        className="flex-1 max-w-[400px] px-3 py-2 border border-[#DFE1E6] rounded text-sm text-[#172B4D] placeholder:text-[#97A0AF] focus:border-[#0052CC] focus:outline-none focus:ring-2 focus:ring-[#DEEBFF]"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && epicName.trim() && selectedProgram) {
            handleAdd();
          }
        }}
      />
      
      <Select value={selectedProgram} onValueChange={setSelectedProgram}>
        <SelectTrigger className="w-[150px] border-[#DFE1E6] text-sm">
          <SelectValue placeholder="Select Program" />
        </SelectTrigger>
        <SelectContent>
          {programs.map((program) => (
            <SelectItem key={program.id} value={program.id}>
              {program.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        onClick={handleAdd}
        disabled={!epicName.trim() || !selectedProgram}
        className="flex items-center gap-1.5 px-4 py-2 border border-[#DFE1E6] rounded text-sm text-[#172B4D] bg-white hover:bg-[#F4F5F7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add
      </button>

      <div className="ml-auto flex items-center gap-1 px-3 text-sm text-[#6B778C] cursor-pointer hover:text-[#172B4D]">
        Labels
        <span className="ml-1">▼</span>
      </div>
    </div>
  );
}
