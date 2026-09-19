import { useState } from 'react';
import { LayoutGrid, LayoutList, Search, Download, FileJson, FileSpreadsheet, ExternalLink, Tag, MessageSquare } from 'lucide-react';
import type { ScrapedItemWithCodes, QualitativeCode, SourceType } from '@/types';
import { exportCSV, exportJSON } from '@/utils/export';
import { safeExternalUrl } from '@/utils/url';

interface DataListProps {
  items: ScrapedItemWithCodes[];
  codes: QualitativeCode[];
  activeCodeFilter: string | null;
  onClearCodeFilter: () => void;
  onSelectItem: (id: string) => void;
  onTagItem: (id: string) => void;
  onEditMemo: (id: string) => void;
  selectedItemId: string | null;
}

const SOURCE_CONFIG: Record<SourceType, { label: string; color: string; bg: string }> = {
  twitter: { label: 'X', color: 'text-sky-300', bg: 'bg-sky-500/15 border-sky-500/30' },
  news: { label: 'News', color: 'text-emerald-300', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  blog: { label: 'Blog', color: 'text-amber-300', bg: 'bg-amber-500/15 border-amber-500/30' },
  web: { label: 'Web', color: 'text-slate-300', bg: 'bg-slate-500/15 border-slate-500/30' },
};

export default function DataList({
  items, codes, activeCodeFilter, onClearCodeFilter,
  onSelectItem, onTagItem, onEditMemo, selectedItemId,
}: DataListProps) {
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [quickSearch, setQuickSearch] = useState('');
  const [exportOpen, setExportOpen] = useState(false);

  const filtered = items.filter(item => {
    if (activeCodeFilter) {
      if (!item.codings.some(c => c.code_id === activeCodeFilter)) return false;
    }
    if (quickSearch.trim()) {
      const q = quickSearch.toLowerCase();
      const haystack = `${item.title} ${item.content} ${item.author_name}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const activeCodeName = activeCodeFilter ? codes.find(c => c.id === activeCodeFilter)?.name : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={quickSearch}
            onChange={e => setQuickSearch(e.target.value)}
            placeholder="クイック検索..."
            className="input-field pl-8 py-1.5 text-xs"
          />
        </div>

        {activeCodeName && (
          <button onClick={onClearCodeFilter} className="btn-ghost text-xs text-accent-300">
            <Tag className="h-3 w-3" /> {activeCodeName} &times;
          </button>
        )}

        <div className="flex items-center gap-1 border border-slate-700 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('card')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-brand-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-brand-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <LayoutList className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative">
          <button onClick={() => setExportOpen(!exportOpen)} className="btn-ghost text-xs">
            <Download className="h-3.5 w-3.5" /> エクスポート
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-1 card border border-slate-700 shadow-xl p-1 w-44 z-10">
              <button
                onClick={() => { exportCSV(items, codes); setExportOpen(false); }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs rounded-lg hover:bg-brand-800 text-slate-300"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> CSVダウンロード
              </button>
              <button
                onClick={() => { exportJSON(items, codes); setExportOpen(false); }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs rounded-lg hover:bg-brand-800 text-slate-300"
              >
                <FileJson className="h-3.5 w-3.5 text-sky-400" /> JSONダウンロード
              </button>
            </div>
          )}
        </div>

        <span className="text-xs text-slate-500">{filtered.length}件</span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
          {items.length === 0 ? '検索を実行してデータを収集してください' : '該当するアイテムがありません'}
        </div>
      ) : viewMode === 'card' ? (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filtered.map(item => (
            <CardItem
              key={item.id}
              item={item}
              selected={item.id === selectedItemId}
              onSelect={() => onSelectItem(item.id)}
              onTag={() => onTagItem(item.id)}
              onMemo={() => onEditMemo(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/50 text-left text-slate-500">
                <th className="pb-2 pr-3 font-medium">ソース</th>
                <th className="pb-2 pr-3 font-medium">タイトル / 投稿者</th>
                <th className="pb-2 pr-3 font-medium hidden lg:table-cell">本文（抜粋）</th>
                <th className="pb-2 pr-3 font-medium">タグ</th>
                <th className="pb-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(item => (
                <TableRow
                  key={item.id}
                  item={item}
                  selected={item.id === selectedItemId}
                  onSelect={() => onSelectItem(item.id)}
                  onTag={() => onTagItem(item.id)}
                  onMemo={() => onEditMemo(item.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CardItem({ item, selected, onSelect, onTag, onMemo }: {
  item: ScrapedItemWithCodes; selected: boolean;
  onSelect: () => void; onTag: () => void; onMemo: () => void;
}) {
  const src = SOURCE_CONFIG[item.source_type];
  const linkUrl = safeExternalUrl(item.url);
  return (
    <div
      onClick={onSelect}
      className={`card p-3 cursor-pointer transition-all duration-200
        ${selected ? 'ring-1 ring-accent-500/50 border-accent-500/30' : 'hover:border-slate-600'}`}
    >
      <div className="flex items-start gap-3">
        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-medium ${src.bg} ${src.color}`}>
          {src.label}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-slate-200 truncate">
              {item.title || item.author_name}
            </h3>
            {linkUrl && (
              <a href={linkUrl} target="_blank" rel="noopener noreferrer"
                 onClick={e => e.stopPropagation()}
                 className="text-slate-500 hover:text-accent-400 transition-colors shrink-0">
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {!linkUrl && item.url && (
              <span
                title="安全でない形式のリンクのため無効化されています"
                className="text-[10px] text-amber-500/70 shrink-0 whitespace-nowrap"
              >
                リンク無効
              </span>
            )}
          </div>
          {item.title && item.author_name && (
            <p className="text-[11px] text-slate-500 mt-0.5">{item.author_name}</p>
          )}
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-3 leading-relaxed">
            {item.content}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {item.codings.map(c => (
              <span
                key={c.id}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{ backgroundColor: `${c.code.color_hex}20`, color: c.code.color_hex, border: `1px solid ${c.code.color_hex}30` }}
              >
                {c.code.name}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] text-slate-600">
              {item.published_at ? new Date(item.published_at).toLocaleDateString('ja-JP') : ''}
            </span>
            <div className="flex-1" />
            <button onClick={e => { e.stopPropagation(); onTag(); }} className="btn-ghost text-[11px] py-0.5 px-1.5">
              <Tag className="h-3 w-3" /> コード付与
            </button>
            <button onClick={e => { e.stopPropagation(); onMemo(); }} className="btn-ghost text-[11px] py-0.5 px-1.5">
              <MessageSquare className="h-3 w-3" /> メモ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TableRow({ item, selected, onSelect, onTag, onMemo }: {
  item: ScrapedItemWithCodes; selected: boolean;
  onSelect: () => void; onTag: () => void; onMemo: () => void;
}) {
  const src = SOURCE_CONFIG[item.source_type];
  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer transition-colors ${selected ? 'bg-accent-600/10' : 'hover:bg-brand-800/50'}`}
    >
      <td className="py-2 pr-3">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${src.bg} ${src.color}`}>
          {src.label}
        </span>
      </td>
      <td className="py-2 pr-3">
        <p className="text-slate-200 truncate max-w-[200px]">{item.title || item.author_name}</p>
      </td>
      <td className="py-2 pr-3 hidden lg:table-cell">
        <p className="text-slate-400 truncate max-w-[300px]">{item.content}</p>
      </td>
      <td className="py-2 pr-3">
        <div className="flex flex-wrap gap-1">
          {item.codings.map(c => (
            <span
              key={c.id}
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: c.code.color_hex }}
              title={c.code.name}
            />
          ))}
        </div>
      </td>
      <td className="py-2">
        <div className="flex gap-1">
          <button onClick={e => { e.stopPropagation(); onTag(); }} className="btn-ghost text-[10px] py-0.5 px-1">
            <Tag className="h-3 w-3" />
          </button>
          <button onClick={e => { e.stopPropagation(); onMemo(); }} className="btn-ghost text-[10px] py-0.5 px-1">
            <MessageSquare className="h-3 w-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}
