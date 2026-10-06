import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { BatchLineFormValues } from '@mez/types';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { Toast } from '@/components/Toast';
import { formatMoney } from '@/lib/format';
import { useCurrency } from '../hooks/useCurrency';
import { useAddBatch } from '../hooks/useAddBatch';
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
 * nesting sheets on top of each other. The draft, its steps, and the
 * validation that gates the confirmation all live in `useAddBatch`; this
 * component only lays them out.
 */
export function AddBatchSheet({ open, onClose }: AddBatchSheetProps) {
  const currency = useCurrency();
  const {
    form,
    linesError,
    isConfirmed,
    products,
    purchasableUnitsByProductId,
    lines,
    totalAmount,
    confirm,
    dismissConfirmed,
    close: closeDraft,
    addLine,
    updateLine,
    removeLine,
  } = useAddBatch({ onClose });

  const [step, setStep] = useState<Step>('batch');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [pickedProductId, setPickedProductId] = useState<string | null>(null);

  const editingLine = editingIndex === null ? undefined : lines[editingIndex];
  const activeProductId = editingLine?.productId ?? pickedProductId;
  const activeProduct =
    activeProductId == null
      ? undefined
      : products.find((product) => product.id === activeProductId);
  const activeUnits =
    activeProduct == null ? [] : (purchasableUnitsByProductId[activeProduct.id] ?? []);
  const title = step === 'line' && editingIndex !== null ? 'Edit product line' : STEP_TITLES[step];

  const backToBatch = () => {
    setStep('batch');
    setEditingIndex(null);
    setPickedProductId(null);
  };

  const startNewLine = () => {
    setEditingIndex(null);
    setPickedProductId(null);
    setStep('pick');
  };

  const pickProduct = (product: { id: string }) => {
    setPickedProductId(product.id);
    setStep('line');
  };

  const editLine = (index: number) => {
    setEditingIndex(index);
    setPickedProductId(null);
    setStep('line');
  };

  const saveLine = (line: BatchLineFormValues) => {
    if (editingIndex === null) addLine(line);
    else updateLine(editingIndex, line);
    backToBatch();
  };

  const close = () => {
    backToBatch();
    closeDraft();
  };

  return (
    <Dialog open={open} title={title} onClose={close} size="md">
      {isConfirmed && (
        <Toast
          message="Batch recorded"
          description="Presentation only — no request is sent yet."
          variant="success"
          duration={3000}
          position="top-center"
          onDismiss={dismissConfirmed}
        />
      )}

      {step === 'batch' && (
        <form onSubmit={confirm} className="flex flex-col gap-5 pb-1">
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

            {linesError && (
              <p className="mt-2 text-[11px] font-semibold text-(--danger)" role="alert">
                {linesError}
              </p>
            )}
          </div>

          <BatchHeaderForm form={form} />

          <Button type="submit" className="w-full">
            Confirm batch
          </Button>
        </form>
      )}

      {step === 'pick' && <ProductPickerList products={products} onSelect={pickProduct} />}

      {step === 'line' && activeProduct && (
        <BatchLineForm
          product={activeProduct}
          units={activeUnits}
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
