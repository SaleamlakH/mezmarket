import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { BatchLineFormValues, ProductSummaryResponse } from '@mez/types';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { ApiError } from '@/lib/apiClient';
import { formatMoney } from '@/lib/format';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useCurrency } from '../hooks/useCurrency';
import { useAddBatch } from '../hooks/useAddBatch';
import { inventoryKeys, useCreateBatch } from '../hooks/useInventoryApi';
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
  onRecorded?: () => void;
}

/**
 * Records one purchase event. It is a single sheet that moves between three
 * steps — the batch itself, the product picker, and one product line's
 * fields — so the lines collapse into short rows in between instead of
 * nesting sheets on top of each other. The draft and its validation live in
 * `useAddBatch`; the catalog and unit requests belong to the components that
 * render them, so nothing is fetched until those steps are opened. The only
 * request made here is recording the batch.
 */
export function AddBatchSheet({ open, onClose, onRecorded }: AddBatchSheetProps) {
  const currency = useCurrency();
  const { form, linesError, lines, totalAmount, reset, addLine, updateLine, removeLine } =
    useAddBatch();
  const {
    isPending: isConfirming,
    error: confirmError,
    mutateAsync: createBatchAsync,
    reset: resetCreateBatch,
  } = useCreateBatch();

  const [step, setStep] = useState<Step>('batch');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [activeProduct, setActiveProduct] = useState<ProductSummaryResponse | null>(null);

  const editingLine = editingIndex === null ? undefined : lines[editingIndex];
  const title = step === 'line' && editingIndex !== null ? 'Edit product line' : STEP_TITLES[step];

  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;
  const queryClient = useQueryClient();

  const backToBatch = () => {
    setStep('batch');
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

  const editLine = (index: number, product: ProductSummaryResponse) => {
    setEditingIndex(index);
    setActiveProduct(product);
    setStep('line');
  };

  const saveLine = (line: BatchLineFormValues) => {
    if (editingIndex === null) addLine(line);
    else updateLine(editingIndex, line);
    backToBatch();
  };

  const close = () => {
    backToBatch();
    reset();
    resetCreateBatch();
    // The catalog and unit caches exist only for an open sheet's session,
    if (businessId) {
      queryClient.removeQueries({ queryKey: inventoryKeys.products(businessId) });
    }
    onClose();
  };

  const confirm = form.handleSubmit(async (values) => {
    try {
      await createBatchAsync(values);
      close();
      onRecorded?.();
    } catch {
      // The failure is surfaced through `confirmError`.
    }
  });

  let confirmTitle = 'Could not record the batch';
  let confirmDescription: string | undefined = 'Check your connection and try again.';
  if (confirmError instanceof ApiError) {
    confirmTitle = confirmError.message;
    confirmDescription = undefined;
  }

  return (
    <Dialog open={open} title={title} onClose={close} size="md">
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

          <BatchHeaderForm form={form} />

          {(linesError || confirmError) && (
            <div className="flex flex-col gap-2">
              {linesError && <Banner tone="danger" title={linesError} />}
              {confirmError && (
                <Banner tone="danger" title={confirmTitle} description={confirmDescription} />
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isConfirming}>
            {isConfirming ? 'Recording…' : 'Confirm batch'}
          </Button>
        </form>
      )}

      {step === 'pick' && <ProductPickerList onSelect={pickProduct} />}

      {step === 'line' && activeProduct && (
        <BatchLineForm
          product={activeProduct}
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
