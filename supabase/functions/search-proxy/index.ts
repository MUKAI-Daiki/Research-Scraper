const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// The result count is cost-bearing once a metered API sits behind this function,
// so it is clamped here rather than trusted from the request body.
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 10;

function clampLimit(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(n), 1), MAX_LIMIT);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const selectedSources: string[] = Array.isArray(body?.selected_sources)
      ? body.selected_sources.filter((s: unknown) => typeof s === "string")
      : [];
    const limit = clampLimit(body?.limit);

    // Placeholder: return mock results.
    // Future: call X API v2 and/or Gemini Search Grounding here.
    const results = generateMockResults(selectedSources, limit);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    // Keep the detail in the server log; never return it to the caller.
    console.error("search-proxy failed:", err);
    return new Response(
      JSON.stringify({ error: "検索処理に失敗しました" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

function generateMockResults(
  sources: string[],
  limit: number,
): Array<Record<string, unknown>> {
  const pool: Array<Record<string, unknown>> = [
    {
      source_type: "twitter",
      title: "",
      content:
        "Edge Function経由のモックデータです。将来的にここでX API v2を呼び出します。",
      url: "https://x.com/example/status/mock1",
      author_name: "Mock User",
      published_at: new Date().toISOString(),
      raw_metadata: {},
    },
    {
      source_type: "news",
      title: "Edge Function テスト記事",
      content:
        "このデータはsearch-proxy Edge Functionから返されたモックニュース記事です。Gemini Search Groundingとの連携を予定しています。",
      url: "https://example.com/news/mock1",
      author_name: "Mock News",
      published_at: new Date().toISOString(),
      raw_metadata: {},
    },
  ];

  const filtered =
    sources.length > 0
      ? pool.filter((p) => sources.includes(p.source_type as string))
      : pool;

  return filtered.slice(0, limit);
}
