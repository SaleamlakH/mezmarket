import type { DownloadUrlsResponse } from '@mez/types';
import { useEffect, useState, type FormEvent } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { SuccessState } from '@/components/SuccessState';
import { useCurrency } from '@/hooks/useCurrency';
import { useIsMobile } from '@/hooks/useIsMobile';
import { formatMoney, pluralize } from '@/lib/format';
import { useProductDraftView } from '../hooks/useProductDraftView';
import { useSaleCheckout } from '../hooks/useSaleCheckout';
import { useSaleDraftTotals } from '../hooks/useSaleDraftTotals';
import { useSaleDraftView } from '../hooks/useSaleDraftView';
import {
  PAYMENT_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TONES,
  formatLineCount,
} from '../lib/saleDisplay';
import { useSaleDraft } from '../state/useSaleDraft';
import { CartItem } from './CartItem';
import { CartItemEditor } from './CartItemEditor';
import { CustomerPickerDialog } from './CustomerPickerDialog';
import { ServerPickerDialog } from './ServerPickerDialog';
import { SaleActionBar } from './SaleActionBar';
import { SaleCustomerAction } from './SaleCustomerAction';
import { SaleServerAction } from './SaleServerAction';
import { SalePaymentControl } from './SalePaymentControl';
import { SaleTotalsCard } from './SaleTotalsCard';

export interface SalePanelProps {
  businessId?: string | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
  /** Container styles. */
  className?: string;
  /** Dismisses the panel; renders a close control when given. */
  onClose?: (() => void) | undefined;
}

/** The sale sheet: the draft's cart items, totals, payment and confirm button. */
export function SalePanel(props: SalePanelProps) {
  const { hasLines } = useSaleDraftView();
  if (!hasLines) return null;
  return <SalePanelContent {...props} />;
}

function SalePanelContent({ businessId, uploadUrls, className, onClose }: SalePanelProps) {
  const currency = useCurrency();
  const isMobile = useIsMobile();
  const { cartItems, itemCount } = useSaleDraftView();
  const totals = useSaleDraftTotals();
  const checkout = useSaleCheckout();
  const {
    clear,
    openProduct,
    removeProduct,
    closeProduct,
    setUnitForProduct,
    setQuantityForProduct,
    setQuantity,
    removeLine,
    customer,
    attachCustomer,
    clearCustomer,
    server,
    attachServer,
    clearServer,
  } = useSaleDraft();
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
  const [isServerPickerOpen, setIsServerPickerOpen] = useState(false);
  const editor = useProductDraftView(editingProductId ?? '');

  // Opening the editor asks for the product's units.
  const { requestUnits } = editor;
  useEffect(() => {
    if (editingProductId) requestUnits();
  }, [editingProductId, requestUnits]);

  const handleEdit = (productId: string) => {
    if (isMobile) {
      openProduct(productId, '');
    } else {
      setEditingProductId(productId);
    }
  };

  const handleRemove = (productId: string) => {
    removeProduct(productId);
    if (editingProductId === productId) setEditingProductId(null);
  };

  const handleEditorClose = () => {
    closeProduct();
    setEditingProductId(null);
  };

  if (checkout.isSuccess) {
    const sale = checkout.sale;
    // A pending sale has no payment row yet.
    const payment = sale?.payments.at(-1);
    const productCount = sale ? new Set(sale.lines.map((line) => line.productId)).size : 0;

    return (
      <div className={`flex min-h-0 flex-col md:mr-3.5 pb-2 ${className ?? ''}`}>
        <div className="flex grow items-center justify-center px-2 py-6">
          <SuccessState className="w-full">
            <p className="m-0 text-[13px] font-semibold text-(--text)">Sale recorded</p>

            {sale && (
              <div className="flex flex-col items-center gap-1">
                <p className="m-0 flex items-baseline gap-2">
                  <span className="font-mono text-sm font-semibold text-(--text)">
                    #{sale.invoiceNumber}
                  </span>
                  <span className="text-xs text-(--text-muted)">
                    {productCount} {pluralize(productCount, 'product')}
                  </span>
                </p>

                <p className="m-0 text-2xl font-bold tabular-nums text-(--text)">
                  {formatMoney(sale.total, currency)}
                </p>

                <Badge tone={payment ? 'neutral' : PAYMENT_TONES[sale.paymentStatus]}>
                  {payment
                    ? PAYMENT_METHOD_LABELS[payment.method]
                    : PAYMENT_LABELS[sale.paymentStatus]}
                </Badge>
              </div>
            )}

            <Button type="button" variant="secondary" onClick={checkout.finish}>
              Done
            </Button>
          </SuccessState>
        </div>
      </div>
    );
  }

  // The dialogs stay outside the form so their Enter keys cannot confirm the sale.
  const handleConfirm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    checkout.confirm();
  };

  return (
    <div className={`flex min-h-0 flex-col md:mr-3.5 pb-2 ${className ?? ''}`}>
      <form className="flex min-h-0 flex-col grow" onSubmit={handleConfirm}>
        <header className="sticky top-0 z-10 flex shrink-0 flex-col gap-2 border-b border-(--border) bg-(--surface-primary) py-2 md:px-2">
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-(--text)">
              <ShoppingCart size={16} aria-hidden /> Current sale
              <Badge tone="accent">{formatLineCount(itemCount)}</Badge>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <Button type="button" variant="secondary" size="md" onClick={clear}>
                Clear
              </Button>
              {onClose && (
                <Button
                  type="button"
                  shape="square"
                  size="md"
                  variant="field"
                  aria-label="Close"
                  title="Close"
                  onClick={onClose}
                >
                  <X size={15} aria-hidden />
                </Button>
              )}
            </span>
          </div>

          <SaleActionBar>
            <SaleCustomerAction
              customer={customer}
              onAttach={() => setIsCustomerPickerOpen(true)}
              onClear={clearCustomer}
            />
            <SaleServerAction
              server={server}
              onAttach={() => setIsServerPickerOpen(true)}
              onClear={clearServer}
            />
          </SaleActionBar>
        </header>

        <div className="min-h-0 grow overflow-y-auto py-2 md:px-2">
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {cartItems.map((cartItem) => (
              <li key={cartItem.productId}>
                <CartItem
                  cartItem={cartItem}
                  businessId={businessId}
                  uploadUrls={uploadUrls}
                  onEdit={handleEdit}
                  onRemove={handleRemove}
                  isEditing={editingProductId === cartItem.productId}
                />
              </li>
            ))}
          </ul>
        </div>

        <footer className="flex shrink-0 flex-col gap-2 border-t border-(--border) py-2 md:px-2">
          <SaleTotalsCard totals={totals} currency={currency} />
          <SalePaymentControl total={totals.total} />
          {checkout.error && (
            <p role="alert" className="m-0 text-[11px] font-semibold text-(--danger)">
              {checkout.error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={checkout.isSubmitting}>
            {checkout.isSubmitting ? 'Recording sale…' : 'Confirm sale'}
          </Button>
        </footer>
      </form>

      {editingProductId && editor.product && (
        <Dialog open onClose={handleEditorClose} size="md">
          <CartItemEditor
            product={editor.product}
            units={editor.units}
            unitsLoading={editor.unitsLoading}
            unitsReady={editor.unitsReady}
            onUnitsRequested={requestUnits}
            lines={editor.lines}
            activeLine={editor.activeLine ?? editor.lines.at(-1)}
            currency={currency}
            businessId={businessId}
            uploadUrls={uploadUrls}
            onUnitChange={(unitId) => setUnitForProduct(editingProductId, unitId)}
            onQuantityChange={(quantity) =>
              setQuantityForProduct(editingProductId, editor.units[0]?.id ?? '', quantity)
            }
            onLineQuantityChange={(lineId, quantity) => setQuantity(lineId, quantity)}
            onLineRemove={removeLine}
            onClose={handleEditorClose}
          />
        </Dialog>
      )}

      <CustomerPickerDialog
        open={isCustomerPickerOpen}
        onClose={() => setIsCustomerPickerOpen(false)}
        onSelect={attachCustomer}
        selectedCustomerId={customer?.id ?? null}
      />
      <ServerPickerDialog
        open={isServerPickerOpen}
        onClose={() => setIsServerPickerOpen(false)}
        onSelect={attachServer}
        selectedServerId={server?.id ?? null}
      />
    </div>
  );
}
