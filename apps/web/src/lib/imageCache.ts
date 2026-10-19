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

  /**
   * Drops an image so the next read refetches it. Used after a replace, when the
   * same upload id now points at new bytes and the cached copy is stale.
   */
  remove(uploadId: string): void {
    const existing = cache.get(uploadId);
    if (existing) {
      URL.revokeObjectURL(existing);
      cache.delete(uploadId);
    }
  },

  clear(): void {
    for (const objectUrl of cache.values()) {
      URL.revokeObjectURL(objectUrl);
    }
    cache.clear();
  },
};
