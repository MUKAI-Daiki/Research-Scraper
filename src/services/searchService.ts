import type { SearchQuery, ScrapedItem } from '@/types';
import { supabase } from '@/lib/supabase';

type SearchResult = Omit<ScrapedItem, 'id' | 'search_id' | 'user_id' | 'created_at'>;

export async function executeSearch(query: SearchQuery): Promise<SearchResult[]> {
  const { data, error } = await supabase.functions.invoke('search-proxy', {
    body: {
      query_and: query.queryAnd,
      query_or: query.queryOr,
      query_not: query.queryNot,
      selected_sources: query.selectedSources,
      limit: query.limit,
    },
  });

  if (error) {
    throw new Error(error.message || '検索に失敗しました');
  }

  if (!data || !Array.isArray(data.results)) {
    throw new Error(data?.error || '検索結果の形式が不正です');
  }

  return data.results;
}
