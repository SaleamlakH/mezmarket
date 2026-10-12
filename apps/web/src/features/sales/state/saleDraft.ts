import { createContext } from 'react';

/**
 * A line being built for the new sale, before any request is made. This is the
 * UI-only draft: the unit is a catalog id and the quantity a plain number.
 * Validation and the API payload come later.
 */
export interface SaleDraftLine {
  id: string;
  productId: string;
  productUnitId: string;
  quantity: number;
}

export interface SaleDraftContextValue {
  lines: SaleDraftLine[];
  /** The product whose controls are open — one at a time. */
  activeProductId: string | null;
  /** The line the unit selector and stepper are bound to. */
  activeLineId: string | null;
  openProduct: (productId: string, defaultUnitId: string) => void;
  closeProduct: () => void;
  setUnit: (unitId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  removeActiveLine: () => void;
  linesForProduct: (productId: string) => SaleDraftLine[];
  /** Switches a product's active line to a unit, opening the product first if
   * its lines are not the ones being edited right now. Used by the inline
   * quick-edit controller, whose first interaction has to both activate a line
   * and pick the unit in one go. */
  setUnitForProduct: (productId: string, unitId: string) => void;
  /** Sets a product's active line quantity, opening the product first if its
   * lines are not the ones being edited right now. The `defaultUnitId` is what
   * a brand-new line starts with when the product was never opened before. */
  setQuantityForProduct: (productId: string, defaultUnitId: string, quantity: number) => void;
}

export const SaleDraftContext = createContext<SaleDraftContextValue | null>(null);
