import { Controller } from 'react-hook-form';
import type { ProductWithUnitsResponse } from '@mez/types';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { Switch } from '@/components/Switch';
import { useProductFieldsForm } from '../hooks/useProductFieldsForm';
import { SectionCard } from './SectionCard';
import { SectionFooter } from './SectionFooter';

interface ProductFieldsCardProps {
  businessId: string;
  product: ProductWithUnitsResponse;
  onSaved: (message: string) => void;
}

/**
 * The product's own details. The card owns the form; the page only lays it out.
 */
export function ProductFieldsCard({ businessId, product, onSaved }: ProductFieldsCardProps) {
  const { form, editing, startEditing, cancel, submit, isDirty, isSaving, error } =
    useProductFieldsForm({ businessId, product, onSaved });
  const { errors } = form.formState;

  return (
    <SectionCard
      title="Product"
      subtitle="The name and the details shown wherever this product appears."
      editing={editing}
      onEdit={startEditing}
    >
      <div className="flex flex-col gap-3.5">
        <Field id="edit-product-name" label="Name" error={errors.name?.message}>
          <Input
            id="edit-product-name"
            placeholder="e.g. Honey 750 ml"
            autoComplete="off"
            maxLength={100}
            disabled={!editing}
            {...form.register('name')}
          />
        </Field>

        <Field id="edit-product-brand" label="Brand" optional error={errors.brand?.message}>
          <Input
            id="edit-product-brand"
            placeholder="e.g. Rosita"
            autoComplete="off"
            maxLength={50}
            disabled={!editing}
            {...form.register('brand')}
          />
        </Field>

        <Field
          id="edit-product-description"
          label="Description"
          optional
          error={errors.description?.message}
        >
          <textarea
            id="edit-product-description"
            placeholder="Notes about this product"
            maxLength={500}
            disabled={!editing}
            className="min-h-24 w-full resize-y rounded-[13px] border border-(--border) bg-(--field) px-3.5 py-2 text-sm text-(--text) outline-none transition-colors duration-150 placeholder:text-(--text-muted) focus:border-(--accent) disabled:opacity-60"
            {...form.register('description')}
          />
        </Field>

        <Field
          id="edit-product-low-stock"
          label="Low stock at"
          optional
          hint="Get flagged when stock drops this low."
          error={errors.lowStockThreshold?.message}
        >
          <Input
            id="edit-product-low-stock"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            disabled={!editing}
            {...form.register('lowStockThreshold')}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2.5">
            <Controller
              name="trackAsPartial"
              control={form.control}
              render={({ field }) => (
                <Switch
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  label="Track as partial"
                  disabled={!editing}
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

      <SectionFooter
        editing={editing}
        isDirty={isDirty}
        isSaving={isSaving}
        error={error}
        onSave={submit}
        onCancel={cancel}
      />
    </SectionCard>
  );
}
