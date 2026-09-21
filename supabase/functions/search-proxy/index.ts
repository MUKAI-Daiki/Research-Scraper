const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 10;
const X_MAX_RESULTS = 100;
const X_MIN_RESULTS = 10;

interface SearchResult {
  source_type: string;
  title: string;
  content: string;
  url: string;
  author_name: string;
  published_at: string | null;
  raw_metadata: Record<string, unknown>;
}

function clampLimit(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(n), 1), MAX_LIMIT);
}

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ──────────────────────────────────────────────
// X API v2 Recent Search
// ──────────────────────────────────────────────

function buildXQuery(
  queryAnd: string[],
  queryOr: string[],
  queryNot: string[],
): string {
  const parts: string[] = [];

  if (queryAnd.length > 0) parts.push(queryAnd.join(" "));
  if (queryOr.length > 0) parts.push(`(${queryOr.join(" OR ")})`);
  for (const t of queryNot) parts.push(`-${t}`);
  parts.push("-is:retweet");

  const q = parts.join(" ");
  return q.length > 512 ? q.slice(0, 512) : q;
}

async function searchTwitter(
  queryAnd: string[],
  queryOr: string[],
  queryNot: string[],
  limit: number,
): Promise<SearchResult[]> {
  const token = Deno.env.get("X_BEARER_TOKEN");
  if (!token) throw new Error("X_BEARER_TOKEN is not configured");

  const query = buildXQuery(queryAnd, queryOr, queryNot);
  if (!query.replace(/-is:retweet/, "").trim()) return [];

  const maxResults = Math.min(Math.max(limit, X_MIN_RESULTS), X_MAX_RESULTS);

  const url = new URL("https://api.twitter.com/2/tweets/search/recent");
  url.searchParams.set("query", query);
  url.searchParams.set("max_results", String(maxResults));
  url.searchParams.set(
    "tweet.fields",
    "created_at,author_id,text,public_metrics",
  );
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "name,username");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`X API error ${res.status}:`, text);
    throw new Error(`X API returned ${res.status}`);
  }

  const json = await res.json();

  if (!json.data || !Array.isArray(json.data)) return [];

  const usersMap = new Map<string, { name: string; username: string }>();
  if (json.includes?.users) {
    for (const u of json.includes.users) {
      usersMap.set(u.id, { name: u.name, username: u.username });
    }
  }

  return json.data.slice(0, limit).map(
    (tweet: Record<string, unknown>): SearchResult => {
      const user = usersMap.get(tweet.author_id as string);
      const metrics = tweet.public_metrics as Record<string, number> | undefined;

      return {
        source_type: "twitter",
        title: "",
        content: tweet.text as string,
        url: `https://x.com/${user?.username ?? "i"}/status/${tweet.id}`,
        author_name: user
          ? `${user.name} (@${user.username})`
          : String(tweet.author_id ?? ""),
        published_at: (tweet.created_at as string) ?? null,
        raw_metadata: {
          tweet_id: tweet.id,
          ...(metrics
            ? {
                retweets: metrics.retweet_count ?? 0,
                likes: metrics.like_count ?? 0,
                replies: metrics.reply_count ?? 0,
                quotes: metrics.quote_count ?? 0,
              }
            : {}),
        },
      };
    },
  );
}

// ──────────────────────────────────────────────
// Gemini with Google Search Grounding
// ──────────────────────────────────────────────

const NEWS_DOMAINS = [
  "news",
  "nikkei",
  "nhk",
  "asahi",
  "mainichi",
  "yomiuri",
  "sankei",
  "reuters",
  "bbc",
  "cnn",
  "itmedia",
  "impress",
  "gigazine",
  "techcrunch",
  "wired",
  "gizmodo",
  "engadget",
  "zdnet",
  "cnet",
  "nytimes",
  "theguardian",
  "jiji",
  "kyodo",
  "afpbb",
  "bloomberg",
];

const BLOG_DOMAINS = [
  "note.com",
  "hatena",
  "medium.com",
  "qiita.com",
  "zenn.dev",
  "dev.to",
  "wordpress",
  "blogspot",
  "ameblo",
  "livedoor",
  "substack",
  "tumblr",
];

function classifySourceType(
  url: string,
  selectedSources: string[],
): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (NEWS_DOMAINS.some((d) => hostname.includes(d))) return "news";
    if (BLOG_DOMAINS.some((d) => hostname.includes(d))) return "blog";
  } catch {
    // invalid URL, fall through
  }
  if (selectedSources.length === 1) return selectedSources[0];
  return "web";
}

function buildGeminiPrompt(
  queryAnd: string[],
  queryOr: string[],
  queryNot: string[],
  sourceTypes: string[],
  limit: number,
): string {
  const lines: string[] = [];

  lines.push(
    "以下の検索条件に合致する最新のWebコンテンツを検索し、見つかった各情報源の内容を詳しく説明してください。",
  );
  lines.push("");
  lines.push("【検索条件】");
  if (queryAnd.length > 0) {
    lines.push(`必須キーワード（すべて含む）: ${queryAnd.join("、")}`);
  }
  if (queryOr.length > 0) {
    lines.push(`関連キーワード（いずれか含む）: ${queryOr.join("、")}`);
  }
  if (queryNot.length > 0) {
    lines.push(`除外キーワード: ${queryNot.join("、")}`);
  }

  const labels: Record<string, string> = {
    news: "ニュース記事",
    blog: "ブログ記事",
    web: "一般Webページ",
  };
  const typeStr = sourceTypes.map((t) => labels[t] ?? t).join("、");
  lines.push(`対象ソース: ${typeStr}`);
  lines.push("");
  lines.push(
    `できるだけ多くの異なる情報源（${Math.min(limit, 20)}件程度）から情報を集めてください。`,
  );
  lines.push(
    "各ソースについて、内容を100〜200文字程度で詳しく要約してください。",
  );
  lines.push("日本語の情報源を優先しつつ、英語の情報も含めてください。");

  return lines.join("\n");
}

interface GroundingChunk {
  web?: { uri: string; title: string };
}

interface GroundingSupport {
  segment: { startIndex?: number; endIndex?: number; text?: string };
  groundingChunkIndices?: number[];
  confidenceScores?: number[];
}

async function searchWeb(
  queryAnd: string[],
  queryOr: string[],
  queryNot: string[],
  sourceTypes: string[],
  limit: number,
): Promise<SearchResult[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const prompt = buildGeminiPrompt(
    queryAnd,
    queryOr,
    queryNot,
    sourceTypes,
    limit,
  );

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Gemini API error ${res.status}:`, text);
    throw new Error(`Gemini API returned ${res.status}`);
  }

  const json = await res.json();
  const candidate = json.candidates?.[0];
  if (!candidate) return [];

  const modelText = candidate.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("") ?? "";

  const grounding = candidate.groundingMetadata;
  if (!grounding?.groundingChunks?.length) {
    return modelText
      ? [{
          source_type: sourceTypes[0] ?? "web",
          title: "検索結果",
          content: modelText.slice(0, 500),
          url: "",
          author_name: "",
          published_at: null,
          raw_metadata: { source: "gemini_no_grounding" },
        }]
      : [];
  }

  const chunks: GroundingChunk[] = grounding.groundingChunks;
  const supports: GroundingSupport[] = grounding.groundingSupports ?? [];

  const chunkContentMap = new Map<number, string[]>();
  for (const sup of supports) {
    if (!sup.segment?.text || !sup.groundingChunkIndices?.length) continue;
    for (const idx of sup.groundingChunkIndices) {
      if (!chunkContentMap.has(idx)) chunkContentMap.set(idx, []);
      chunkContentMap.get(idx)!.push(sup.segment.text);
    }
  }

  const results: SearchResult[] = [];
  const seenUrls = new Set<string>();

  for (let i = 0; i < chunks.length && results.length < limit; i++) {
    const chunk = chunks[i];
    if (!chunk.web?.uri) continue;

    const uri = chunk.web.uri;
    if (seenUrls.has(uri)) continue;
    seenUrls.add(uri);

    const contentSegments = chunkContentMap.get(i);
    const content = contentSegments?.join(" ") ?? "";
    if (!content && !chunk.web.title) continue;

    results.push({
      source_type: classifySourceType(uri, sourceTypes),
      title: chunk.web.title ?? "",
      content,
      url: uri,
      author_name: "",
      published_at: null,
      raw_metadata: { source: "gemini_grounding" },
    });
  }

  return results;
}

// ──────────────────────────────────────────────
// Main handler
// ──────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const queryAnd: string[] = Array.isArray(body?.query_and)
      ? body.query_and.filter((s: unknown) => typeof s === "string" && s.trim())
      : [];
    const queryOr: string[] = Array.isArray(body?.query_or)
      ? body.query_or.filter((s: unknown) => typeof s === "string" && s.trim())
      : [];
    const queryNot: string[] = Array.isArray(body?.query_not)
      ? body.query_not.filter((s: unknown) => typeof s === "string" && s.trim())
      : [];
    const selectedSources: string[] = Array.isArray(body?.selected_sources)
      ? body.selected_sources.filter((s: unknown) => typeof s === "string")
      : [];
    const limit = clampLimit(body?.limit);

    if (queryAnd.length === 0 && queryOr.length === 0) {
      return respond({ results: [], message: "キーワードが指定されていません" });
    }

    const wantsTwitter =
      selectedSources.length === 0 || selectedSources.includes("twitter");
    const webSources = selectedSources.filter((s) => s !== "twitter");
    const wantsWeb =
      selectedSources.length === 0 || webSources.length > 0;

    const effectiveWebSources =
      webSources.length > 0
        ? webSources
        : ["news", "blog", "web"];

    const twitterLimit = wantsTwitter
      ? (wantsWeb ? Math.ceil(limit * 0.4) : limit)
      : 0;
    const webLimit = wantsWeb
      ? (wantsTwitter ? limit - twitterLimit : limit)
      : 0;

    const promises: Promise<SearchResult[]>[] = [];

    if (wantsTwitter && twitterLimit > 0) {
      promises.push(
        searchTwitter(queryAnd, queryOr, queryNot, twitterLimit).catch(
          (err) => {
            console.error("Twitter search failed:", err);
            return [] as SearchResult[];
          },
        ),
      );
    }

    if (wantsWeb && webLimit > 0) {
      promises.push(
        searchWeb(
          queryAnd,
          queryOr,
          queryNot,
          effectiveWebSources,
          webLimit,
        ).catch((err) => {
          console.error("Gemini search failed:", err);
          return [] as SearchResult[];
        }),
      );
    }

    const resultArrays = await Promise.all(promises);
    const merged = resultArrays.flat().slice(0, limit);

    return respond({ results: merged });
  } catch (err) {
    console.error("search-proxy failed:", err);
    return respond({ error: "検索処理に失敗しました" }, 500);
  }
});
