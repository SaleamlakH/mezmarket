import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { SectionHeader } from '@/components/SectionHeader';
import { Select } from '@/components/Select';
import { Switch } from '@/components/Switch';
import { Toast } from '@/components/Toast';
import type { BusinessResponse } from '@mez/types';
import { useBusinessEditForm } from '../hooks/useBusinessEditForm';

const TAX_MODE_OPTIONS = [
  { value: 'EXCLUSIVE', label: 'Tax never added' },
  { value: 'INCLUSIVE', label: 'Prices include tax' },
];

export interface BusinessEditFormProps {
  business: BusinessResponse;
  onCancel: () => void;
  onSaved: (updated: BusinessResponse) => void;
}

export function BusinessEditForm({ business, onCancel, onSaved }: BusinessEditFormProps) {
  const {
    values,
    errors,
    formError,
    setFormError,
    handleChange,
    handleBlur,
    handleSubmit,
    isDirty,
    isSaving,
  } = useBusinessEditForm(business, { onSaved });

  return (
    <>
      {formError && (
        <Toast
          message={formError}
          variant="error"
          duration={5000}
          position="top-right"
          onDismiss={() => setFormError(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="flex flex-col">
        <SectionHeader title="Business" />
        <div className="overflow-hidden rounded-2xl border border-(--border) bg-(--surface-primary) divide-y divide-(--border)">
          <div className="flex flex-col gap-5 p-5">
            <Field id="name" label="Name" error={errors?.name}>
              <Input
                id="name"
                name="name"
                value={values.name}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
              />
            </Field>
            <Field
              id="currencyCode"
              label="Currency"
              hint="3-letter ISO code, e.g. ETB or USD"
              error={errors?.currencyCode}
            >
              <Input
                id="currencyCode"
                name="currencyCode"
                placeholder="ETB"
                maxLength={3}
                autoComplete="off"
                value={values.currencyCode}
                onChange={(e) => handleChange('currencyCode', e.target.value)}
                onBlur={() => handleBlur('currencyCode')}
              />
            </Field>
          </div>
        </div>

        <SectionHeader title="Taxes & selling" />
        <div className="overflow-hidden rounded-2xl border border-(--border) bg-(--surface-primary) divide-y divide-(--border)">
          <div className="flex flex-col gap-5 p-5">
            <Field
              id="defaultTaxRate"
              label="Default tax rate"
              hint="Leave empty for no tax"
              error={errors?.defaultTaxRate}
            >
              <Input
                id="defaultTaxRate"
                name="defaultTaxRate"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.01"
                placeholder="0"
                value={values.defaultTaxRate}
                onChange={(e) => handleChange('defaultTaxRate', e.target.value)}
                onBlur={() => handleBlur('defaultTaxRate')}
              />
            </Field>

            <Field
              id="taxDisplayMode"
              label="Tax display"
              hint="Whether prices include tax"
              error={errors?.taxDisplayMode}
            >
              <Select
                id="taxDisplayMode"
                name="taxDisplayMode"
                options={TAX_MODE_OPTIONS}
                value={values.taxDisplayMode}
                onChange={(e) => handleChange('taxDisplayMode', e.target.value)}
                onBlur={() => handleBlur('taxDisplayMode')}
              />
            </Field>

            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-(--text)">
                  Allow sales beyond stock
                </p>
                <p className="mt-1 text-sm text-(--text-muted)">
                  Continue selling after stock hits zero.
                </p>
              </div>
              <Switch
                checked={values.allowNegativeStock}
                onChange={(checked) => handleChange('allowNegativeStock', checked)}
                label="Allow sales beyond stock"
              />
            </div>
          </div>
        </div>

        <SectionHeader title="Stock" />
        <div className="overflow-hidden rounded-2xl border border-(--border) bg-(--surface-primary) divide-y divide-(--border)">
          <div className="flex flex-col gap-5 p-5">
            <Field
              id="lowStockDefaultThreshold"
              label="Low-stock alert"
              hint="Alert me when stock drops below this"
              error={errors?.lowStockDefaultThreshold}
            >
              <Input
                id="lowStockDefaultThreshold"
                name="lowStockDefaultThreshold"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="0"
                value={values.lowStockDefaultThreshold}
                onChange={(e) => handleChange('lowStockDefaultThreshold', e.target.value)}
                onBlur={() => handleBlur('lowStockDefaultThreshold')}
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" isLoading={isSaving} disabled={!isDirty}>
            Save
          </Button>
        </div>
      </form>
    </>
  );
}
