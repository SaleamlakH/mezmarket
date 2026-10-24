import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { SectionCard } from '@/components/SectionCard';
import { SectionFooter } from '@/components/SectionFooter';
import { Select } from '@/components/Select';
import { Switch } from '@/components/Switch';
import type { BusinessResponse } from '@mez/types';
import { useBusinessEditForm } from '../hooks/useBusinessEditForm';

const TAX_MODE_OPTIONS = [
  { value: 'EXCLUSIVE', label: 'Tax never added' },
  { value: 'INCLUSIVE', label: 'Prices include tax' },
];

export interface BusinessEditFormProps {
  business: BusinessResponse;
  /** Defaults to true so the form can be rendered on its own. */
  editing?: boolean;
  onEdit?: () => void;
  onCancel: () => void;
  onSaved: (updated: BusinessResponse) => void;
}

/**
 * The business's identity, tax and stock defaults. The card owns the form, so
 * the page only decides when it is being edited.
 */
export function BusinessEditForm({
  business,
  editing = true,
  onEdit,
  onCancel,
  onSaved,
}: BusinessEditFormProps) {
  const {
    values,
    errors,
    formError,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    isDirty,
    isSaving,
  } = useBusinessEditForm(business, { onSaved });

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <SectionCard
      title="Business profile"
      subtitle="Your shop's identity, tax and stock defaults."
      editing={editing}
      onEdit={onEdit ?? (() => {})}
      showEdit={Boolean(onEdit)}
    >
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3.5">
            <Field id="name" label="Name" error={errors?.name}>
              <Input
                id="name"
                name="name"
                value={values.name}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                disabled={!editing}
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
                disabled={!editing}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-3.5 border-t border-(--border) pt-4">
            <h3 className="m-0 text-[13px] font-bold text-(--text)">Taxes & selling</h3>

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
                disabled={!editing}
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
                disabled={!editing}
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
                disabled={!editing}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3.5 border-t border-(--border) pt-4">
            <h3 className="m-0 text-[13px] font-bold text-(--text)">Stock</h3>

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
                disabled={!editing}
              />
            </Field>
          </div>
        </div>

        <SectionFooter
          editing={editing}
          isDirty={isDirty}
          isSaving={isSaving}
          error={formError}
          onCancel={handleCancel}
          submit
        />
      </form>
    </SectionCard>
  );
}
