import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { LedgerLine } from '@/components/LedgerLine';
import { Switch } from '@/components/Switch';
import { Toast } from '@/components/Toast';
import { useCreateBusinessForm } from '../hooks/useCreateBusinessForm';

export function CreateBusinessPage() {
  const {
    status,
    values,
    errors,
    formError,
    setFormError,
    showOptional,
    setShowOptional,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useCreateBusinessForm();

  return (
    <>
      {formError && (
        <Toast
          message={formError}
          variant="error"
          onDismiss={() => setFormError(null)}
          duration={5000}
          position="top-right"
        />
      )}

      <div className="mt-6 mb-6">
        <h1 className="text-3xl font-bold text-(--text) leading-tighter">
          Create your <br /> business
        </h1>
        <LedgerLine />
        <p className="text-left text-md text-(--text-muted) mt-1">
          Get your shop ready to track stock and sales.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
        <Field id="name" label="Business name" error={errors?.name}>
          <Input
            id="name"
            name="name"
            placeholder="e.g. Selam Mart"
            value={values.name}
            onChange={(e) => handleChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            autoComplete="organization"
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
            value={values.currencyCode}
            onChange={(e) => handleChange('currencyCode', e.target.value)}
            onBlur={() => handleBlur('currencyCode')}
            maxLength={3}
            autoComplete="off"
          />
        </Field>

        <button
          type="button"
          onClick={() => setShowOptional((prev) => !prev)}
          className="group flex items-center gap-1 self-start cursor-pointer text-(--accent) font-semibold text-sm hover:text-(--accent-hover)"
          aria-expanded={showOptional}
        >
          {showOptional ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showOptional ? 'Hide optional settings' : 'Optional settings'}
        </button>

        {showOptional && (
          <div className="flex flex-col gap-4">
            <Field
              id="defaultTaxRate"
              label="Default tax rate (%)"
              hint="1 to 50. Required when tax is added to sales."
              error={errors?.defaultTaxRate}
            >
              <Input
                id="defaultTaxRate"
                name="defaultTaxRate"
                type="number"
                inputMode="decimal"
                min="1"
                max="50"
                step="0.01"
                placeholder="0"
                value={values.defaultTaxRate ?? ''}
                onChange={(e) => handleChange('defaultTaxRate', e.target.value)}
                onBlur={() => handleBlur('defaultTaxRate')}
              />
            </Field>

            <Field
              id="taxOnSales"
              label="Tax on sales"
              hint="Tax will be added to the sale at the default rate."
              error={errors?.taxOnSales}
            >
              <Switch
                checked={values.taxOnSales ?? false}
                onChange={(checked) => handleChange('taxOnSales', checked)}
                label="Tax on sales"
              />
            </Field>

            <Field
              id="lowStockDefaultThreshold"
              label="Low stock threshold"
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
                value={values.lowStockDefaultThreshold ?? ''}
                onChange={(e) => handleChange('lowStockDefaultThreshold', e.target.value)}
                onBlur={() => handleBlur('lowStockDefaultThreshold')}
              />
            </Field>
          </div>
        )}

        <div className="flex-1"></div>

        <Button
          type="submit"
          isLoading={status === 'submitting'}
          className="w-full h-11 rounded-2xl font-bold"
        >
          Create business
        </Button>
      </form>
    </>
  );
}
