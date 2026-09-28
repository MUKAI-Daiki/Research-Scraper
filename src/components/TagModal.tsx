import { useState, type KeyboardEvent } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import type { QualitativeCode } from '@/types';

const QUICK_COLORS = [
  '#3B82F6', '#06B6D4', '#10B981', '#84CC16',
  '#EAB308', '#F97316', '#EF4444', '#EC4899',
  '#8B5CF6', '#6366F1', '#78716C', '#64748B',
];

interface TagModalProps {
  codes: QualitativeCode[];
  assignedCodeIds: Set<string>;
  onToggle: (codeId: string) => void;
  onCreateCode: (name: string, colorHex: string, description: string) => Promise<void>;
  onClose: () => void;
}

export default function TagModal({ codes, assignedCodeIds, onToggle, onCreateCode, onClose }: TagModalProps) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(QUICK_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      await onCreateCode(newName.trim(), newColor, '');
      setNewName('');
      setNewColor(QUICK_COLORS[Math.floor(Math.random() * QUICK_COLORS.length)]);
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newName.trim()) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="card border border-slate-700 p-4 w-full sm:max-w-sm shadow-2xl rounded-t-2xl sm:rounded-xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">コードを付与 / 解除</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Inline create */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="新しいラベル名を入力..."
              className="input-field text-xs py-2 pr-8 w-full"
            />
            <button
              onClick={() => {
                const idx = QUICK_COLORS.indexOf(newColor);
                setNewColor(QUICK_COLORS[(idx + 1) % QUICK_COLORS.length]);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-slate-600"
              style={{ backgroundColor: newColor }}
              title="色を変更"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            className="btn-primary text-xs px-3 py-2 shrink-0"
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Existing codes */}
        {codes.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">上のフィールドからラベルを作成してください</p>
        ) : (
          <div className="space-y-1.5 overflow-y-auto flex-1 -mx-1 px-1">
            {codes.map(code => {
              const assigned = assignedCodeIds.has(code.id);
              return (
                <button
                  key={code.id}
                  onClick={() => onToggle(code.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs transition-all
                    border ${assigned
                      ? 'border-opacity-50 bg-opacity-20'
                      : 'border-transparent hover:bg-brand-800'}`}
                  style={assigned ? {
                    backgroundColor: `${code.color_hex}15`,
                    borderColor: `${code.color_hex}40`,
                  } : {}}
                >
                  <div
                    className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0"
                    style={{
                      borderColor: code.color_hex,
                      backgroundColor: assigned ? code.color_hex : 'transparent',
                    }}
                  >
                    {assigned && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-slate-300 text-left">{code.name}</span>
                  {code.description && (
                    <span className="text-slate-500 truncate ml-auto text-[10px]">{code.description}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
