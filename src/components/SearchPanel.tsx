import { useState, type KeyboardEvent } from 'react';
import { ChevronDown, ChevronUp, Search, X, Loader2, AlertTriangle } from 'lucide-react';
import type { SourceType, SearchQuery } from '@/types';

interface SearchPanelProps {
  onSearch: (query: SearchQuery) => Promise<void>;
  searching: boolean;
}

const SOURCE_OPTIONS: { key: SourceType; label: string; color: string }[] = [
  { key: 'twitter', label: 'X (Twitter) ポスト', color: 'bg-sky-500' },
  { key: 'news', label: 'ネットニュース', color: 'bg-emerald-500' },
  { key: 'blog', label: 'ブログ記事', color: 'bg-amber-500' },
  { key: 'web', label: '一般Web / Threads', color: 'bg-slate-500' },
];

const LIMIT_OPTIONS = [10, 25, 50, 100, 200];

export default function SearchPanel({ onSearch, searching }: SearchPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [andTags, setAndTags] = useState<string[]>([]);
  const [andInput, setAndInput] = useState('');
  const [orInput, setOrInput] = useState('');
  const [notInput, setNotInput] = useState('');
  const [sources, setSources] = useState<SourceType[]>([]);
  const [limit, setLimit] = useState(50);

  const handleAndKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && andInput.trim()) {
      e.preventDefault();
      const value = andInput.trim().replace(/,$/, '');
      if (value && !andTags.includes(value)) {
        setAndTags(prev => [...prev, value]);
      }
      setAndInput('');
    } else if (e.key === 'Backspace' && !andInput && andTags.length > 0) {
      setAndTags(prev => prev.slice(0, -1));
    }
  };

  const removeAndTag = (tag: string) => {
    setAndTags(prev => prev.filter(t => t !== tag));
  };

  const toggleSource = (key: SourceType) => {
    setSources(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);
  };

  const handleSearch = () => {
    const queryOr = orInput.trim() ? orInput.trim().split(/[,、\s]+/).filter(Boolean) : [];
    const queryNot = notInput.trim() ? notInput.trim().split(/[,、\s]+/).filter(Boolean) : [];

    onSearch({
      queryAnd: andTags,
      queryOr,
      queryNot,
      selectedSources: sources,
      limit,
    });
  };

  const hasQuery = andTags.length > 0 || orInput.trim() || orInput.trim();

  return (
    <div className="card border border-slate-700/50">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-300 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4 text-accent-400" />
          検索コントロール
        </span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {!collapsed && (
        <div className="border-t border-slate-700/50 px-4 pb-4 pt-3 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">AND（すべての語を含む）</label>
              <div className="input-field flex flex-wrap gap-1.5 min-h-[38px] py-1.5 cursor-text"
                   onClick={() => document.getElementById('and-input')?.focus()}>
                {andTags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-600/20 text-accent-300 text-xs">
                    {tag}
                    <button onClick={() => removeAndTag(tag)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
                <input
                  id="and-input"
                  type="text"
                  value={andInput}
                  onChange={e => setAndInput(e.target.value)}
                  onKeyDown={handleAndKeyDown}
                  placeholder={andTags.length === 0 ? "キーワードを入力してEnter" : ""}
                  className="flex-1 min-w-[80px] bg-transparent outline-none text-sm text-slate-200 placeholder-slate-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">OR（いずれかの語を含む）</label>
              <input
                type="text"
                value={orInput}
                onChange={e => setOrInput(e.target.value)}
                placeholder="スペースまたはカンマ区切り"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">NOT（除外する語）</label>
              <input
                type="text"
                value={notInput}
                onChange={e => setNotInput(e.target.value)}
                placeholder="スペースまたはカンマ区切り"
                className="input-field"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">ソース選択</label>
              <div className="flex flex-wrap gap-2">
                {SOURCE_OPTIONS.map(opt => (
                  <label
                    key={opt.key}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer
                      border transition-all duration-200
                      ${sources.includes(opt.key)
                        ? 'border-accent-500/50 bg-accent-600/15 text-accent-300'
                        : 'border-slate-700 bg-brand-900 text-slate-400 hover:border-slate-600'}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                    <input
                      type="checkbox"
                      checked={sources.includes(opt.key)}
                      onChange={() => toggleSource(opt.key)}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">取得上限</label>
              <select
                value={limit}
                onChange={e => setLimit(Number(e.target.value))}
                className="input-field w-24 pr-8 appearance-none cursor-pointer"
              >
                {LIMIT_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}件</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSearch}
              disabled={searching || !hasQuery}
              className="btn-primary"
            >
              {searching ? (
                <><Loader2 className="h-4 w-4 animate-spin" />検索中...</>
              ) : (
                <><Search className="h-4 w-4" />スクレイピング実行</>
              )}
            </button>
          </div>

          <div className="flex items-start gap-1.5 text-xs text-slate-500">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>実行するとAPI呼び出しが発生します。取得件数に応じてコストが変動する場合があります。</span>
          </div>
        </div>
      )}
    </div>
  );
}
