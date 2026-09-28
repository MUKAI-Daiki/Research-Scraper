import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { safeExternalUrl } from '@/utils/url';
import {
  ArrowLeft, Search as SearchIcon, FileText, Tags, MessageSquare,
  Calendar, ExternalLink, ChevronDown, ChevronUp, Shield, Plus,
  Send, Loader2, Trash2,
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

interface AdminLabel {
  id: string;
  item_id: string;
  label_name: string;
  color_hex: string;
}

interface AdminComment {
  id: string;
  item_id: string;
  comment_text: string;
  created_at: string;
}

interface Props {
  user: Profile;
  onBack: () => void;
}

const ADMIN_LABEL_COLORS = [
  '#F59E0B', '#F97316', '#EF4444', '#EC4899',
  '#8B5CF6', '#3B82F6', '#06B6D4', '#10B981',
];

export default function UserDetailView({ user, onBack }: Props) {
  const { addToast } = useToast();
  const [searches, setSearches] = useState<UserSearch[]>([]);
  const [codes, setCodes] = useState<UserCode[]>([]);
  const [expandedSearchId, setExpandedSearchId] = useState<string | null>(null);
  const [searchItems, setSearchItems] = useState<Map<string, UserItem[]>>(new Map());
  const [codings, setCodings] = useState<UserCoding[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'searches' | 'codes' | 'codings'>('searches');

  const [adminLabels, setAdminLabels] = useState<AdminLabel[]>([]);
  const [adminComments, setAdminComments] = useState<AdminComment[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);

    const [searchRes, codeRes, codingRes] = await Promise.all([
      supabase.from('searches').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('qualitative_codes').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('item_codings')
        .select('*, code:qualitative_codes(name, color_hex), item:scraped_items(title, content)')
        .eq('user_id', user.id).order('created_at', { ascending: false }),
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

  const loadAdminFeedback = useCallback(async (itemIds: string[]) => {
    if (itemIds.length === 0) { setAdminLabels([]); setAdminComments([]); return; }
    const [labelsRes, commentsRes] = await Promise.all([
      supabase.from('admin_labels').select('*').in('item_id', itemIds),
      supabase.from('admin_comments').select('*').in('item_id', itemIds).order('created_at', { ascending: true }),
    ]);
    setAdminLabels((labelsRes.data || []) as AdminLabel[]);
    setAdminComments((commentsRes.data || []) as AdminComment[]);
  }, []);

  const loadSearchItems = useCallback(async (searchId: string) => {
    if (searchItems.has(searchId)) return;
    const { data, error } = await supabase
      .from('scraped_items').select('*').eq('search_id', searchId)
      .order('created_at', { ascending: true });
    if (error) { addToast('データの読み込みに失敗しました', 'error'); return; }
    const items = data || [];
    setSearchItems(prev => new Map(prev).set(searchId, items));
    if (items.length > 0) {
      loadAdminFeedback(items.map(i => i.id));
    }
  }, [searchItems, addToast, loadAdminFeedback]);

  const toggleSearch = (searchId: string) => {
    if (expandedSearchId === searchId) {
      setExpandedSearchId(null);
    } else {
      setExpandedSearchId(searchId);
      loadSearchItems(searchId);
    }
  };

  const handleAddLabel = async (itemId: string, labelName: string, colorHex: string) => {
    const { error } = await supabase.from('admin_labels').insert({ item_id: itemId, label_name: labelName, color_hex: colorHex });
    if (error) { addToast('ラベルの追加に失敗しました', 'error'); return; }
    const allItemIds = Array.from(searchItems.values()).flat().map(i => i.id);
    await loadAdminFeedback(allItemIds);
    addToast('ラベルを追加しました', 'success');
  };

  const handleDeleteLabel = async (labelId: string) => {
    const { error } = await supabase.from('admin_labels').delete().eq('id', labelId);
    if (error) { addToast('ラベルの削除に失敗しました', 'error'); return; }
    setAdminLabels(prev => prev.filter(l => l.id !== labelId));
  };

  const handleAddComment = async (itemId: string, text: string) => {
    const { error } = await supabase.from('admin_comments').insert({ item_id: itemId, comment_text: text });
    if (error) { addToast('コメントの追加に失敗しました', 'error'); return; }
    const allItemIds = Array.from(searchItems.values()).flat().map(i => i.id);
    await loadAdminFeedback(allItemIds);
    addToast('コメントを追加しました', 'success');
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from('admin_comments').delete().eq('id', commentId);
    if (error) { addToast('コメントの削除に失敗しました', 'error'); return; }
    setAdminComments(prev => prev.filter(c => c.id !== commentId));
  };

  const tabs = [
    { key: 'searches' as const, label: '検索履歴', icon: SearchIcon, count: searches.length },
    { key: 'codes' as const, label: 'コード', icon: Tags, count: codes.length },
    { key: 'codings' as const, label: 'コーディング', icon: MessageSquare, count: codings.length },
  ];

  return (
    <div className="min-h-screen bg-brand-950">
      <div className="mx-auto max-w-[1200px] px-4 py-6 space-y-5">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="btn-ghost flex items-center gap-1.5 text-sm">
            <ArrowLeft className="h-4 w-4" /> 一覧に戻る
          </button>
        </div>

        <div className="card p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="h-10 w-10 sm:h-12 sm:w-12 rounded-full shrink-0" />
          ) : (
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-brand-700 flex items-center justify-center text-lg font-semibold text-slate-300 shrink-0">
              {(user.display_name || user.email || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white truncate">{user.display_name || user.email}</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{user.email}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              登録日: {new Date(user.created_at).toLocaleDateString('ja-JP')}
            </p>
          </div>
          {user.role === 'admin' && (
            <span className="ml-auto text-xs font-semibold bg-accent-600/20 text-accent-400 px-2 py-1 rounded shrink-0">
              管理者
            </span>
          )}
        </div>

        {/* Tabs - scrollable on mobile */}
        <div className="flex overflow-x-auto border border-slate-700/50 rounded-lg p-0.5 w-fit max-w-full">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap
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
                adminLabels={adminLabels}
                adminComments={adminComments}
                onToggle={toggleSearch}
                onAddLabel={handleAddLabel}
                onDeleteLabel={handleDeleteLabel}
                onAddComment={handleAddComment}
                onDeleteComment={handleDeleteComment}
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
  searches, expandedSearchId, searchItems, adminLabels, adminComments,
  onToggle, onAddLabel, onDeleteLabel, onAddComment, onDeleteComment,
}: {
  searches: UserSearch[];
  expandedSearchId: string | null;
  searchItems: Map<string, UserItem[]>;
  adminLabels: AdminLabel[];
  adminComments: AdminComment[];
  onToggle: (id: string) => void;
  onAddLabel: (itemId: string, name: string, color: string) => Promise<void>;
  onDeleteLabel: (id: string) => Promise<void>;
  onAddComment: (itemId: string, text: string) => Promise<void>;
  onDeleteComment: (id: string) => Promise<void>;
}) {
  if (searches.length === 0) return <EmptyState icon={SearchIcon} text="検索履歴がありません" />;

  return (
    <div className="space-y-2">
      {searches.map(s => {
        const isExpanded = expandedSearchId === s.id;
        const items = searchItems.get(s.id);

        return (
          <div key={s.id} className="card overflow-hidden">
            <button
              onClick={() => onToggle(s.id)}
              className="w-full flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-brand-800/40 transition-colors text-left"
            >
              <SearchIcon className="h-4 w-4 text-accent-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-white font-medium truncate block">
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
              <div className="border-t border-slate-800 px-3 sm:px-4 py-3 space-y-3 max-h-[70vh] overflow-y-auto">
                {!items ? (
                  <div className="h-8 bg-brand-800/50 rounded animate-pulse" />
                ) : items.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-2">データなし</p>
                ) : (
                  items.map(item => {
                    const itemLabels = adminLabels.filter(l => l.item_id === item.id);
                    const itemComments = adminComments.filter(c => c.item_id === item.id);
                    return (
                      <ItemCard
                        key={item.id}
                        item={item}
                        labels={itemLabels}
                        comments={itemComments}
                        onAddLabel={onAddLabel}
                        onDeleteLabel={onDeleteLabel}
                        onAddComment={onAddComment}
                        onDeleteComment={onDeleteComment}
                      />
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ItemCard({ item, labels, comments, onAddLabel, onDeleteLabel, onAddComment, onDeleteComment }: {
  item: UserItem;
  labels: AdminLabel[];
  comments: AdminComment[];
  onAddLabel: (itemId: string, name: string, color: string) => Promise<void>;
  onDeleteLabel: (id: string) => Promise<void>;
  onAddComment: (itemId: string, text: string) => Promise<void>;
  onDeleteComment: (id: string) => Promise<void>;
}) {
  const [labelInput, setLabelInput] = useState('');
  const [labelColor, setLabelColor] = useState(ADMIN_LABEL_COLORS[0]);
  const [commentInput, setCommentInput] = useState('');
  const [addingLabel, setAddingLabel] = useState(false);
  const [addingComment, setAddingComment] = useState(false);

  const safe = safeExternalUrl(item.url);

  const handleAddLabel = async () => {
    if (!labelInput.trim() || addingLabel) return;
    setAddingLabel(true);
    await onAddLabel(item.id, labelInput.trim(), labelColor);
    setLabelInput('');
    setLabelColor(ADMIN_LABEL_COLORS[Math.floor(Math.random() * ADMIN_LABEL_COLORS.length)]);
    setAddingLabel(false);
  };

  const handleAddComment = async () => {
    if (!commentInput.trim() || addingComment) return;
    setAddingComment(true);
    await onAddComment(item.id, commentInput.trim());
    setCommentInput('');
    setAddingComment(false);
  };

  return (
    <div className="border border-slate-800 rounded-lg p-3 space-y-2.5">
      {/* Item header */}
      <div className="flex items-start gap-2 min-w-0">
        <SourceBadge type={item.source_type} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white break-words">{item.title || item.content.slice(0, 80)}</p>
          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 break-words whitespace-pre-wrap">{item.content.slice(0, 200)}</p>
        </div>
        {safe && (
          <a href={safe} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-accent-400 shrink-0">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {/* Existing admin labels */}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {labels.map(l => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border border-dashed group"
              style={{ backgroundColor: `${l.color_hex}15`, color: l.color_hex, borderColor: `${l.color_hex}50` }}
            >
              <Shield className="h-2.5 w-2.5" />
              {l.label_name}
              <button onClick={() => onDeleteLabel(l.id)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Existing admin comments */}
      {comments.length > 0 && (
        <div className="space-y-1">
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-1.5 text-[11px] bg-amber-500/5 border border-amber-500/20 rounded px-2 py-1.5 group">
              <Shield className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-amber-200/80 break-words whitespace-pre-wrap min-w-0 flex-1">{c.comment_text}</span>
              <button onClick={() => onDeleteComment(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Trash2 className="h-3 w-3 text-slate-500 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add label */}
      <div className="flex gap-1.5 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={labelInput}
            onChange={e => setLabelInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddLabel(); }}
            placeholder="ラベルを追加..."
            className="input-field text-[11px] py-1.5 pr-7 w-full"
          />
          <button
            onClick={() => {
              const idx = ADMIN_LABEL_COLORS.indexOf(labelColor);
              setLabelColor(ADMIN_LABEL_COLORS[(idx + 1) % ADMIN_LABEL_COLORS.length]);
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-slate-600"
            style={{ backgroundColor: labelColor }}
          />
        </div>
        <button onClick={handleAddLabel} disabled={!labelInput.trim() || addingLabel} className="btn-ghost text-[10px] py-1.5 px-2 shrink-0">
          {addingLabel ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Plus className="h-3 w-3" /> ラベル</>}
        </button>
      </div>

      {/* Add comment */}
      <div className="flex gap-1.5 items-end">
        <textarea
          value={commentInput}
          onChange={e => setCommentInput(e.target.value)}
          placeholder="コメントを追加..."
          rows={1}
          className="input-field text-[11px] py-1.5 flex-1 resize-none"
        />
        <button onClick={handleAddComment} disabled={!commentInput.trim() || addingComment} className="btn-ghost text-[10px] py-1.5 px-2 shrink-0">
          {addingComment ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Send className="h-3 w-3" /> 送信</>}
        </button>
      </div>
    </div>
  );
}

function CodesTab({ codes }: { codes: UserCode[] }) {
  if (codes.length === 0) return <EmptyState icon={Tags} text="コードがありません" />;
  return (
    <div className="card divide-y divide-slate-800">
      {codes.map(c => (
        <div key={c.id} className="flex items-center gap-3 px-3 sm:px-4 py-3">
          <div className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: c.color_hex }} />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-white font-medium">{c.name}</span>
            {c.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{c.description}</p>}
          </div>
          <span className="text-[11px] text-slate-600 shrink-0">{new Date(c.created_at).toLocaleDateString('ja-JP')}</span>
        </div>
      ))}
    </div>
  );
}

function CodingsTab({ codings }: { codings: UserCoding[] }) {
  if (codings.length === 0) return <EmptyState icon={MessageSquare} text="コーディングがありません" />;
  return (
    <div className="space-y-2">
      {codings.map(c => (
        <div key={c.id} className="card px-3 sm:px-4 py-3 flex items-start gap-2 sm:gap-3">
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
            <p className="text-xs text-slate-300 truncate">{c.item?.title || c.item?.content?.slice(0, 80) || '(item)'}</p>
            {c.memo && (
              <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                <FileText className="h-3 w-3 shrink-0 mt-0.5" />
                <span className="line-clamp-2 break-words">{c.memo}</span>
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
