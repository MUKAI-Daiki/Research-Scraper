/**
 * Returns the URL only when it is a safe, navigable external link.
 *
 * Scraped content is third-party data: a hostile page or post can set its link
 * to a `javascript:` or `data:` URI, which React renders verbatim in an href and
 * which executes on the app's origin when clicked. Anything that is not plainly
 * http(s) is rejected so it can be shown as inert text instead of an anchor.
 */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  return parsed.toString();
}
