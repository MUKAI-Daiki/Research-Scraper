import type { SourceType, SearchQuery, ScrapedItem } from '@/types';

const MOCK_TWITTER: Omit<ScrapedItem, 'id' | 'search_id' | 'user_id' | 'created_at'>[] = [
  {
    source_type: 'twitter',
    title: '',
    content: '最新の調査結果によると、若者のSNS利用時間が過去5年で1.5倍に増加しているとのこと。特に動画コンテンツの消費が顕著。教育現場でのメディアリテラシー教育の重要性が高まっています。 #メディアリテラシー #教育',
    url: 'https://x.com/example/status/1234567890',
    author_name: '教育研究者 田中',
    published_at: '2026-09-18T10:30:00Z',
    raw_metadata: { retweets: 142, likes: 523 },
  },
  {
    source_type: 'twitter',
    title: '',
    content: '高校の探究学習でWebスクレイピングを活用した事例を発表しました。生徒たちがデータ収集から分析まで自走できる環境を整えることで、主体的な学びが促進されます。',
    url: 'https://x.com/example/status/1234567891',
    author_name: '鈴木先生@情報科',
    published_at: '2026-09-17T14:15:00Z',
    raw_metadata: { retweets: 87, likes: 301 },
  },
  {
    source_type: 'twitter',
    title: '',
    content: 'データサイエンス教育における質的研究手法の導入について、興味深い論文を見つけた。量的分析だけでなく、テキストデータのコーディングによる深い分析が求められている。',
    url: 'https://x.com/example/status/1234567892',
    author_name: '大学院生M2 佐藤',
    published_at: '2026-09-16T09:45:00Z',
    raw_metadata: { retweets: 45, likes: 189 },
  },
];

const MOCK_NEWS: Omit<ScrapedItem, 'id' | 'search_id' | 'user_id' | 'created_at'>[] = [
  {
    source_type: 'news',
    title: '文科省、高校「情報II」でのデータ活用実践事例を公開',
    content: '文部科学省は19日、高等学校の新科目「情報II」におけるデータ活用の実践事例集を公開した。Webからのデータ収集やテキスト分析、機械学習の基礎的な活用事例が含まれており、全国の教育現場での活用が期待される。',
    url: 'https://example-news.jp/article/20260918001',
    author_name: '教育新聞 編集部',
    published_at: '2026-09-18T08:00:00Z',
    raw_metadata: {},
  },
  {
    source_type: 'news',
    title: 'AI時代の研究倫理：データ収集における新ガイドライン策定へ',
    content: '日本学術会議は、AI技術を活用した研究データ収集に関する新しいガイドラインの策定に着手した。Webスクレイピングや生成AIを用いたデータ収集における倫理的配慮について、2027年度中の公表を目指す。',
    url: 'https://example-news.jp/article/20260917002',
    author_name: '科学技術ニュース',
    published_at: '2026-09-17T12:30:00Z',
    raw_metadata: {},
  },
];

const MOCK_BLOG: Omit<ScrapedItem, 'id' | 'search_id' | 'user_id' | 'created_at'>[] = [
  {
    source_type: 'blog',
    title: '探究学習でのWebスクレイピング活用ガイド【高校生向け】',
    content: '探究学習の一環としてWebスクレイピングを活用する方法を解説します。Pythonを使わずにブラウザ上で完結するツールを使えば、プログラミング初心者でもデータ収集が可能です。本記事では、テーマ設定からデータ収集、質的コーディングによる分析までの流れを具体的に紹介します。',
    url: 'https://note.example.com/article/scraping-guide',
    author_name: 'みらいラボ',
    published_at: '2026-09-15T18:00:00Z',
    raw_metadata: { platform: 'note' },
  },
  {
    source_type: 'blog',
    title: '質的データ分析入門：コーディングの基本と実践',
    content: 'テキストデータの質的分析で用いられる「コーディング」について、基本概念から実践的な手法までを初心者向けに解説。オープンコーディング、軸足コーディング、選択的コーディングの3段階を、具体例を交えて説明します。',
    url: 'https://hatena.example.com/entry/qualitative-coding',
    author_name: '社会調査メモ',
    published_at: '2026-09-14T20:00:00Z',
    raw_metadata: { platform: 'hatena' },
  },
];

const MOCK_WEB: Omit<ScrapedItem, 'id' | 'search_id' | 'user_id' | 'created_at'>[] = [
  {
    source_type: 'web',
    title: '学生のためのリサーチメソッド：オンラインデータの収集と活用',
    content: '大学生・大学院生を対象に、オンラインデータの収集方法と研究への活用方法を体系的にまとめたガイドです。ソーシャルメディアデータ、ニュースアーカイブ、公開データセットなど、多様なデータソースの特徴と利用上の注意点を解説しています。',
    url: 'https://example-univ.ac.jp/research/methods/online-data',
    author_name: '○○大学 図書館情報学研究室',
    published_at: '2026-09-10T00:00:00Z',
    raw_metadata: {},
  },
];

const ALL_MOCKS: Record<SourceType, Omit<ScrapedItem, 'id' | 'search_id' | 'user_id' | 'created_at'>[]> = {
  twitter: MOCK_TWITTER,
  news: MOCK_NEWS,
  blog: MOCK_BLOG,
  web: MOCK_WEB,
};

function filterByKeywords(
  items: Omit<ScrapedItem, 'id' | 'search_id' | 'user_id' | 'created_at'>[],
  query: SearchQuery
): Omit<ScrapedItem, 'id' | 'search_id' | 'user_id' | 'created_at'>[] {
  return items.filter(item => {
    const text = `${item.title} ${item.content} ${item.author_name}`.toLowerCase();
    if (query.queryNot.length > 0 && query.queryNot.some(w => text.includes(w.toLowerCase()))) {
      return false;
    }
    return true;
  });
}

export async function executeSearch(query: SearchQuery): Promise<Omit<ScrapedItem, 'id' | 'search_id' | 'user_id' | 'created_at'>[]> {
  await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));

  const sources = query.selectedSources.length > 0 ? query.selectedSources : (['twitter', 'news', 'blog', 'web'] as SourceType[]);
  let results: Omit<ScrapedItem, 'id' | 'search_id' | 'user_id' | 'created_at'>[] = [];

  for (const source of sources) {
    const pool = ALL_MOCKS[source] || [];
    results = results.concat(filterByKeywords(pool, query));
  }

  return results.slice(0, query.limit);
}
