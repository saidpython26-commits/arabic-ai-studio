export interface SearchResultItem {
  title: string;
  snippet: string;
  url?: string;
  source: string;
}

/**
 * Searches Wikipedia (Arabic) and public search APIs for live web context.
 * Designed to work seamlessly in client-side PWAs (with full CORS support) and servers.
 */
export async function searchLiveWeb(query: string): Promise<SearchResultItem[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const results: SearchResultItem[] = [];

  // 1. Search Wikipedia Arabic
  try {
    const wikiUrl = `https://ar.wikipedia.org/w/api.php?action=query&origin=*&list=search&srsearch=${encodeURIComponent(
      cleanQuery
    )}&utf8=&format=json&srlimit=3`;
    const res = await fetch(wikiUrl);
    if (res.ok) {
      const data = await res.json();
      const items = data.query?.search || [];
      for (const item of items) {
        const plainSnippet = (item.snippet || '').replace(/<\/?[^>]+(>|$)/g, '');
        results.push({
          title: item.title,
          snippet: plainSnippet,
          url: `https://ar.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
          source: 'ويكيبيديا العربية',
        });
      }
    }
  } catch (err) {
    console.warn('Wikipedia search error:', err);
  }

  // 2. Search DuckDuckGo Instant Answer API
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(
      cleanQuery
    )}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(ddgUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.AbstractText) {
        results.push({
          title: data.Heading || cleanQuery,
          snippet: data.AbstractText,
          url: data.AbstractURL,
          source: data.AbstractSource || 'DuckDuckGo',
        });
      }
      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 2)) {
          if (topic.Text) {
            results.push({
              title: topic.FirstURL ? topic.FirstURL.split('/').pop() || cleanQuery : cleanQuery,
              snippet: topic.Text,
              url: topic.FirstURL,
              source: 'DuckDuckGo',
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('DuckDuckGo search error:', err);
  }

  return results;
}
