const cache = new Map<string, string>();

/**
 * Session-scoped cache of downloaded product images, keyed by upload id. It holds
 * every image for the life of the document and never evicts, which is a deliberate
 * shortcut: it also makes the grid immune to the 900s presigned url expiry.
 */
export const imageCache = {
  has(uploadId: string): boolean {
    return cache.has(uploadId);
  },

  getObjectUrl(uploadId: string): string | undefined {
    return cache.get(uploadId);
  },

  set(uploadId: string, blob: Blob): void {
    const existing = cache.get(uploadId);
    if (existing) {
      URL.revokeObjectURL(existing);
    }
    cache.set(uploadId, URL.createObjectURL(blob));
  },

  clear(): void {
    for (const objectUrl of cache.values()) {
      URL.revokeObjectURL(objectUrl);
    }
    cache.clear();
  },
};
