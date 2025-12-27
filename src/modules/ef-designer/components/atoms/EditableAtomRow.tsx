import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Pencil } from 'lucide-react';

interface EditableAtomRowProps {
  atom: {
    id: string;
    atom_key: string;
    text: string;
    type: string;
    priority: string;
    is_selected?: boolean;
  };
  onUpdate: (atomId: string, updates: Record<string, any>) => void;
  onToggleSelection: (atomId: string, selected: boolean) => void;
}

export const EditableAtomRow: React.FC<EditableAtomRowProps> = ({
  atom,
  onUpdate,
  onToggleSelection,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(atom.text);
  const [editType, setEditType] = useState(atom.type || 'FR');
  const [editPriority, setEditPriority] = useState(atom.priority || 'Should');

  const handleSave = () => {
    onUpdate(atom.id, {
      text: editText,
      type: editType,
      priority: editPriority,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(atom.text);
    setEditType(atom.type || 'FR');
    setEditPriority(atom.priority || 'Should');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <tr className="bg-muted/50">
        <td className="px-4 py-3 text-sm font-mono text-primary">{atom.atom_key}</td>
        <td className="px-4 py-3">
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="text-sm"
            autoFocus
          />
        </td>
        <td className="px-4 py-3">
          <Select value={editType} onValueChange={setEditType}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FR">FR</SelectItem>
              <SelectItem value="NFR">NFR</SelectItem>
            </SelectContent>
          </Select>
        </td>
        <td className="px-4 py-3">
          <Select value={editPriority} onValueChange={setEditPriority}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Must">Must</SelectItem>
              <SelectItem value="Should">Should</SelectItem>
              <SelectItem value="Could">Could</SelectItem>
              <SelectItem value="Wont">Won't</SelectItem>
            </SelectContent>
          </Select>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleSave}>
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-muted/30 transition-colors group">
      <td className="px-4 py-3 text-sm font-mono text-primary">{atom.atom_key}</td>
      <td className="px-4 py-3 text-sm">{atom.text}</td>
      <td className="px-4 py-3">
        <Badge variant="secondary" className="capitalize">
          {atom.type?.replace('_', ' ')}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <Badge 
          variant={atom.priority === 'Must' ? 'destructive' : 'outline'}
          className="capitalize"
        >
          {atom.priority}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={atom.is_selected !== false} 
            onChange={(e) => onToggleSelection(atom.id, e.target.checked)}
            className="h-4 w-4 rounded border-muted cursor-pointer"
          />
          <Button 
            variant="ghost" 
            size="sm" 
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
};