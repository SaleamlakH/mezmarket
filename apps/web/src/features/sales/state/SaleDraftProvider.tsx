import type { ReactNode } from 'react';
import { useCallback, useMemo, useReducer } from 'react';
import type {
  BusinessMemberSummaryResponse,
  CustomerSummaryResponse,
  PaymentMethod,
  PaymentStatus,
} from '@mez/types';
import {
  EMPTY_PAYMENT,
  SaleDraftContext,
  type SaleDraftContextValue,
  type SaleDraftLine,
  type SalePaymentDraft,
} from './saleDraft';

interface SaleDraftState {
  lines: SaleDraftLine[];
  activeProductId: string | null;
  activeLineId: string | null;
  customer: CustomerSummaryResponse | null;
  server: BusinessMemberSummaryResponse | null;
  payment: SalePaymentDraft;
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
  | { type: 'setQuantityForProduct'; productId: string; defaultUnitId: string; quantity: number }
  | { type: 'attachCustomer'; customer: CustomerSummaryResponse }
  | { type: 'clearCustomer' }
  | { type: 'attachServer'; server: BusinessMemberSummaryResponse }
  | { type: 'clearServer' }
  | { type: 'setPaymentStatus'; status: PaymentStatus }
  | { type: 'setPaymentAmount'; amount: string }
  | { type: 'setPaymentMethod'; method: PaymentMethod | '' }
  | { type: 'setPaymentDetail'; detail: string };

let lineCounter = 0;
const nextLineId = () => `sale-line-${++lineCounter}`;

function lastLineOf(lines: SaleDraftLine[], productId: string): SaleDraftLine | undefined {
  return lines.filter((line) => line.productId === productId).at(-1);
}

/** Applies a unit choice to one line of a product. */
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
      ...state,
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

/** The line a product's quick-edit controller edits. */
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

/** Drops one line. */
function withoutLine(state: SaleDraftState, lineId: string): SaleDraftState {
  const target = state.lines.find((line) => line.id === lineId);
  if (!target) return state;

  const lines = state.lines.filter((line) => line.id !== lineId);
  if (state.activeLineId !== lineId) return { ...state, lines };

  const remaining = lastLineOf(lines, target.productId);
  return {
    ...state,
    lines,
    activeProductId: remaining ? target.productId : null,
    activeLineId: remaining?.id ?? null,
  };
}

/** Drops every line a product holds. */
function withoutProduct(state: SaleDraftState, productId: string): SaleDraftState {
  if (!state.lines.some((line) => line.productId === productId)) return state;

  const lines = state.lines.filter((line) => line.productId !== productId);
  if (state.activeProductId !== productId) return { ...state, lines };

  return { ...state, lines, activeProductId: null, activeLineId: null };
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
        ...state,
        lines: [...state.lines, line],
        activeProductId: action.productId,
        activeLineId: line.id,
      };
    }

    case 'close':
      return { ...state, activeProductId: null, activeLineId: null };

    case 'setUnit': {
      // An empty unit id means "no unit".
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
          ...state,
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
          ...state,
          lines: [...state.lines, line],
          activeProductId: action.productId,
          activeLineId: line.id,
        };
      }
      return {
        ...state,
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
      return INITIAL_STATE;

    case 'attachCustomer':
      return { ...state, customer: action.customer };

    case 'clearCustomer':
      return { ...state, customer: null };

    case 'attachServer':
      return { ...state, server: action.server };

    case 'clearServer':
      return { ...state, server: null };

    case 'setPaymentStatus':
      // Switching status clears any typed amount.
      return {
        ...state,
        payment: { ...state.payment, status: action.status, amount: '', amountEdited: false },
      };

    case 'setPaymentAmount':
      return { ...state, payment: { ...state.payment, amount: action.amount, amountEdited: true } };

    case 'setPaymentMethod':
      return { ...state, payment: { ...state.payment, method: action.method } };

    case 'setPaymentDetail':
      return { ...state, payment: { ...state.payment, methodDetail: action.detail } };

    default:
      return state;
  }
}

const INITIAL_STATE: SaleDraftState = {
  lines: [],
  activeProductId: null,
  activeLineId: null,
  customer: null,
  server: null,
  payment: EMPTY_PAYMENT,
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
      customer: state.customer,
      server: state.server,
      payment: state.payment,
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
      attachCustomer: (customer) => dispatch({ type: 'attachCustomer', customer }),
      clearCustomer: () => dispatch({ type: 'clearCustomer' }),
      attachServer: (server) => dispatch({ type: 'attachServer', server }),
      clearServer: () => dispatch({ type: 'clearServer' }),
      setPaymentStatus: (status) => dispatch({ type: 'setPaymentStatus', status }),
      setPaymentAmount: (amount) => dispatch({ type: 'setPaymentAmount', amount }),
      setPaymentMethod: (method) => dispatch({ type: 'setPaymentMethod', method }),
      setPaymentDetail: (detail) => dispatch({ type: 'setPaymentDetail', detail }),
      setUnitForProduct: (productId, unitId) =>
        dispatch({ type: 'setUnitForProduct', productId, unitId }),
      setQuantityForProduct: (productId, defaultUnitId, quantity) =>
        dispatch({ type: 'setQuantityForProduct', productId, defaultUnitId, quantity }),
    }),
    [
      state.lines,
      state.activeProductId,
      state.activeLineId,
      state.customer,
      state.server,
      state.payment,
      linesForProduct,
    ],
  );

  return <SaleDraftContext.Provider value={value}>{children}</SaleDraftContext.Provider>;
}
