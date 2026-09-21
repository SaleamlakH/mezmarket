import { describe, it, expect } from 'vitest';
import { extensionForMimeType } from '../storage-keys.js';

describe('extensionForMimeType', () => {
  it('maps supported image mime types to file extensions', () => {
    expect(extensionForMimeType('image/jpeg')).toBe('.jpg');
    expect(extensionForMimeType('image/png')).toBe('.png');
    expect(extensionForMimeType('image/webp')).toBe('.webp');
    expect(extensionForMimeType('image/gif')).toBe('.gif');
    expect(extensionForMimeType('image/avif')).toBe('.avif');
  });

  it('falls back to .bin for unknown mime types', () => {
    expect(extensionForMimeType('application/pdf')).toBe('.bin');
  });

  it('falls back to .bin when no mime type is provided', () => {
    expect(extensionForMimeType(null)).toBe('.bin');
    expect(extensionForMimeType(undefined)).toBe('.bin');
  });
});
