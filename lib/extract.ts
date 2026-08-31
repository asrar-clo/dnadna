const MAX_URL_CHARS = 20000;
const FETCH_TIMEOUT_MS = 10000;

export class ExtractError extends Error {
  constructor(public userMessage: string) {
    super(userMessage);
  }
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Fetches a public webpage and reduces it to readable plain text.
// Deliberately simple: strip script/style, strip tags, collapse whitespace.
export async function fetchUrlAsText(rawUrl: string): Promise<string> {
  if (!isValidHttpUrl(rawUrl)) {
    throw new ExtractError('That doesn\u2019t look like a valid web link.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(rawUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VoiceDNABot/1.0)' },
    });
  } catch {
    throw new ExtractError('We couldn\u2019t reach that link. Check it\u2019s public and try again.');
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new ExtractError('That page couldn\u2019t be loaded (it may be private or no longer exist).');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
    throw new ExtractError('That link doesn\u2019t point to a readable page.');
  }

  const html = await res.text();
  const text = htmlToText(html);

  if (!text || text.trim().length < 20) {
    throw new ExtractError('We couldn\u2019t find readable text on that page.');
  }

  return text.slice(0, MAX_URL_CHARS);
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|p|div|li|h[1-6]|tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}
