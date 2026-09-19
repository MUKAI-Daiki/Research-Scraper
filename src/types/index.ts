export type SourceType = 'twitter' | 'news' | 'blog' | 'web';

export interface Search {
  id: string;
  user_id: string;
  query_and: string[];
  query_or: string[];
  query_not: string[];
  selected_sources: SourceType[];
  total_results: number;
  created_at: string;
}

export interface ScrapedItem {
  id: string;
  search_id: string;
  user_id: string;
  source_type: SourceType;
  title: string;
  content: string;
  url: string;
  author_name: string;
  published_at: string | null;
  raw_metadata: Record<string, unknown>;
  created_at: string;
}

export interface QualitativeCode {
  id: string;
  user_id: string;
  name: string;
  color_hex: string;
  description: string;
  created_at: string;
}

export interface ItemCoding {
  id: string;
  item_id: string;
  code_id: string;
  user_id: string;
  memo: string;
  created_at: string;
}

export interface ScrapedItemWithCodes extends ScrapedItem {
  codings: (ItemCoding & { code: QualitativeCode })[];
}

export interface SearchQuery {
  queryAnd: string[];
  queryOr: string[];
  queryNot: string[];
  selectedSources: SourceType[];
  limit: number;
}
