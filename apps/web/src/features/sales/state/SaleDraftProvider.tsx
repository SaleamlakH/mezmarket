import type { ReactNode } from 'react';
import { useCallback, useMemo, useReducer } from 'react';
import { SaleDraftContext, type SaleDraftContextValue, type SaleDraftLine } from './saleDraft';

interface SaleDraftState {
  lines: SaleDraftLine[];
  activeProductId: string | null;
  activeLineId: string | null;
}

type SaleDraftAction =
  | { type: 'open'; productId: string; defaultUnitId: string }
  | { type: 'close' }
  | { type: 'setUnit'; unitId: string }
  | { type: 'setQuantity'; lineId: string; quantity: number }
  | { type: 'removeActive' }
  | { type: 'remove'; lineId: string }
  | { type: 'removeProduct'; productId: string }
  | { type: 'clear' }
  | { type: 'setUnitForProduct'; productId: string; unitId: string }
  | { type: 'setQuantityForProduct'; productId: string; defaultUnitId: string; quantity: number };

let lineCounter = 0;
const nextLineId = () => `sale-line-${++lineCounter}`;

function lastLineOf(lines: SaleDraftLine[], productId: string): SaleDraftLine | undefined {
  return lines.filter((line) => line.productId === productId).at(-1);
}

/**
 * The `setUnit` rules against one line of a product: a unit the product already
 * holds a line for is picked by re-activating that line; a unit chosen after a
 * quantity was set starts a sister line for that unit; otherwise the active
 * line's own unit is swapped.
 */
function withUnit(state: SaleDraftState, active: SaleDraftLine, unitId: string): SaleDraftState {
  const existing = state.lines.find(
    (line) => line.productId === active.productId && line.productUnitId === unitId,
  );
  if (existing) {
    return { ...state, activeProductId: active.productId, activeLineId: existing.id };
  }

  if (active.quantity !== 0) {
    const line: SaleDraftLine = {
      id: nextLineId(),
      productId: active.productId,
      productUnitId: unitId,
      quantity: 0,
    };
    return {
      lines: [...state.lines, line],
      activeProductId: active.productId,
      activeLineId: line.id,
    };
  }

  return {
    ...state,
    lines: state.lines.map((line) =>
      line.id === active.id ? { ...line, productUnitId: unitId } : line,
    ),
  };
}

/** The line the quick-edit controller of a product edits: its own line when
 * that product is the one being worked on, otherwise its last committed line,
 * falling back to no line so the controller opens the product on first use. */
function editableLineOf(
  state: SaleDraftState,
  productId: string,
  activeLineId: string | null,
): SaleDraftLine | undefined {
  if (state.activeProductId === productId) {
    return state.lines.find((line) => line.id === activeLineId);
  }
  return lastLineOf(state.lines, productId);
}

/**
 * Drops one line. When it was the active line, the product's remaining last
 * line takes over — or, with none left, the product closes.
 */
function withoutLine(state: SaleDraftState, lineId: string): SaleDraftState {
  const target = state.lines.find((line) => line.id === lineId);
  if (!target) return state;

  const lines = state.lines.filter((line) => line.id !== lineId);
  if (state.activeLineId !== lineId) return { ...state, lines };

  const remaining = lastLineOf(lines, target.productId);
  return {
    lines,
    activeProductId: remaining ? target.productId : null,
    activeLineId: remaining?.id ?? null,
  };
}

/**
 * Drops every line a product holds. When that product was the active one, its
 * editor closes with it; other products and their active line are untouched.
 */
function withoutProduct(state: SaleDraftState, productId: string): SaleDraftState {
  if (!state.lines.some((line) => line.productId === productId)) return state;

  const lines = state.lines.filter((line) => line.productId !== productId);
  if (state.activeProductId !== productId) return { ...state, lines };

  return { lines, activeProductId: null, activeLineId: null };
}

function reducer(state: SaleDraftState, action: SaleDraftAction): SaleDraftState {
  switch (action.type) {
    case 'open': {
      const existing = lastLineOf(state.lines, action.productId);
      if (existing) {
        return { ...state, activeProductId: action.productId, activeLineId: existing.id };
      }
      const line: SaleDraftLine = {
        id: nextLineId(),
        productId: action.productId,
        productUnitId: action.defaultUnitId,
        quantity: 0,
      };
      return {
        lines: [...state.lines, line],
        activeProductId: action.productId,
        activeLineId: line.id,
      };
    }

    case 'close':
      return { ...state, activeProductId: null, activeLineId: null };

    case 'setUnit': {
      // The selector's placeholder is an empty id; picking it means "no unit",
      // which must not swap the line or start a new one.
      if (!action.unitId) return state;
      const active = state.lines.find((line) => line.id === state.activeLineId);
      if (!active) return state;
      return withUnit(state, active, action.unitId);
    }

    case 'setUnitForProduct': {
      if (!action.unitId) return state;
      const active = editableLineOf(state, action.productId, state.activeLineId);
      if (!active) {
        const line: SaleDraftLine = {
          id: nextLineId(),
          productId: action.productId,
          productUnitId: action.unitId,
          quantity: 0,
        };
        return {
          lines: [...state.lines, line],
          activeProductId: action.productId,
          activeLineId: line.id,
        };
      }
      return withUnit(state, active, action.unitId);
    }

    case 'setQuantityForProduct': {
      const quantity = Math.max(0, action.quantity);
      const active = editableLineOf(state, action.productId, state.activeLineId);
      if (!active) {
        const line: SaleDraftLine = {
          id: nextLineId(),
          productId: action.productId,
          productUnitId: action.defaultUnitId,
          quantity,
        };
        return {
          lines: [...state.lines, line],
          activeProductId: action.productId,
          activeLineId: line.id,
        };
      }
      return {
        lines: state.lines.map((line) => (line.id === active.id ? { ...line, quantity } : line)),
        activeProductId: action.productId,
        activeLineId: active.id,
      };
    }

    case 'setQuantity': {
      const quantity = Math.max(0, action.quantity);
      return {
        ...state,
        lines: state.lines.map((line) =>
          line.id === action.lineId ? { ...line, quantity } : line,
        ),
      };
    }

    case 'removeActive':
      return state.activeLineId ? withoutLine(state, state.activeLineId) : state;

    case 'remove':
      return withoutLine(state, action.lineId);

    case 'removeProduct':
      return withoutProduct(state, action.productId);

    case 'clear':
      return { lines: [], activeProductId: null, activeLineId: null };

    default:
      return state;
  }
}

const INITIAL_STATE: SaleDraftState = {
  lines: [],
  activeProductId: null,
  activeLineId: null,
};

export function SaleDraftProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const linesForProduct = useCallback(
    (productId: string) => state.lines.filter((line) => line.productId === productId),
    [state.lines],
  );

  const value = useMemo<SaleDraftContextValue>(
    () => ({
      lines: state.lines,
      activeProductId: state.activeProductId,
      activeLineId: state.activeLineId,
      openProduct: (productId, defaultUnitId) =>
        dispatch({ type: 'open', productId, defaultUnitId }),
      closeProduct: () => dispatch({ type: 'close' }),
      setUnit: (unitId) => dispatch({ type: 'setUnit', unitId }),
      setQuantity: (lineId, quantity) => dispatch({ type: 'setQuantity', lineId, quantity }),
      removeActiveLine: () => dispatch({ type: 'removeActive' }),
      removeLine: (lineId) => dispatch({ type: 'remove', lineId }),
      removeProduct: (productId) => dispatch({ type: 'removeProduct', productId }),
      clear: () => dispatch({ type: 'clear' }),
      linesForProduct,
      setUnitForProduct: (productId, unitId) =>
        dispatch({ type: 'setUnitForProduct', productId, unitId }),
      setQuantityForProduct: (productId, defaultUnitId, quantity) =>
        dispatch({ type: 'setQuantityForProduct', productId, defaultUnitId, quantity }),
    }),
    [state.lines, state.activeProductId, state.activeLineId, linesForProduct],
  );

  return <SaleDraftContext.Provider value={value}>{children}</SaleDraftContext.Provider>;
}
