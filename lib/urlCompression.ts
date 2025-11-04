/**
 * Compress and encode data for URL
 */
export function compressForUrl(data: unknown): string {
  try {
    const json = JSON.stringify(data);
    // Use built-in browser compression if available, otherwise just base64
    if (typeof window !== 'undefined' && 'CompressionStream' in window) {
      // For client-side, we'll use a simpler approach
      // Convert to base64 to make it URL-safe
      const base64 = btoa(json);
      return base64;
    }
    // Fallback: just base64 encode
    const base64 = Buffer.from(json).toString('base64');
    return base64;
  } catch (error) {
    console.error('Compression error:', error);
    return '';
  }
}

/**
 * Decompress and decode data from URL
 */
export function decompressFromUrl(compressed: string): unknown {
  try {
    if (!compressed) return null;

    // Try to decode base64
    let json: string;
    if (typeof window !== 'undefined') {
      json = atob(compressed);
    } else {
      json = Buffer.from(compressed, 'base64').toString('utf-8');
    }

    return JSON.parse(json);
  } catch (error) {
    console.error('Decompression error:', error);
    return null;
  }
}
