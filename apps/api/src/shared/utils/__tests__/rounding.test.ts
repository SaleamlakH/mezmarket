import { describe, it, expect } from 'vitest';
import { roundMoney, roundQuantity } from '../rounding.js';

describe('roundMoney', () => {
  it('keeps money at the two decimals the columns store', () => {
    expect(roundMoney(100.999)).toBe(101);
    expect(roundMoney(213.75)).toBe(213.75);
  });
});

describe('roundQuantity', () => {
  it('keeps quantities at the four decimals the columns store', () => {
    expect(roundQuantity(3.14159)).toBe(3.1416);
    expect(roundQuantity(14)).toBe(14);
  });
});
