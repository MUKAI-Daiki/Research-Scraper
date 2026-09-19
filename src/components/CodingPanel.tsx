import { useState } from 'react';
import { Plus, Palette, Tag, Trash2, Save, Loader2 } from 'lucide-react';
import type { QualitativeCode, ScrapedItemWithCodes, ItemCoding } from '@/types';

interface CodingPanelProps {
  codes: QualitativeCode[];
  items: ScrapedItemWithCodes[];
  selectedItem: ScrapedItemWithCodes | null;
  activeCodeFilter: string | null;
  onFilterByCode: (codeId: string | null) => void;
  onCreateCode: (name: string, colorHex: string, description: string) => Promise<void>;
  onDeleteCode: (id: string) => Promise<void>;
  onToggleCode: (itemId: string, codeId: string) => Promise<void>;
  onSaveMemo: (codingId: string, memo: string) => Promise<void>;
}

const COLOR_PALETTE = [
  '#3B82F6', '#06B6D4', '#10B981', '#84CC16',
  '#EAB308', '#F97316', '#EF4444', '#EC4899',
  '#8B5CF6', '#6366F1', '#78716C', '#64748B',
];

export default function CodingPanel({
  codes, items, selectedItem, activeCodeFilter,
  onFilterByCode, onCreateCode, onDeleteCode, onToggleCode, onSaveMemo,
}: CodingPanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0]);
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await onCreateCode(newName.trim(), newColor, newDesc.trim());
      setNewName('');
      setNewDesc('');
      setShowCreateForm(false);
    } finally {
      setCreating(false);
    }
  };

  const codeCountMap = new Map<string, number>();
  items.forEach(item => {
    item.codings.forEach(c => {
      codeCountMap.set(c.code_id, (codeCountMap.get(c.code_id) || 0) + 1);
    });
  });

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="card border border-slate-700/50 p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5 text-accent-400" />
            コード管理
          </h3>
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-ghost text-[11px]">
            <Plus className="h-3 w-3" /> 新規
          </button>
        </div>

        {showCreateForm && (
          <div className="space-y-2 mb-3 p-2.5 rounded-lg bg-brand-800/50 border border-slate-700/50">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="コード名"
              className="input-field text-xs py-1.5"
            />
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PALETTE.map(color => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`w-5 h-5 rounded-full border-2 transition-all
                    ${color === newColor ? 'border-white scale-110' : 'border-transparent hover:border-slate-500'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <input
              type="text"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="説明（任意）"
              className="input-field text-xs py-1.5"
            />
            <button onClick={handleCreate} disabled={!newName.trim() || creating} className="btn-primary text-xs w-full py-1.5">
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              コードを作成
            </button>
          </div>
        )}

        <div className="space-y-1 max-h-[280px] overflow-y-auto">
          {codes.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-3">コードを作成してください</p>
          ) : codes.map(code => (
            <div
              key={code.id}
              onClick={() => onFilterByCode(activeCodeFilter === code.id ? null : code.id)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all group
                ${activeCodeFilter === code.id ? 'bg-accent-600/15 ring-1 ring-accent-500/30' : 'hover:bg-brand-800'}`}
            >
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: code.color_hex }} />
              <span className="text-xs text-slate-300 flex-1 truncate" title={code.description || code.name}>
                {code.name}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {codeCountMap.get(code.id) || 0}
              </span>
              <button
                onClick={e => { e.stopPropagation(); onDeleteCode(code.id); }}
                className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedItem && (
        <SelectedItemDetail
          item={selectedItem}
          codes={codes}
          onToggleCode={onToggleCode}
          onSaveMemo={onSaveMemo}
        />
      )}
    </div>
  );
}

function SelectedItemDetail({ item, codes, onToggleCode, onSaveMemo }: {
  item: ScrapedItemWithCodes;
  codes: QualitativeCode[];
  onToggleCode: (itemId: string, codeId: string) => Promise<void>;
  onSaveMemo: (codingId: string, memo: string) => Promise<void>;
}) {
  const assignedCodeIds = new Set(item.codings.map(c => c.code_id));

  return (
    <div className="card border border-slate-700/50 p-3 flex-1 flex flex-col min-h-0">
      <h3 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
        <Tag className="h-3.5 w-3.5 text-accent-400" />
        選択中: {item.title || item.author_name || '無題'}
      </h3>

      <div className="mb-3">
        <p className="text-[11px] text-slate-500 mb-1.5">コード付与</p>
        <div className="flex flex-wrap gap-1.5">
          {codes.map(code => (
            <button
              key={code.id}
              onClick={() => onToggleCode(item.id, code.id)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium
                border transition-all duration-200
                ${assignedCodeIds.has(code.id)
                  ? 'border-opacity-50 opacity-100'
                  : 'border-transparent opacity-50 hover:opacity-80'}`}
              style={{
                backgroundColor: `${code.color_hex}${assignedCodeIds.has(code.id) ? '30' : '10'}`,
                color: code.color_hex,
                borderColor: assignedCodeIds.has(code.id) ? `${code.color_hex}50` : 'transparent',
              }}
            >
              {code.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        <p className="text-[11px] text-slate-500">考察メモ</p>
        {item.codings.length === 0 ? (
          <p className="text-xs text-slate-500 italic">コードを付与するとメモを記入できます</p>
        ) : item.codings.map(coding => (
          <MemoField key={coding.id} coding={coding} onSave={onSaveMemo} />
        ))}
      </div>
    </div>
  );
}

function MemoField({ coding, onSave }: { coding: ItemCoding & { code: QualitativeCode }; onSave: (id: string, memo: string) => Promise<void> }) {
  const [value, setValue] = useState(coding.memo);
  const [saving, setSaving] = useState(false);
  const changed = value !== coding.memo;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(coding.id, value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: coding.code.color_hex }} />
        <span className="text-[10px] text-slate-400">{coding.code.name}</span>
      </div>
      <div className="flex gap-1.5">
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="考察メモを入力..."
          rows={2}
          className="input-field text-xs py-1.5 flex-1 resize-none"
        />
        {changed && (
          <button onClick={handleSave} disabled={saving} className="btn-primary text-[10px] px-2 py-1 self-end">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          </button>
        )}
      </div>
    </div>
  );
}
