import { describe, it, expect } from 'vitest';
import { lineAmount, lineTotal } from '../lineTotal';

describe('lineTotal', () => {
  it('multiplies a typed quantity by the unit price', () => {
    expect(lineTotal('3', 250)).toBe(750);
  });

  it('is null when the quantity is blank or not a number', () => {
    expect(lineTotal('', 250)).toBeNull();
    expect(lineTotal('  ', 250)).toBeNull();
    expect(lineTotal('nope', 250)).toBeNull();
  });

  it('is null when the unit has no price', () => {
    expect(lineTotal('3', null)).toBeNull();
  });
});

describe('lineAmount', () => {
  it('multiplies an already-parsed quantity by the unit price', () => {
    expect(lineAmount(4, 90)).toBe(360);
  });

  it('is null when the unit has no price', () => {
    expect(lineAmount(4, null)).toBeNull();
  });
});
