import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, Search as SearchIcon, Database, Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { Search } from '@/types';

interface HeaderProps {
  searches: Search[];
  activeSearchId: string | null;
  onSelectSearch: (id: string | null) => void;
  adminMode?: boolean;
  onToggleAdmin?: () => void;
}

export default function Header({ searches, activeSearchId, onSelectSearch, adminMode, onToggleAdmin }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const activeSearch = searches.find(s => s.id === activeSearchId);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.email || '';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700/50 bg-brand-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4">
        <div className="flex items-center gap-2 mr-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-600/20">
            {adminMode ? <Shield className="w-4 h-4 text-accent-400" /> : <Database className="w-4 h-4 text-accent-400" />}
          </div>
          <h1 className="text-sm font-semibold text-white hidden sm:block whitespace-nowrap">
            {adminMode ? '管理コンソール' : 'Research Scraper & Coding Studio'}
          </h1>
        </div>

        {adminMode ? (
          <button
            onClick={onToggleAdmin}
            className="btn-ghost flex items-center gap-1.5 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            研究ツールに戻る
          </button>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="btn-ghost flex items-center gap-2 max-w-[240px]"
            >
              <SearchIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs">
                {activeSearch
                  ? `${activeSearch.query_and.join(' ')} (${new Date(activeSearch.created_at).toLocaleDateString('ja-JP')})`
                  : '検索履歴を選択'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-72 card border border-slate-700 shadow-xl p-1 max-h-64 overflow-y-auto">
                <button
                  onClick={() => { onSelectSearch(null); setDropdownOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-brand-800 text-slate-400"
                >
                  新規検索
                </button>
                {searches.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { onSelectSearch(s.id); setDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors
                      ${s.id === activeSearchId ? 'bg-accent-600/20 text-accent-300' : 'hover:bg-brand-800 text-slate-300'}`}
                  >
                    <span className="font-medium">{s.query_and.join(', ') || s.query_or.join(', ') || '(empty)'}</span>
                    <span className="block text-slate-500 mt-0.5">
                      {new Date(s.created_at).toLocaleDateString('ja-JP')} ・ {s.total_results}件
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          {!adminMode && onToggleAdmin && (
            <button
              onClick={onToggleAdmin}
              className="btn-ghost flex items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300"
              title="管理コンソール"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden md:inline">管理</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full" />
            ) : (
              <div className="h-7 w-7 rounded-full bg-brand-700 flex items-center justify-center text-xs font-medium text-slate-300">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs text-slate-300 hidden md:block max-w-[160px] truncate">
              {displayName}
            </span>
          </div>
          <button onClick={signOut} className="btn-ghost text-slate-500 hover:text-red-400" title="サインアウト">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
