import { describe, expect, it } from 'vitest';
import { decimal } from '../../../../shared/utils/__tests__/snapshot.fixtures.js';
import type { ProductUnitContext } from '../../../../shared/types/unit.types.js';
import type { CostGroup, LossGroup } from '../../dashboard.types.js';
import { cogsOf, costOf, deltaPercentOf, grossProfitOf, lossesOf } from '../profit.js';

describe('costOf', () => {
  it('prices a base-unit quantity at the lot purchase cost', () => {
    // quantity=2 bottles, unitCost=5 per bottle, lot purchaseQuantity=10 bottles.
    // baseQuantity=10, costPerBottle=(5 × 10) / 10 = 5, total=2 × 5 = 10.
    expect(
      costOf(2, 5, {
        id: 'lot-bottle',
        purchaseQuantity: decimal(10),
        purchaseUnitCost: decimal(5),
        units: {
          sourceUnit: {
            id: 'pu-bottle',
            unitRole: 'BASE',
            dependsOn: null,
            conversionRate: null,
          } as ProductUnitContext,
          sourceBaseUnit: null,
          mouUnit: null,
        },
      }),
    ).toBe(10);
  });

  it('converts an MOU purchase quantity to base units before pricing', () => {
    // quantity=2 bottles, unitCost=0.1 per ml, lot purchaseQuantity=700 ml at 350 ml/bottle.
    // baseQuantity=700 / 350 = 2 bottles, costPerBottle=(0.1 × 700) / 2 = 35, total=2 × 35 = 70.
    expect(
      costOf(2, 0.1, {
        id: 'lot-mou',
        purchaseQuantity: decimal(700),
        purchaseUnitCost: decimal(0.1),
        units: {
          sourceUnit: {
            id: 'pu-mou',
            unitRole: 'MOU',
            dependsOn: 'BASE',
            conversionRate: decimal(350),
          } as ProductUnitContext,
          sourceBaseUnit: null,
          mouUnit: null,
        },
      }),
    ).toBe(70);
  });

  it('converts a custom purchase unit that depends on BASE', () => {
    // quantity=6 bottles, unitCost=60 per case, lot purchaseQuantity=1 case at 12 bottles/case.
    // baseQuantity=1 × 12 = 12 bottles, costPerBottle=(60 × 1) / 12 = 5, total=6 × 5 = 30.
    expect(
      costOf(6, 60, {
        id: 'lot-case',
        purchaseQuantity: decimal(1),
        purchaseUnitCost: decimal(60),
        units: {
          sourceUnit: {
            id: 'pu-case',
            unitRole: 'CUSTOM',
            dependsOn: 'BASE',
            conversionRate: decimal(12),
          } as ProductUnitContext,
          sourceBaseUnit: null,
          mouUnit: null,
        },
      }),
    ).toBe(30);
  });

  it('converts a custom purchase unit that depends on the MOU', () => {
    // quantity=1 bottle, unitCost=2 per shot, lot purchaseQuantity=14 shots at 25 ml/shot.
    // 14 × 25 ml = 350 ml, and 350 ml / 350 ml per bottle = 1 bottle.
    // costPerBottle=(2 × 14) / 1 = 28, total=1 × 28 = 28.
    expect(
      costOf(1, 2, {
        id: 'lot-shot',
        purchaseQuantity: decimal(14),
        purchaseUnitCost: decimal(2),
        units: {
          sourceUnit: {
            id: 'pu-shot',
            unitRole: 'CUSTOM',
            dependsOn: 'MOU',
            conversionRate: decimal(25),
          } as ProductUnitContext,
          sourceBaseUnit: null,
          mouUnit: {
            id: 'pu-mou',
            unitRole: 'MOU',
            dependsOn: 'BASE',
            conversionRate: decimal(350),
          } as ProductUnitContext,
        },
      }),
    ).toBe(28);
  });

  it('uses the supplied unit cost rather than the lot purchase unit cost', () => {
    // quantity=2 bottles, supplied unitCost=6 per bottle, lot purchaseUnitCost=5, purchaseQuantity=10.
    // costPerBottle=(6 × 10) / 10 = 6, total=2 × 6 = 12.
    expect(
      costOf(2, 6, {
        id: 'lot-bottle',
        purchaseQuantity: decimal(10),
        purchaseUnitCost: decimal(5),
        units: {
          sourceUnit: {
            id: 'pu-bottle',
            unitRole: 'BASE',
            dependsOn: null,
            conversionRate: null,
          } as ProductUnitContext,
          sourceBaseUnit: null,
          mouUnit: null,
        },
      }),
    ).toBe(12);
  });

  it('returns zero when the lot has no base quantity', () => {
    // quantity=5 bottles, unitCost=5 per bottle, lot purchaseQuantity=0 => baseQuantity=0.
    // costPerBottle=0, total=5 × 0 = 0.
    expect(
      costOf(5, 5, {
        id: 'lot-bottle',
        purchaseQuantity: decimal(0),
        purchaseUnitCost: decimal(5),
        units: {
          sourceUnit: {
            id: 'pu-bottle',
            unitRole: 'BASE',
            dependsOn: null,
            conversionRate: null,
          } as ProductUnitContext,
          sourceBaseUnit: null,
          mouUnit: null,
        },
      }),
    ).toBe(0);
  });
});

describe('cogsOf', () => {
  it('sums each group at its frozen unit cost', () => {
    // Group 1: quantityPulled=10 bottles, unitCost=6 per bottle, lot baseQuantity=10.
    // costPerBottle=6, groupCost=10 × 6 = 60.
    // Group 2: quantityPulled=1 bottle, unitCost=0.1 per ml, lot baseQuantity=700/350=2.
    // costPerBottle=(0.1 × 700) / 2 = 35, groupCost=1 × 35 = 35.
    // Total=60 + 35 = 95.
    const groups: CostGroup[] = [
      { stockBatchLineId: 'lot-bottle', unitCost: decimal(6), quantityPulled: decimal(10) },
      { stockBatchLineId: 'lot-mou', unitCost: decimal(0.1), quantityPulled: decimal(1) },
    ];

    expect(
      cogsOf(groups, [
        {
          id: 'lot-bottle',
          purchaseQuantity: decimal(10),
          purchaseUnitCost: decimal(5),
          units: {
            sourceUnit: {
              id: 'pu-bottle',
              unitRole: 'BASE',
              dependsOn: null,
              conversionRate: null,
            } as ProductUnitContext,
            sourceBaseUnit: null,
            mouUnit: null,
          },
        },
        {
          id: 'lot-mou',
          purchaseQuantity: decimal(700),
          purchaseUnitCost: decimal(0.1),
          units: {
            sourceUnit: {
              id: 'pu-mou',
              unitRole: 'MOU',
              dependsOn: 'BASE',
              conversionRate: decimal(350),
            } as ProductUnitContext,
            sourceBaseUnit: null,
            mouUnit: null,
          },
        },
      ]),
    ).toBe(95);
  });

  it('skips groups without a pulled quantity or matching lot', () => {
    // Group 1: quantityPulled=null => skipped.
    // Group 2: stockBatchLineId='missing' => no lot => skipped.
    // Group 3: quantityPulled=1, unitCost=6, lot baseQuantity=10 => costPerBottle=6, 1 × 6 = 6.
    const groups: CostGroup[] = [
      { stockBatchLineId: 'lot-bottle', unitCost: decimal(6), quantityPulled: null },
      { stockBatchLineId: 'missing', unitCost: decimal(6), quantityPulled: decimal(10) },
      { stockBatchLineId: 'lot-bottle', unitCost: decimal(6), quantityPulled: decimal(1) },
    ];

    expect(
      cogsOf(groups, [
        {
          id: 'lot-bottle',
          purchaseQuantity: decimal(10),
          purchaseUnitCost: decimal(5),
          units: {
            sourceUnit: {
              id: 'pu-bottle',
              unitRole: 'BASE',
              dependsOn: null,
              conversionRate: null,
            } as ProductUnitContext,
            sourceBaseUnit: null,
            mouUnit: null,
          },
        },
      ]),
    ).toBe(6);
  });

  it('returns zero when there are no groups', () => {
    // No groups => sum=0.
    expect(
      cogsOf(
        [],
        [
          {
            id: 'lot-bottle',
            purchaseQuantity: decimal(10),
            purchaseUnitCost: decimal(5),
            units: {
              sourceUnit: {
                id: 'pu-bottle',
                unitRole: 'BASE',
                dependsOn: null,
                conversionRate: null,
              } as ProductUnitContext,
              sourceBaseUnit: null,
              mouUnit: null,
            },
          },
        ],
      ),
    ).toBe(0);
  });
});

describe('lossesOf', () => {
  it('values each group at the lot purchase cost and adds row counts', () => {
    // Lot: purchaseQuantity=10, purchaseUnitCost=5 => costPerBottle=(5 × 10) / 10 = 5.
    // Group 1: standardQuantity=2, count=2 => 2 × 5 = 10.
    // Group 2: standardQuantity=1, count=3 => 1 × 5 = 5.
    // total=10 + 5 = 15, count=2 + 3 = 5.
    const groups: LossGroup[] = [
      { stockBatchLineId: 'lot-bottle', standardQuantity: decimal(2), count: 2 },
      { stockBatchLineId: 'lot-bottle', standardQuantity: decimal(1), count: 3 },
    ];

    expect(
      lossesOf(groups, [
        {
          id: 'lot-bottle',
          purchaseQuantity: decimal(10),
          purchaseUnitCost: decimal(5),
          units: {
            sourceUnit: {
              id: 'pu-bottle',
              unitRole: 'BASE',
              dependsOn: null,
              conversionRate: null,
            } as ProductUnitContext,
            sourceBaseUnit: null,
            mouUnit: null,
          },
        },
      ]),
    ).toEqual({ total: 15, count: 5 });
  });

  it('counts rows it cannot value', () => {
    // Group 1: standardQuantity=null, count=2 => no cost, count=2.
    // Group 2: stockBatchLineId='missing', count=1 => no cost, count=1.
    // Group 3: standardQuantity=1, count=3 => 1 × 5 = 5, count=3.
    // total=5, count=2 + 1 + 3 = 6.
    const groups: LossGroup[] = [
      { stockBatchLineId: 'lot-bottle', standardQuantity: null, count: 2 },
      { stockBatchLineId: 'missing', standardQuantity: decimal(1), count: 1 },
      { stockBatchLineId: 'lot-bottle', standardQuantity: decimal(1), count: 3 },
    ];

    expect(
      lossesOf(groups, [
        {
          id: 'lot-bottle',
          purchaseQuantity: decimal(10),
          purchaseUnitCost: decimal(5),
          units: {
            sourceUnit: {
              id: 'pu-bottle',
              unitRole: 'BASE',
              dependsOn: null,
              conversionRate: null,
            } as ProductUnitContext,
            sourceBaseUnit: null,
            mouUnit: null,
          },
        },
      ]),
    ).toEqual({ total: 5, count: 6 });
  });

  it('uses the lot conversion for a loss quantity', () => {
    // standardQuantity=2 bottles, lot purchaseQuantity=700 ml at 350 ml/bottle, purchaseUnitCost=0.1 per ml.
    // baseQuantity=700 / 350 = 2 bottles, costPerBottle=(0.1 × 700) / 2 = 35, total=2 × 35 = 70, count=1.
    const groups: LossGroup[] = [
      { stockBatchLineId: 'lot-mou', standardQuantity: decimal(2), count: 1 },
    ];

    expect(
      lossesOf(groups, [
        {
          id: 'lot-mou',
          purchaseQuantity: decimal(700),
          purchaseUnitCost: decimal(0.1),
          units: {
            sourceUnit: {
              id: 'pu-mou',
              unitRole: 'MOU',
              dependsOn: 'BASE',
              conversionRate: decimal(350),
            } as ProductUnitContext,
            sourceBaseUnit: null,
            mouUnit: null,
          },
        },
      ]),
    ).toEqual({ total: 70, count: 1 });
  });

  it('returns zero totals when there are no groups', () => {
    // No groups => total=0, count=0.
    expect(
      lossesOf(
        [],
        [
          {
            id: 'lot-bottle',
            purchaseQuantity: decimal(10),
            purchaseUnitCost: decimal(5),
            units: {
              sourceUnit: {
                id: 'pu-bottle',
                unitRole: 'BASE',
                dependsOn: null,
                conversionRate: null,
              } as ProductUnitContext,
              sourceBaseUnit: null,
              mouUnit: null,
            },
          },
        ],
      ),
    ).toEqual({ total: 0, count: 0 });
  });
});

describe('grossProfitOf', () => {
  it('subtracts tax and COGS from revenue', () => {
    // total=1150, taxAmount=150, cogs=60 => 1150 - 150 - 60 = 940.
    expect(grossProfitOf({ total: 1150, taxAmount: 150, count: 2 }, 60)).toBe(940);
  });

  it('can return a negative profit', () => {
    // total=100, taxAmount=150, cogs=0 => 100 - 150 - 0 = -50.
    expect(grossProfitOf({ total: 100, taxAmount: 150, count: 1 }, 0)).toBe(-50);
  });
});

describe('deltaPercentOf', () => {
  it('returns the rounded change from the previous value', () => {
    // current=940, previous=475 => ((940 - 475) / 475) × 100 = 97.8947..., rounded to 97.89.
    expect(deltaPercentOf(940, 475)).toBe(97.89);
  });

  it('returns null when the previous value is not positive', () => {
    // previous=0 and previous=-50 are both <= 0, so there is no percentage base.
    expect(deltaPercentOf(100, 0)).toBeNull();
    expect(deltaPercentOf(100, -50)).toBeNull();
  });

  it('returns a negative percentage for a decrease', () => {
    // current=80, previous=100 => ((80 - 100) / 100) × 100 = -20.
    expect(deltaPercentOf(80, 100)).toBe(-20);
  });
});
