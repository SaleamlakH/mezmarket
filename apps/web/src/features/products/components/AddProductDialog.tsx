import { useCallback, useMemo, useRef, useState } from 'react';
import { Controller } from 'react-hook-form';
import { ChevronDown, Image } from 'lucide-react';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Switch } from '@/components/Switch';
import { useCreateProductForm } from '@/features/products/hooks/useCreateProductForm';
import { UPLOAD_MIME_TYPES } from '@mez/validation';
import type { CreateProductResponse } from '@mez/types';

export interface AddProductDialogProps {
  open: boolean;
  businessId: string;
  onClose: () => void;
  onCreated: (product: CreateProductResponse) => void;
}

interface ProductFormProps {
  businessId: string;
  onCreated: (product: CreateProductResponse) => void;
  onClose: () => void;
}

function ProductForm({ businessId, onCreated, onClose }: ProductFormProps) {
  const [mouOpen, setMouOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    watch,
    setValue,
    trigger,
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    file,
    previewUrl,
    imageError,
    pickImage,
    dimensions,
    dimensionByUnitId,
    unitName,
    formError,
  } = useCreateProductForm({ businessId, onCreated });

  const baseUnitName = unitName(watch('baseUnit.unitId')) || 'unit';
  const contentUnitName = unitName(watch('mou.unitId')) || 'content unit';

  const unitGroups = useMemo(
    () =>
      dimensions.map((dimension) => ({
        label: dimension.name,
        options: dimension.units.map((unit) => ({
          value: unit.id,
          label: `${unit.name} (${unit.symbol})`,
        })),
      })),
    [dimensions],
  );

  // The MOU dimension is derived from the content unit, so a dimension conflict
  // belongs to the same field as a unit conflict.
  const mouUnitError = errors.mou?.unitId?.message ?? errors.mou?.dimensionId?.message;

  const mouErrors =
    mouUnitError ?? errors.mou?.conversionRate?.message ?? errors.mou?.price?.message;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-3.5 md:flex-row md:flex-wrap md:items-start md:gap-x-6 md:gap-y-4"
    >
      {formError && (
        <div
          role="alert"
          className="rounded-lg border border-(--danger) bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 py-2.5 text-[12px] font-medium text-(--danger) md:flex-[1_1_100%]"
        >
          {formError}
        </div>
      )}

      <div className="relative md:flex md:flex-[0_0_16rem] md:flex-col md:self-start">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label={file ? 'Change photo' : 'Add photo'}
          className={`relative flex w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[13px] border-[1.5px] bg-(--field) text-(--text-muted) transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-(--accent) focus-visible:outline-offset-2 ${
            file
              ? 'aspect-4/3 cursor-default border-solid hover:border-(--border) md:aspect-square'
              : 'min-h-23 cursor-pointer border-dashed hover:border-(--accent) hover:text-(--accent) md:aspect-square'
          }`}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview of the selected product image"
              className="absolute inset-0 h-full w-full object-contain p-3.5"
            />
          ) : (
            <>
              <Image size={22} aria-hidden />
              <span className="text-[13px] font-semibold text-(--text)">Add photo</span>
              <span className="text-[11px] text-(--text-muted)">(optional)</span>
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          id="product-image"
          name="image"
          type="file"
          accept={UPLOAD_MIME_TYPES.join()}
          className="sr-only"
          onChange={(event) => {
            pickImage(event.target.files?.[0] ?? null);
            event.currentTarget.value = '';
          }}
        />
        {file && (
          <button
            type="button"
            onClick={() => pickImage(null)}
            className="absolute top-2 right-2 z-10 cursor-pointer rounded-full border border-(--border) bg-(--surface-primary) px-2.5 py-1 text-[11px] font-semibold text-(--text-muted) transition-colors hover:border-(--danger) hover:text-(--danger) focus-visible:outline-2 focus-visible:outline-(--accent) focus-visible:outline-offset-2 md:top-auto md:right-2.5 md:bottom-2.5"
          >
            Remove
          </button>
        )}
        {imageError && (
          <p className="text-[11px] font-semibold text-(--danger)" role="alert">
            {imageError}
          </p>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3.5 md:flex-[1_1_0]">
        <Field id="product-name" label="Name" error={errors.name?.message}>
          <Input
            id="product-name"
            placeholder="e.g. Honey 750 ml"
            autoComplete="off"
            maxLength={100}
            {...register('name')}
          />
        </Field>

        <Field id="product-brand" label="Brand" optional error={errors.brand?.message}>
          <Input
            id="product-brand"
            placeholder="e.g. Rosita"
            autoComplete="off"
            maxLength={50}
            {...register('brand')}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="product-base-unit" label="Base unit" error={errors.baseUnit?.unitId?.message}>
            <Controller
              name="baseUnit.unitId"
              control={control}
              render={({ field }) => (
                <Select
                  id="product-base-unit"
                  placeholder="Choose a unit"
                  value={field.value ?? ''}
                  error={Boolean(errors.baseUnit?.unitId?.message)}
                  groups={unitGroups}
                  onBlur={field.onBlur}
                  onChange={(event) => {
                    const unitId = event.currentTarget.value;
                    field.onChange(unitId);
                    setValue('baseUnit.dimensionId', dimensionByUnitId.get(unitId) ?? '');
                    // The MOU conflict rules depend on the base unit, so they have
                    // to be re-checked whenever it changes.
                    trigger('mou');
                  }}
                />
              )}
            />
          </Field>

          <Field id="product-base-price" label="Sell price" error={errors.baseUnit?.price?.message}>
            <Input
              id="product-base-price"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              {...register('baseUnit.price')}
            />
          </Field>
        </div>

        <div
          className={`flex flex-col rounded-[13px] border bg-(--surface-secondary) transition-colors ${
            mouOpen ? 'border-(--accent)' : 'border-(--border) hover:border-(--border-strong)'
          }`}
        >
          <button
            type="button"
            onClick={() => setMouOpen((prev) => !prev)}
            aria-expanded={mouOpen}
            aria-controls="product-mou-fields"
            className={`flex w-full cursor-pointer items-start justify-between gap-3 rounded-t-[13px] px-3.5 py-3 text-left transition-colors hover:bg-(--surface-primary) focus-visible:outline-2 focus-visible:outline-(--accent) focus-visible:outline-offset-2 ${
              !mouOpen && !mouErrors ? 'rounded-b-[13px]' : ''
            }`}
          >
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-(--text)">
                Content unit (MOU)
              </span>
              <span className="mt-0.5 block text-[11px] text-(--text-muted)">
                The measurable amount contained in one base unit, e.g. 1 pc = 350 ml.
              </span>
            </span>
            <ChevronDown
              size={18}
              aria-hidden
              className={`mt-0.5 shrink-0 text-(--text-muted) transition-transform duration-150 ${
                mouOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {!mouOpen && mouErrors && (
            <p
              role="alert"
              className="m-0 border-t border-(--border) px-3.5 pb-3 text-[11px] font-semibold text-(--danger)"
            >
              {mouErrors}
            </p>
          )}

          {mouOpen && (
            <div
              id="product-mou-fields"
              className="flex flex-col gap-3 rounded-b-[13px] border-t border-(--border) bg-(--surface-primary) px-3.5 py-3"
            >
              <Field
                id="product-mou-unit"
                label="Content unit"
                hint="Must differ from the base unit and its dimension"
                error={mouUnitError}
              >
                <Controller
                  name="mou.unitId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="product-mou-unit"
                      placeholder="Choose a unit"
                      value={field.value ?? ''}
                      error={Boolean(mouUnitError)}
                      groups={unitGroups}
                      onBlur={field.onBlur}
                      onChange={(event) => {
                        const unitId = event.currentTarget.value;
                        field.onChange(unitId);
                        setValue('mou.dimensionId', dimensionByUnitId.get(unitId) ?? '');
                        // A unit change decides every other MOU field, so the whole
                        // subtree is validated to refresh the conflict rules and to
                        // clear stale errors once the unit is unset.
                        trigger('mou');
                      }}
                    />
                  )}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  id="product-mou-rate"
                  label="Conversion rate"
                  hint={`1 ${baseUnitName} = ? ${contentUnitName}`}
                  error={errors.mou?.conversionRate?.message}
                >
                  <Input
                    id="product-mou-rate"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="e.g. 4"
                    {...register('mou.conversionRate')}
                  />
                </Field>

                <Field
                  id="product-mou-price"
                  label="Price"
                  hint="Optional"
                  error={errors.mou?.price?.message}
                >
                  <Input
                    id="product-mou-price"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    {...register('mou.price')}
                  />
                </Field>
              </div>
            </div>
          )}
        </div>

        <Field
          id="product-low-stock"
          label="Low stock at"
          optional
          hint="Get flagged when stock drops this low."
          error={errors.lowStockThreshold?.message}
        >
          <Input
            id="product-low-stock"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            {...register('lowStockThreshold')}
          />
        </Field>

        <div className="flex flex-col gap-2 pt-1">
          <span className="inline-flex items-center gap-2.5">
            <Controller
              name="trackAsPartial"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={Boolean(field.value)}
                  onChange={(next) => field.onChange(next)}
                  label="Track as partial"
                />
              )}
            />
            <span className="text-[13px] font-semibold text-(--text)">Track as partial</span>
          </span>
          <p className="m-0 text-[11px] text-(--text-muted)">
            Opened by the unit and sold in parts (shot, slice).
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 pt-1.5 md:flex-[1_1_100%]">
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Add product
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} className="w-full">
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function AddProductDialog({ open, businessId, onClose, onCreated }: AddProductDialogProps) {
  const handleCreated = useCallback(
    (product: CreateProductResponse) => onCreated(product),
    [onCreated],
  );

  return (
    <Dialog open={open} title="Add product" onClose={onClose} size="lg">
      {open && <ProductForm businessId={businessId} onCreated={handleCreated} onClose={onClose} />}
    </Dialog>
  );
}
