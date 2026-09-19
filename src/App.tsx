import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider, useToast } from '@/contexts/ToastContext';
import LoginScreen from '@/components/LoginScreen';
import Header from '@/components/Header';
import SearchPanel from '@/components/SearchPanel';
import DataList from '@/components/DataList';
import CodingPanel from '@/components/CodingPanel';
import TagModal from '@/components/TagModal';
import PrivacyPolicy from '@/components/PrivacyPolicy';
import TermsOfService from '@/components/TermsOfService';
import { supabase } from '@/lib/supabase';
import { executeSearch } from '@/services/searchService';
import { LayoutList, Tags } from 'lucide-react';
import type {
  Search, ScrapedItem, QualitativeCode, ItemCoding,
  ScrapedItemWithCodes, SearchQuery,
} from '@/types';

function useHashRoute() {
  const hash = useSyncExternalStore(
    (cb) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb); },
    () => window.location.hash,
  );
  return hash.replace(/^#\/?/, '/') || '/';
}

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();

  const [searches, setSearches] = useState<Search[]>([]);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [items, setItems] = useState<ScrapedItem[]>([]);
  const [codes, setCodes] = useState<QualitativeCode[]>([]);
  const [codings, setCodings] = useState<(ItemCoding & { code: QualitativeCode })[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeCodeFilter, setActiveCodeFilter] = useState<string | null>(null);
  const [tagModalItemId, setTagModalItemId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'data' | 'coding'>('data');

  const itemsWithCodes: ScrapedItemWithCodes[] = items.map(item => ({
    ...item,
    codings: codings.filter(c => c.item_id === item.id),
  }));

  const selectedItem = itemsWithCodes.find(i => i.id === selectedItemId) || null;
  const tagModalItem = itemsWithCodes.find(i => i.id === tagModalItemId);

  const loadSearches = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { addToast('検索履歴の読み込みに失敗しました', 'error'); return; }
    setSearches(data || []);
  }, [user, addToast]);

  const loadCodes = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('qualitative_codes')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) { addToast('コードの読み込みに失敗しました', 'error'); return; }
    setCodes(data || []);
  }, [user, addToast]);

  const loadItemsForSearch = useCallback(async (searchId: string) => {
    const { data, error } = await supabase
      .from('scraped_items')
      .select('*')
      .eq('search_id', searchId)
      .order('created_at', { ascending: true });
    if (error) { addToast('データの読み込みに失敗しました', 'error'); return; }
    setItems(data || []);
  }, [addToast]);

  const loadCodings = useCallback(async (itemIds: string[]) => {
    if (itemIds.length === 0) { setCodings([]); return; }
    const { data, error } = await supabase
      .from('item_codings')
      .select('*, code:qualitative_codes(*)')
      .in('item_id', itemIds);
    if (error) { addToast('コーディングの読み込みに失敗しました', 'error'); return; }
    setCodings((data || []).map((d: Record<string, unknown>) => ({
      ...(d as unknown as ItemCoding),
      code: d.code as QualitativeCode,
    })));
  }, [addToast]);

  useEffect(() => {
    if (user) {
      loadSearches();
      loadCodes();
    }
  }, [user, loadSearches, loadCodes]);

  useEffect(() => {
    if (activeSearchId) {
      loadItemsForSearch(activeSearchId);
    } else {
      setItems([]);
      setCodings([]);
    }
  }, [activeSearchId, loadItemsForSearch]);

  useEffect(() => {
    const ids = items.map(i => i.id);
    loadCodings(ids);
  }, [items, loadCodings]);

  const handleSearch = async (query: SearchQuery) => {
    setSearching(true);
    try {
      const results = await executeSearch(query);

      const { data: searchRow, error: searchErr } = await supabase
        .from('searches')
        .insert({
          query_and: query.queryAnd,
          query_or: query.queryOr,
          query_not: query.queryNot,
          selected_sources: query.selectedSources,
          total_results: results.length,
        })
        .select()
        .maybeSingle();

      if (searchErr || !searchRow) {
        addToast('検索の保存に失敗しました', 'error');
        return;
      }

      if (results.length > 0) {
        const rows = results.map(r => ({
          search_id: searchRow.id,
          source_type: r.source_type,
          title: r.title,
          content: r.content,
          url: r.url,
          author_name: r.author_name,
          published_at: r.published_at,
          raw_metadata: r.raw_metadata,
        }));
        const { error: itemsErr } = await supabase.from('scraped_items').insert(rows);
        if (itemsErr) {
          addToast('データの保存に失敗しました', 'error');
          return;
        }
      }

      await loadSearches();
      setActiveSearchId(searchRow.id);
      addToast(`${results.length}件のデータを収集しました`, 'success');
    } catch {
      addToast('検索中にエラーが発生しました', 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleCreateCode = async (name: string, colorHex: string, description: string) => {
    const { error } = await supabase
      .from('qualitative_codes')
      .insert({ name, color_hex: colorHex, description });
    if (error) { addToast('コードの作成に失敗しました', 'error'); return; }
    await loadCodes();
    addToast(`コード「${name}」を作成しました`, 'success');
  };

  const handleDeleteCode = async (id: string) => {
    const { error } = await supabase.from('qualitative_codes').delete().eq('id', id);
    if (error) { addToast('コードの削除に失敗しました', 'error'); return; }
    await loadCodes();
    const ids = items.map(i => i.id);
    await loadCodings(ids);
    if (activeCodeFilter === id) setActiveCodeFilter(null);
  };

  const handleToggleCode = async (itemId: string, codeId: string) => {
    const existing = codings.find(c => c.item_id === itemId && c.code_id === codeId);
    if (existing) {
      const { error } = await supabase.from('item_codings').delete().eq('id', existing.id);
      if (error) { addToast('コードの解除に失敗しました', 'error'); return; }
    } else {
      const { error } = await supabase.from('item_codings').insert({ item_id: itemId, code_id: codeId });
      if (error) { addToast('コードの付与に失敗しました', 'error'); return; }
    }
    const ids = items.map(i => i.id);
    await loadCodings(ids);
  };

  const handleSaveMemo = async (codingId: string, memo: string) => {
    const { error } = await supabase.from('item_codings').update({ memo }).eq('id', codingId);
    if (error) { addToast('メモの保存に失敗しました', 'error'); return; }
    const ids = items.map(i => i.id);
    await loadCodings(ids);
    addToast('メモを保存しました', 'success');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        searches={searches}
        activeSearchId={activeSearchId}
        onSelectSearch={setActiveSearchId}
      />

      <main className="flex-1 mx-auto w-full max-w-[1600px] px-4 py-4 flex flex-col gap-4">
        <SearchPanel onSearch={handleSearch} searching={searching} />

        {/* Mobile tab switcher */}
        <div className="flex lg:hidden border border-slate-700/50 rounded-lg p-0.5 self-start">
          <button
            onClick={() => setMobileTab('data')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${mobileTab === 'data' ? 'bg-brand-700 text-white' : 'text-slate-500'}`}
          >
            <LayoutList className="h-3.5 w-3.5" /> データ一覧
          </button>
          <button
            onClick={() => setMobileTab('coding')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${mobileTab === 'coding' ? 'bg-brand-700 text-white' : 'text-slate-500'}`}
          >
            <Tags className="h-3.5 w-3.5" /> コーディング
          </button>
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left column */}
          <div className={`lg:w-[70%] flex-1 min-h-[400px] ${mobileTab !== 'data' ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
            <DataList
              items={itemsWithCodes}
              codes={codes}
              activeCodeFilter={activeCodeFilter}
              onClearCodeFilter={() => setActiveCodeFilter(null)}
              onSelectItem={setSelectedItemId}
              onTagItem={setTagModalItemId}
              onEditMemo={(id) => { setSelectedItemId(id); setMobileTab('coding'); }}
              selectedItemId={selectedItemId}
            />
          </div>

          {/* Right column */}
          <div className={`lg:w-[30%] min-w-[280px] ${mobileTab !== 'coding' ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
            <CodingPanel
              codes={codes}
              items={itemsWithCodes}
              selectedItem={selectedItem}
              activeCodeFilter={activeCodeFilter}
              onFilterByCode={setActiveCodeFilter}
              onCreateCode={handleCreateCode}
              onDeleteCode={handleDeleteCode}
              onToggleCode={handleToggleCode}
              onSaveMemo={handleSaveMemo}
            />
          </div>
        </div>
      </main>

      {tagModalItem && (
        <TagModal
          codes={codes}
          assignedCodeIds={new Set(tagModalItem.codings.map(c => c.code_id))}
          onToggle={codeId => handleToggleCode(tagModalItem.id, codeId)}
          onClose={() => setTagModalItemId(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  const route = useHashRoute();

  if (route === '/privacy') return <PrivacyPolicy />;
  if (route === '/terms') return <TermsOfService />;

  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
