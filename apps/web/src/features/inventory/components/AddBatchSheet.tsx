import { useState } from 'react';
import type { BatchLineFormValues, ProductSummaryResponse } from '@mez/types';
import { Plus } from 'lucide-react';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { Toast } from '@/components/Toast';
import { formatMoney } from '@/lib/format';
import { useInventoryData } from '../hooks/useInventoryData';
import { useCurrency } from '../hooks/useCurrency';
import { useBatchDraft } from '../hooks/useBatchDraft';
import { BatchHeaderForm } from './BatchHeaderForm';
import { BatchLineForm } from './BatchLineForm';
import { BatchLineList } from './BatchLineList';
import { ProductPickerList } from './ProductPickerList';

type Step = 'batch' | 'pick' | 'line';

const STEP_TITLES: Record<Step, string> = {
  batch: 'Add batch',
  pick: 'Select a product',
  line: 'Product line',
};

export interface AddBatchSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Records one purchase event. It is a single sheet that moves between three
 * steps — the batch itself, the product picker, and one product line's
 * fields — so the lines collapse into short rows in between instead of
 * nesting sheets on top of each other.
 */
export function AddBatchSheet({ open, onClose }: AddBatchSheetProps) {
  const { products, purchasableUnitsByProductId } = useInventoryData();
  const currency = useCurrency();
  const {
    header,
    setHeaderField,
    lines,
    addLine,
    updateLine,
    removeLine,
    reset,
    hasLines,
    totalAmount,
  } = useBatchDraft();

  const [step, setStep] = useState<Step>('batch');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [pickedProductId, setPickedProductId] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const close = () => {
    reset();
    setStep('batch');
    setEditingIndex(null);
    setPickedProductId(null);
    setIsConfirmed(false);
    onClose();
  };

  const startNewLine = () => {
    setEditingIndex(null);
    setPickedProductId(null);
    setStep('pick');
  };

  const pickProduct = (product: ProductSummaryResponse) => {
    setPickedProductId(product.id);
    setStep('line');
  };

  const editLine = (index: number) => {
    setEditingIndex(index);
    setPickedProductId(null);
    setStep('line');
  };

  const backToBatch = () => {
    setStep('batch');
    setEditingIndex(null);
    setPickedProductId(null);
  };

  const saveLine = (line: BatchLineFormValues) => {
    if (editingIndex === null) addLine(line);
    else updateLine(editingIndex, line);
    backToBatch();
  };

  const editingLine = editingIndex === null ? undefined : lines[editingIndex];
  const activeProductId = editingLine?.productId ?? pickedProductId;
  const activeProduct = products.find((product) => product.id === activeProductId);
  const title = step === 'line' && editingIndex !== null ? 'Edit product line' : STEP_TITLES[step];

  return (
    <Dialog open={open} title={title} onClose={close} size="md">
      {isConfirmed && (
        <Toast
          message="Batch recorded"
          description="Presentation only — no request is sent yet."
          variant="success"
          duration={3000}
          position="top-center"
          onDismiss={() => setIsConfirmed(false)}
        />
      )}

      {step === 'batch' && (
        <div className="flex flex-col gap-5 pb-1">
          {/* What came in leads: the lines are the reason for the batch, so
              they are added and reviewed before the paperwork around it. */}
          <div>
            <SectionHeader
              title={lines.length === 0 ? 'Product lines' : `Product lines (${lines.length})`}
            />

            {lines.length === 0 ? (
              <EmptyState
                title="No product lines yet"
                description="Add what came in with this delivery."
                action={
                  <Button variant="secondary" type="button" onClick={startNewLine}>
                    <Plus size={14} aria-hidden /> Add product line
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-3 rounded-xl border border-(--border) p-2">
                <BatchLineList
                  lines={lines}
                  products={products}
                  unitsByProductId={purchasableUnitsByProductId}
                  currency={currency}
                  onEdit={editLine}
                  onRemove={removeLine}
                />

                <div className="flex items-baseline justify-between gap-3 border-t border-(--border) px-2 pt-3">
                  <p className="m-0 text-sm font-semibold text-(--text)">Batch total</p>
                  <p className="m-0 font-mono text-sm font-semibold tabular-nums text-(--text)">
                    {formatMoney(totalAmount, currency)}
                  </p>
                </div>

                <Button variant="secondary" type="button" onClick={startNewLine} className="w-full">
                  <Plus size={14} aria-hidden /> Add product line
                </Button>
              </div>
            )}
          </div>

          <BatchHeaderForm header={header} onChange={setHeaderField} />

          <Button
            type="button"
            onClick={() => setIsConfirmed(true)}
            disabled={!hasLines}
            className="w-full"
          >
            Confirm batch
          </Button>
        </div>
      )}

      {step === 'pick' && <ProductPickerList products={products} onSelect={pickProduct} />}

      {step === 'line' && activeProduct && (
        <BatchLineForm
          product={activeProduct}
          units={purchasableUnitsByProductId[activeProduct.id] ?? []}
          currency={currency}
          initialLine={editingLine}
          submitLabel={editingIndex === null ? 'Add line' : 'Save changes'}
          onSave={saveLine}
          onCancel={backToBatch}
        />
      )}
    </Dialog>
  );
}
