import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { ProductSummaryResponse, SaleLineFormValues } from '@mez/types';
import { Controller } from 'react-hook-form';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { SectionHeader } from '@/components/SectionHeader';
import { catalogKeys } from '@/hooks/useCatalogApi';
import { useCurrency } from '@/hooks/useCurrency';
import { useProductUploadUrls } from '@/hooks/useProductUploadUrls';
import { ApiError } from '@/lib/apiClient';
import { dateInputToInstant, instantToDateInputValue } from '@/lib/format';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useNewSale } from '../hooks/useNewSale';
import { useCreateSale } from '../hooks/useSalesApi';
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

/** Records a sale in one sheet across three steps: the sale, the product picker, and a line. */
export function NewSaleSheet({ open, onClose, onRecorded }: NewSaleSheetProps) {
  const currency = useCurrency();
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;
  const { data: uploadUrls } = useProductUploadUrls(businessId);
  const queryClient = useQueryClient();
  const { form, lines, linesError, addLine, updateLine, removeLine, reset } = useNewSale();
  const totals = useSaleTotals(lines);
  const {
    isPending: isRecording,
    error: recordError,
    mutateAsync: createSaleAsync,
    reset: resetCreateSale,
  } = useCreateSale();

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

  const editLine = (index: number, product: ProductSummaryResponse) => {
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
    resetCreateSale();
    // The catalog and unit caches exist only for an open sheet's session.
    if (businessId) {
      queryClient.removeQueries({ queryKey: catalogKeys.products(businessId) });
    }
    onClose();
  };

  const record = form.handleSubmit(async (values) => {
    try {
      await createSaleAsync(values);
      close();
      onRecorded?.();
    } catch {
      // The failure is surfaced through `recordError`.
    }
  });

  let recordTitle = 'Could not record the sale';
  let recordDescription: string | undefined = 'Check your connection and try again.';
  if (recordError instanceof ApiError) {
    recordTitle = recordError.message;
    recordDescription = undefined;
  }

  return (
    <Dialog open={open} title={title} onClose={close} size="md">
      {step === 'sale' && (
        <form onSubmit={record} className="flex flex-col gap-5 pb-1">
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

          <Controller
            control={form.control}
            name="saleDatetime"
            render={({ field, fieldState }) => (
              <Field
                id="saleDatetime"
                label="Sale date"
                hint="The day this sale happened"
                error={fieldState.error?.message}
              >
                <Input
                  id="saleDatetime"
                  type="date"
                  ref={field.ref}
                  value={field.value ? instantToDateInputValue(field.value) : ''}
                  onChange={(event) => field.onChange(dateInputToInstant(event.target.value))}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              </Field>
            )}
          />

          {(linesError || recordError) && (
            <div className="flex flex-col gap-2">
              {linesError && <Banner tone="danger" title={linesError} />}
              {recordError && (
                <Banner tone="danger" title={recordTitle} description={recordDescription} />
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isRecording}>
            {isRecording ? 'Recording…' : 'Record sale'}
          </Button>
        </form>
      )}

      {step === 'pick' && (
        <ProductPickerList onSelect={pickProduct} businessId={businessId} uploadUrls={uploadUrls} />
      )}

      {step === 'line' && activeProduct && (
        <SaleLineForm
          product={activeProduct}
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
