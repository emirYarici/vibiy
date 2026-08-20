/**
 * Helper to fetch Instagram Reel / Post metadata on client side (residential IP)
 * to prevent server-side proxy ban problems when scraping media details.
 */

export interface ClientInstagramMetadata {
  success: boolean;
  thumbnail_url?: string;
  summary?: string;
  username?: string;
  error?: string;
}

export async function extractInstagramMetadataOnClient(url: string): Promise<ClientInstagramMetadata> {
  if (!url || !url.includes('instagram.com')) {
    return { success: false, error: 'Invalid Instagram URL' };
  }

  // Normalize URL
  let cleanUrl = url.split('?')[0];
  if (!cleanUrl.endsWith('/')) {
    cleanUrl = `${cleanUrl}/`;
  }

  try {
    // 1. Try Instagram official oEmbed endpoint
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(cleanUrl)}`;
    const response = await fetch(oembedUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data && (data.thumbnail_url || data.title || data.author_name)) {
        return {
          success: true,
          thumbnail_url: data.thumbnail_url || undefined,
          summary: data.title || undefined,
          username: data.author_name || undefined,
        };
      }
    }
  } catch (err: any) {
    console.warn('Client-side oEmbed fetch failed, trying HTML meta tag extraction fallback:', err.message);
  }

  try {
    // 2. Fallback: Fetch public Instagram post HTML directly on client
    const htmlResponse = await fetch(cleanUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      },
    });

    if (htmlResponse.ok) {
      const htmlText = await htmlResponse.text();

      // Extract Open Graph meta tags
      const ogImageMatch = htmlText.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                           htmlText.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
      const ogTitleMatch = htmlText.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                           htmlText.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
      const ogDescMatch  = htmlText.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                           htmlText.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);

      let thumbnailUrl = ogImageMatch ? ogImageMatch[1] : undefined;
      let rawTitle = ogTitleMatch ? ogTitleMatch[1] : (ogDescMatch ? ogDescMatch[1] : undefined);
      let username: string | undefined = undefined;

      if (rawTitle) {
        // Match "username on Instagram: \"caption\""
        const usernameMatch = rawTitle.match(/^([A-Za-z0-9_.]+)\s+on\s+Instagram:/);
        if (usernameMatch) {
          username = usernameMatch[1];
          rawTitle = rawTitle.replace(/^[A-Za-z0-9_.]+\s+on\s+Instagram:\s*"?/, '').replace(/"\s*$/, '').trim();
        }
      }

      if (thumbnailUrl || rawTitle) {
        return {
          success: true,
          thumbnail_url: thumbnailUrl,
          summary: rawTitle || 'Instagram Reel',
          username: username,
        };
      }
    }
  } catch (err: any) {
    console.warn('Client-side HTML fetch fallback failed:', err.message);
  }

  // Graceful fallback to server scraper if client extraction could not retrieve fields
  return { success: false, error: 'Could not extract metadata on client' };
}
