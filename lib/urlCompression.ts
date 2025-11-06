interface DeviationEntry {
  forHeading: number;
  steerHeading: number;
}

/**
 * Compress and encode data for URL
 * For deviation tables: uses compact dot-separated format (forHeading.steerHeading.forHeading.steerHeading...)
 * Example: [{"forHeading":0,"steerHeading":2},{"forHeading":30,"steerHeading":29}] -> "0.2.30.29"
 * Uses period (.) as separator because it's URL-safe and doesn't require encoding
 */
export function compressForUrl(data: unknown): string {
  try {
    // Check if it's a deviation table (array of objects with forHeading/steerHeading)
    if (Array.isArray(data) && data.length > 0 &&
        'forHeading' in data[0] && 'steerHeading' in data[0]) {
      // Dot-separated format: flatten the array into period-separated values
      const csv = (data as DeviationEntry[])
        .flatMap(entry => [entry.forHeading, entry.steerHeading])
        .join('.');
      return csv;
    }

    // Fallback: use base64 encoded JSON for other data types
    const json = JSON.stringify(data);
    if (typeof window !== 'undefined') {
      // Encode UTF-8 string to base64 properly in browser
      // First encode to UTF-8 bytes, then to base64
      return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      }));
    }
    return Buffer.from(json, 'utf-8').toString('base64');
  } catch (error) {
    console.error('Compression error:', error);
    return '';
  }
}

/**
 * Decompress and decode data from URL
 * Supports:
 * 1. New dot-separated format: "0.2.30.29"
 * 2. Legacy comma-separated format: "0,2,30,29"
 * 3. Legacy base64 JSON format for backward compatibility
 */
export function decompressFromUrl(compressed: string): unknown {
  try {
    if (!compressed) return null;

    // Try dot-separated format first (if it contains only digits, dots, and optional minus signs)
    if (/^[\d.-]+$/.test(compressed)) {
      const values = compressed.split('.').map(Number);

      // Should have even number of values (pairs of forHeading/steerHeading)
      if (values.length % 2 === 0 && values.every(v => !isNaN(v))) {
        const deviationTable: DeviationEntry[] = [];
        for (let i = 0; i < values.length; i += 2) {
          deviationTable.push({
            forHeading: values[i],
            steerHeading: values[i + 1]
          });
        }
        return deviationTable;
      }
    }

    // Try comma-separated format (legacy from a few minutes ago)
    if (/^[\d,-]+$/.test(compressed)) {
      const values = compressed.split(',').map(Number);

      // Should have even number of values (pairs of forHeading/steerHeading)
      if (values.length % 2 === 0 && values.every(v => !isNaN(v))) {
        const deviationTable: DeviationEntry[] = [];
        for (let i = 0; i < values.length; i += 2) {
          deviationTable.push({
            forHeading: values[i],
            steerHeading: values[i + 1]
          });
        }
        return deviationTable;
      }
    }

    // Fallback: try base64 JSON format (for backward compatibility)
    let json: string;
    if (typeof window !== 'undefined') {
      // Decode base64 to UTF-8 string properly in browser
      const binary = atob(compressed);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      json = decodeURIComponent(
        Array.from(bytes)
          .map(byte => '%' + ('00' + byte.toString(16)).slice(-2))
          .join('')
      );
    } else {
      json = Buffer.from(compressed, 'base64').toString('utf-8');
    }

    return JSON.parse(json);
  } catch (error) {
    console.error('Decompression error:', error);
    return null;
  }
}
