import { useCallback, useRef, useState } from 'react';
import { ChevronDown, Image } from 'lucide-react';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Switch } from '@/components/Switch';
import type { CreateProductFormValues } from '@mez/validation/dist/schema/product.schema';
import { UPLOAD_MIME_TYPES } from '@mez/validation';
import type { CreateProductResponse } from '@mez/types';

export interface AddProductDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (product: CreateProductResponse) => void;
}

interface ProductFormProps {
  onClose: () => void;
  onCreated: (product: CreateProductResponse) => void;
}

const MOCK_UNIT_GROUPS = [
  {
    label: 'Mass',
    options: [
      { value: 'kg-1', label: 'Kilogram (kg)' },
      { value: 'g-1', label: 'Gram (g)' },
    ],
  },
  {
    label: 'Volume',
    options: [
      { value: 'l-1', label: 'Liter (L)' },
      { value: 'ml-1', label: 'Milliliter (ml)' },
    ],
  },
  { label: 'Count', options: [{ value: 'pc-1', label: 'Piece (pc)' }] },
];

function ProductForm({ onCreated, onClose }: ProductFormProps) {
  void onCreated;
  const [mouOpen, setMouOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const [form, setForm] = useState<CreateProductFormValues>({
    name: '',
    baseUnit: { dimensionId: '', price: '', unitId: '' },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onClose();
      }}
      noValidate
      className="flex flex-col gap-3.5 md:flex-row md:flex-wrap md:items-start md:gap-x-6 md:gap-y-4"
    >
      {
        <div
          role="alert"
          className="rounded-lg border border-(--danger) bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 py-2.5 text-[12px] font-medium text-(--danger) md:flex-[1_1_100%]"
        >
          form level errors will be shown here
        </div>
      }

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
          {file ? (
            <img
              src={URL.createObjectURL(file)}
              alt=""
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
            setFile(event.target.files?.[0] ?? null);
            event.currentTarget.value = '';
          }}
        />
        {file && (
          <button
            type="button"
            onClick={() => setFile(null)}
            className="absolute top-2 right-2 z-10 cursor-pointer rounded-full border border-(--border) bg-(--surface-primary) px-2.5 py-1 text-[11px] font-semibold text-(--text-muted) transition-colors hover:border-(--danger) hover:text-(--danger) focus-visible:outline-2 focus-visible:outline-(--accent) focus-visible:outline-offset-2 md:top-auto md:right-2.5 md:bottom-2.5"
          >
            Remove
          </button>
        )}
        {
          <p className="text-[11px] font-semibold text-(--danger)" role="alert">
            image error will be shown here
          </p>
        }
      </div>

      <div className="flex min-w-0 flex-col gap-3.5 md:flex-[1_1_0]">
        <Field id="product-name" label="Name">
          <Input
            id="product-name"
            placeholder="e.g. Honey 750 ml"
            autoComplete="off"
            maxLength={100}
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.currentTarget.value }))}
          />
        </Field>

        <Field id="product-brand" label="Brand" optional>
          <Input
            id="product-brand"
            placeholder="e.g. Rosita"
            autoComplete="off"
            maxLength={50}
            value={form.brand ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, brand: event.currentTarget.value }))}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="product-base-unit" label="Base unit">
            <Select
              id="product-base-unit"
              placeholder="Choose a unit"
              value={form.baseUnit.unitId}
              groups={MOCK_UNIT_GROUPS}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  baseUnit: { ...prev.baseUnit, unitId: event.currentTarget.value },
                }))
              }
            />
          </Field>

          <Field id="product-base-price" label="Sell price">
            <Input
              id="product-base-price"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={form.baseUnit.price}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  baseUnit: { ...prev.baseUnit, price: event.currentTarget.value },
                }))
              }
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
              !mouOpen ? 'rounded-b-[13px]' : ''
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

          {!mouOpen && (
            <p
              role="alert"
              className="m-0 border-t border-(--border) px-3.5 pb-3 text-[11px] font-semibold text-(--danger)"
            >
              content unit fields error will display here when closed
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
              >
                <Select
                  id="product-mou-unit"
                  placeholder="Choose a unit"
                  value={form.mou?.unitId}
                  groups={MOCK_UNIT_GROUPS}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      mou: prev.mou
                        ? { ...prev.mou, unitId: event.currentTarget.value }
                        : { dimensionId: '', conversionRate: '', unitId: '' },
                    }))
                  }
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  id="product-mou-rate"
                  label="Conversion rate"
                  hint={`"1 unit = ? content unit"`}
                >
                  <Input
                    id="product-mou-rate"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="e.g. 4"
                    value={form.mou?.conversionRate}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        mou: prev.mou
                          ? { ...prev.mou, conversionRate: event.currentTarget.value }
                          : { dimensionId: '', conversionRate: '', unitId: '' },
                      }))
                    }
                  />
                </Field>

                <Field id="product-mou-price" label="Price" hint="Optional">
                  <Input
                    id="product-mou-price"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    value={form.mou?.price}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        mou: prev.mou
                          ? { ...prev.mou, price: event.currentTarget.value }
                          : { dimensionId: '', conversionRate: '', unitId: '' },
                      }))
                    }
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
        >
          <Input
            id="product-low-stock"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={form.lowStockThreshold}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, lowStockThreshold: event.currentTarget.value }))
            }
          />
        </Field>

        <div className="flex flex-col gap-2 pt-1">
          <span className="inline-flex items-center gap-2.5">
            <Switch
              checked={Boolean(form.trackAsPartial)}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, trackAsPartial: event.valueOf() }))
              }
              label="Track as partial"
            />
            <span className="text-[13px] font-semibold text-(--text)">Track as partial</span>
          </span>
          <p className="m-0 text-[11px] text-(--text-muted)">
            Opened by the unit and sold in parts (shot, slice).
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 pt-1.5 md:flex-[1_1_100%]">
        <Button type="submit" className="w-full">
          Add product
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} className="w-full">
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function AddProductDialog({ open, onCreated, onClose }: AddProductDialogProps) {
  const handleCreated = useCallback(
    (product: CreateProductResponse) => onCreated(product),
    [onCreated],
  );

  return (
    <Dialog open={open} onClose={onClose} title="Add product" size="lg">
      {open && <ProductForm onCreated={handleCreated} onClose={onClose} />}
    </Dialog>
  );
}
