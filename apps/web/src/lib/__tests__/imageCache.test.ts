import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { imageCache } from '../imageCache';

describe('imageCache', () => {
  beforeEach(() => {
    imageCache.clear();
  });

  afterEach(() => {
    imageCache.clear();
  });

  it('reports an id it has never stored', () => {
    expect(imageCache.has('up-1')).toBe(false);
    expect(imageCache.getObjectUrl('up-1')).toBeUndefined();
  });

  it('stores the object url of a downloaded blob', () => {
    imageCache.set('up-1', new Blob(['bytes']));

    expect(imageCache.has('up-1')).toBe(true);
    expect(imageCache.getObjectUrl('up-1')).toMatch(/^blob:preview\/\d+$/);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('revokes and replaces the url when the same id is stored again', () => {
    imageCache.set('up-1', new Blob(['first']));
    const first = imageCache.getObjectUrl('up-1');

    imageCache.set('up-1', new Blob(['second']));
    const second = imageCache.getObjectUrl('up-1');

    expect(second).not.toBe(first);
    // Overwriting without revoking would leak the superseded object url for the
    // whole session, since this cache never evicts.
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(first);
  });

  it('drops an id and revokes its url', () => {
    imageCache.set('up-1', new Blob(['bytes']));
    const url = imageCache.getObjectUrl('up-1');

    imageCache.remove('up-1');

    expect(imageCache.has('up-1')).toBe(false);
    expect(imageCache.getObjectUrl('up-1')).toBeUndefined();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
  });

  it('does nothing when removing an id that is not cached', () => {
    imageCache.remove('up-1');

    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('keeps the other ids when one is removed', () => {
    imageCache.set('up-1', new Blob(['one']));
    imageCache.set('up-2', new Blob(['two']));

    imageCache.remove('up-1');

    expect(imageCache.has('up-1')).toBe(false);
    expect(imageCache.has('up-2')).toBe(true);
  });

  it('revokes every url and empties the cache', () => {
    imageCache.set('up-1', new Blob(['one']));
    imageCache.set('up-2', new Blob(['two']));
    const first = imageCache.getObjectUrl('up-1');
    const second = imageCache.getObjectUrl('up-2');

    imageCache.clear();

    expect(imageCache.has('up-1')).toBe(false);
    expect(imageCache.has('up-2')).toBe(false);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(first);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(second);
  });
});
