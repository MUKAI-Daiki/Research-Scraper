import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { safeExternalUrl } from '@/utils/url';
import {
  ArrowLeft, Search as SearchIcon, FileText, Tags, MessageSquare,
  Calendar, ExternalLink, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { SourceType } from '@/types';

interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  role: string;
  created_at: string;
}

interface UserSearch {
  id: string;
  query_and: string[];
  query_or: string[];
  query_not: string[];
  selected_sources: SourceType[];
  total_results: number;
  created_at: string;
}

interface UserItem {
  id: string;
  search_id: string;
  source_type: SourceType;
  title: string;
  content: string;
  url: string;
  author_name: string;
  published_at: string | null;
  created_at: string;
}

interface UserCode {
  id: string;
  name: string;
  color_hex: string;
  description: string;
  created_at: string;
}

interface UserCoding {
  id: string;
  item_id: string;
  code_id: string;
  memo: string;
  code: { name: string; color_hex: string } | null;
  item: { title: string; content: string } | null;
}

interface Props {
  user: Profile;
  onBack: () => void;
}

export default function UserDetailView({ user, onBack }: Props) {
  const { addToast } = useToast();
  const [searches, setSearches] = useState<UserSearch[]>([]);
  const [codes, setCodes] = useState<UserCode[]>([]);
  const [expandedSearchId, setExpandedSearchId] = useState<string | null>(null);
  const [searchItems, setSearchItems] = useState<Map<string, UserItem[]>>(new Map());
  const [codings, setCodings] = useState<UserCoding[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'searches' | 'codes' | 'codings'>('searches');

  const loadData = useCallback(async () => {
    setLoading(true);

    const [searchRes, codeRes, codingRes] = await Promise.all([
      supabase
        .from('searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('qualitative_codes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('item_codings')
        .select('*, code:qualitative_codes(name, color_hex), item:scraped_items(title, content)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (searchRes.error) addToast('検索履歴の読み込みに失敗しました', 'error');
    if (codeRes.error) addToast('コードの読み込みに失敗しました', 'error');
    if (codingRes.error) addToast('コーディングの読み込みに失敗しました', 'error');

    setSearches(searchRes.data || []);
    setCodes(codeRes.data || []);
    setCodings((codingRes.data || []) as unknown as UserCoding[]);
    setLoading(false);
  }, [user.id, addToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadSearchItems = useCallback(async (searchId: string) => {
    if (searchItems.has(searchId)) return;
    const { data, error } = await supabase
      .from('scraped_items')
      .select('*')
      .eq('search_id', searchId)
      .order('created_at', { ascending: true });
    if (error) {
      addToast('データの読み込みに失敗しました', 'error');
      return;
    }
    setSearchItems(prev => new Map(prev).set(searchId, data || []));
  }, [searchItems, addToast]);

  const toggleSearch = (searchId: string) => {
    if (expandedSearchId === searchId) {
      setExpandedSearchId(null);
    } else {
      setExpandedSearchId(searchId);
      loadSearchItems(searchId);
    }
  };

  const tabs = [
    { key: 'searches' as const, label: '検索履歴', icon: SearchIcon, count: searches.length },
    { key: 'codes' as const, label: 'コード', icon: Tags, count: codes.length },
    { key: 'codings' as const, label: 'コーディング', icon: MessageSquare, count: codings.length },
  ];

  return (
    <div className="min-h-screen bg-brand-950">
      <div className="mx-auto max-w-[1200px] px-4 py-6 space-y-5">
        {/* Back + user info */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="btn-ghost flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            一覧に戻る
          </button>
        </div>

        <div className="card p-5 flex items-center gap-4">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="h-12 w-12 rounded-full" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-brand-700 flex items-center justify-center text-lg font-semibold text-slate-300">
              {(user.display_name || user.email || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-base font-semibold text-white">{user.display_name || user.email}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              登録日: {new Date(user.created_at).toLocaleDateString('ja-JP')}
            </p>
          </div>
          {user.role === 'admin' && (
            <span className="ml-auto text-xs font-semibold bg-accent-600/20 text-accent-400 px-2 py-1 rounded">
              管理者
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border border-slate-700/50 rounded-lg p-0.5 self-start w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-colors
                ${activeTab === t.key ? 'bg-brand-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full
                ${activeTab === t.key ? 'bg-brand-600 text-slate-300' : 'bg-brand-800 text-slate-500'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-brand-800/50 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'searches' && (
              <SearchesTab
                searches={searches}
                expandedSearchId={expandedSearchId}
                searchItems={searchItems}
                onToggle={toggleSearch}
              />
            )}
            {activeTab === 'codes' && <CodesTab codes={codes} />}
            {activeTab === 'codings' && <CodingsTab codings={codings} />}
          </>
        )}
      </div>
    </div>
  );
}

function SearchesTab({
  searches, expandedSearchId, searchItems, onToggle,
}: {
  searches: UserSearch[];
  expandedSearchId: string | null;
  searchItems: Map<string, UserItem[]>;
  onToggle: (id: string) => void;
}) {
  if (searches.length === 0) {
    return <EmptyState icon={SearchIcon} text="検索履歴がありません" />;
  }

  return (
    <div className="space-y-2">
      {searches.map(s => {
        const isExpanded = expandedSearchId === s.id;
        const items = searchItems.get(s.id);

        return (
          <div key={s.id} className="card overflow-hidden">
            <button
              onClick={() => onToggle(s.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-800/40 transition-colors text-left"
            >
              <SearchIcon className="h-4 w-4 text-accent-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-white font-medium">
                  {s.query_and.join(', ') || s.query_or.join(', ') || '(empty)'}
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  {new Date(s.created_at).toLocaleDateString('ja-JP')} — {s.total_results}件
                </span>
              </div>
              {isExpanded
                ? <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" />
                : <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />}
            </button>

            {isExpanded && (
              <div className="border-t border-slate-800 px-4 py-3 space-y-2 max-h-80 overflow-y-auto">
                {!items ? (
                  <div className="h-8 bg-brand-800/50 rounded animate-pulse" />
                ) : items.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-2">データなし</p>
                ) : (
                  items.map(item => (
                    <div key={item.id} className="flex items-start gap-2 py-1.5 border-b border-slate-800/50 last:border-0">
                      <SourceBadge type={item.source_type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">{item.title || item.content.slice(0, 80)}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.content.slice(0, 150)}</p>
                      </div>
                      {item.url && (() => {
                        const safe = safeExternalUrl(item.url);
                        return safe ? (
                          <a
                            href={safe}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-accent-400 shrink-0"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : null;
                      })()}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CodesTab({ codes }: { codes: { id: string; name: string; color_hex: string; description: string; created_at: string }[] }) {
  if (codes.length === 0) {
    return <EmptyState icon={Tags} text="コードがありません" />;
  }

  return (
    <div className="card divide-y divide-slate-800">
      {codes.map(c => (
        <div key={c.id} className="flex items-center gap-3 px-4 py-3">
          <div
            className="h-3.5 w-3.5 rounded-full shrink-0"
            style={{ backgroundColor: c.color_hex }}
          />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-white font-medium">{c.name}</span>
            {c.description && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{c.description}</p>
            )}
          </div>
          <span className="text-[11px] text-slate-600 shrink-0">
            {new Date(c.created_at).toLocaleDateString('ja-JP')}
          </span>
        </div>
      ))}
    </div>
  );
}

function CodingsTab({ codings }: { codings: UserCoding[] }) {
  if (codings.length === 0) {
    return <EmptyState icon={MessageSquare} text="コーディングがありません" />;
  }

  return (
    <div className="space-y-2">
      {codings.map(c => (
        <div key={c.id} className="card px-4 py-3 flex items-start gap-3">
          {c.code && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5"
              style={{ backgroundColor: `${c.code.color_hex}20`, color: c.code.color_hex }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.code.color_hex }} />
              {c.code.name}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-300 truncate">
              {c.item?.title || c.item?.content?.slice(0, 80) || '(item)'}
            </p>
            {c.memo && (
              <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                <FileText className="h-3 w-3 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{c.memo}</span>
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SourceBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    twitter: 'bg-blue-600/15 text-blue-400',
    news: 'bg-amber-600/15 text-amber-400',
    blog: 'bg-emerald-600/15 text-emerald-400',
    web: 'bg-slate-600/15 text-slate-400',
  };

  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${colors[type] ?? colors.web}`}>
      {type}
    </span>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="card py-12 flex flex-col items-center gap-3">
      <Icon className="h-8 w-8 text-slate-600" />
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}
