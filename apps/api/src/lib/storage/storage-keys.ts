const EXTENSIONS_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

export function extensionForMimeType(mimeType: string | null | undefined): string {
  if (!mimeType) {
    return '.bin';
  }
  return EXTENSIONS_BY_MIME[mimeType] ?? '.bin';
}

export function generateStorageKey(
  record: string,
  uploadId: string,
  mimeType?: string | null,
): string {
  return `uploads/${record.toLowerCase()}/${uploadId}${extensionForMimeType(mimeType)}`;
}
