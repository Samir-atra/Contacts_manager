import React, { useState } from 'react';
import { Group } from '../types';
import { Plus, Trash2 } from 'lucide-react';
import { generateId, getRandomColor } from '../utils';

interface GroupManagerProps {
  groups: Group[];
  onAddGroup: (group: Group) => void;
  onDeleteGroup: (groupId: string) => void;
}

export const GroupManager: React.FC<GroupManagerProps> = ({ groups, onAddGroup, onDeleteGroup }) => {
  const [newGroupName, setNewGroupName] = useState('');

  const handleAdd = () => {
    if (!newGroupName.trim()) return;
    const newGroup: Group = {
      id: generateId(),
      name: newGroupName.trim(),
      color: getRandomColor()
    };
    onAddGroup(newGroup);
    setNewGroupName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="New group name..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={!newGroupName.trim()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Plus size={18} />
          Add
        </button>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {groups.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No custom groups created yet.</p>
        ) : (
          groups.map(group => (
            <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${group.color}`}></span>
                <span className="font-medium text-gray-700">{group.name}</span>
              </div>
              <button
                onClick={() => onDeleteGroup(group.id)}
                className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                title="Delete group"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
