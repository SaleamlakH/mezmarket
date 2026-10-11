import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { ProductSummaryResponse, SaleLineFormValues } from '@mez/types';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { products, sellableUnitsByProductId } from '../__tests__/fixtures';
import { useCurrency } from '@/hooks/useCurrency';
import { useProductUploadUrls } from '@/hooks/useProductUploadUrls';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useNewSale } from '../hooks/useNewSale';
import { useSaleTotals } from '../hooks/useSaleTotals';
import { ProductPickerList } from './ProductPickerList';
import { SaleLineForm } from './SaleLineForm';
import { SaleLineList } from './SaleLineList';
import { SaleTotalsCard } from './SaleTotalsCard';

type Step = 'sale' | 'pick' | 'line';

const STEP_TITLES: Record<Step, string> = {
  sale: 'New sale',
  pick: 'Select a product',
  line: 'Sale line',
};

export interface NewSaleSheetProps {
  open: boolean;
  onClose: () => void;
  onRecorded?: () => void;
}

/** The units a product can actually be sold in. */
function sellableUnitsFor(product: ProductSummaryResponse) {
  return (sellableUnitsByProductId[product.id] ?? []).filter((unit) => unit.sellCapable);
}

/** Records a sale in one sheet across three steps: the sale, the product picker, and a line. */
export function NewSaleSheet({ open, onClose, onRecorded }: NewSaleSheetProps) {
  const currency = useCurrency();
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;
  const { data: uploadUrls } = useProductUploadUrls(businessId);
  const { form, lines, linesError, addLine, updateLine, removeLine, reset } = useNewSale();
  const totals = useSaleTotals(lines);

  const [step, setStep] = useState<Step>('sale');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [activeProduct, setActiveProduct] = useState<ProductSummaryResponse | null>(null);

  const editingLine = editingIndex === null ? undefined : lines[editingIndex];
  const title = step === 'line' && editingIndex !== null ? 'Edit sale line' : STEP_TITLES[step];

  const backToSale = () => {
    setStep('sale');
    setEditingIndex(null);
    setActiveProduct(null);
  };

  const startNewLine = () => {
    setEditingIndex(null);
    setActiveProduct(null);
    setStep('pick');
  };

  const pickProduct = (product: ProductSummaryResponse) => {
    setEditingIndex(null);
    setActiveProduct(product);
    setStep('line');
  };

  const editLine = (index: number) => {
    const line = lines[index];
    if (!line) return;

    const product = products.find((entry) => entry.id === line.productId);
    if (!product) return;

    setEditingIndex(index);
    setActiveProduct(product);
    setStep('line');
  };

  const saveLine = (line: SaleLineFormValues) => {
    if (editingIndex === null) addLine(line);
    else updateLine(editingIndex, line);
    backToSale();
  };

  const close = () => {
    backToSale();
    reset();
    onClose();
  };

  const record = () => {
    close();
    onRecorded?.();
  };

  return (
    <Dialog open={open} title={title} onClose={close} size="md">
      {step === 'sale' && (
        <form onSubmit={form.handleSubmit(record)} className="flex flex-col gap-5 pb-1">
          <div>
            <SectionHeader
              title={lines.length === 0 ? 'Sale lines' : `Sale lines (${lines.length})`}
            />

            {lines.length === 0 ? (
              <EmptyState
                title="No lines yet"
                description="Add the products this sale is for."
                action={
                  <Button variant="secondary" type="button" onClick={startNewLine}>
                    <Plus size={14} aria-hidden /> Add line
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-3 rounded-xl border border-(--border) p-2">
                <SaleLineList
                  lines={lines}
                  currency={currency}
                  onEdit={editLine}
                  onRemove={removeLine}
                />

                <Button variant="secondary" type="button" onClick={startNewLine} className="w-full">
                  <Plus size={14} aria-hidden /> Add line
                </Button>
              </div>
            )}
          </div>

          {lines.length > 0 && <SaleTotalsCard totals={totals} currency={currency} />}

          {linesError && <Banner tone="danger" title={linesError} />}

          <Button type="submit" className="w-full">
            Record sale
          </Button>
        </form>
      )}

      {step === 'pick' && (
        <ProductPickerList onSelect={pickProduct} businessId={businessId} uploadUrls={uploadUrls} />
      )}

      {step === 'line' && activeProduct && (
        <SaleLineForm
          product={activeProduct}
          units={sellableUnitsFor(activeProduct)}
          currency={currency}
          businessId={businessId}
          uploadUrls={uploadUrls}
          initialLine={editingLine}
          submitLabel={editingIndex === null ? 'Add line' : 'Save changes'}
          onSave={saveLine}
          onCancel={backToSale}
        />
      )}
    </Dialog>
  );
}
