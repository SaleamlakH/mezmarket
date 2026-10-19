import { Controller } from 'react-hook-form';
import type {
  CreateProductUnitInput,
  DimensionResponse,
  ProductUnitResponse,
  UnitDependsOn,
} from '@mez/types';
import { Button } from '@/components/Button';
import { Dialog, DialogHeader } from '@/components/Dialog';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Switch } from '@/components/Switch';
import { useAddContentUnitForm, useAddCustomUnitForm } from '../hooks/useAddUnitDialog';

/** Which kind of unit the sheet is adding: the owner's own, or the content unit. */
export type AddUnitMode = 'CUSTOM' | 'MOU';

export interface AddUnitDialogProps {
  open: boolean;
  mode: AddUnitMode;
  baseUnit: ProductUnitResponse | null;
  contentUnit: ProductUnitResponse | null;
  dimensions: DimensionResponse[];
  onClose: () => void;
  onSubmit: (input: CreateProductUnitInput) => Promise<unknown>;
}

/**
 * Adds a unit to a product that already exists: one of the owner's own custom units,
 * or the product's single content unit. A unit cannot be deleted once it is written,
 * so a filled-in unit is confirmed before it is created.
 */
export function AddUnitDialog({
  open,
  mode,
  baseUnit,
  contentUnit,
  dimensions,
  onClose,
  onSubmit,
}: AddUnitDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      {open &&
        (mode === 'MOU' ? (
          <AddContentUnitForm
            baseUnit={baseUnit}
            dimensions={dimensions}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        ) : (
          <AddCustomUnitForm
            baseUnit={baseUnit}
            contentUnit={contentUnit}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        ))}
    </Dialog>
  );
}

/** One labelled fact on the confirmation, so the unit and its relation read at a glance. */
function ConfirmRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="m-0 shrink-0 text-[11px] font-semibold tracking-[0.08em] uppercase text-(--text-muted)">
        {label}
      </dt>
      <dd className="m-0 text-right text-[13px] font-semibold text-(--text)">{value}</dd>
    </div>
  );
}

interface AddCustomUnitFormProps {
  baseUnit: ProductUnitResponse | null;
  contentUnit: ProductUnitResponse | null;
  onClose: () => void;
  onSubmit: (input: CreateProductUnitInput) => Promise<unknown>;
}

function AddCustomUnitForm({ baseUnit, contentUnit, onClose, onSubmit }: AddCustomUnitFormProps) {
  const {
    form: { register, control },
    errors,
    pending,
    isCreating,
    baseSymbol,
    contentSymbol,
    sellCapable,
    basisLabel,
    unitLabel,
    continueToConfirm,
    back,
    confirm,
  } = useAddCustomUnitForm({ baseUnit, contentUnit, onClose, onSubmit });

  if (pending && pending.unitRole === 'CUSTOM') {
    const basis = pending.dependsOn === 'MOU' ? contentSymbol : baseSymbol;
    return (
      <>
        <DialogHeader title="Add custom unit" onClose={onClose} />
        <div className="flex flex-col gap-3 pb-1">
          <p className="m-0 text-[13px] text-(--text)">Create this unit?</p>
          <dl className="m-0 flex flex-col gap-2.5 rounded-xl border border-(--border) bg-(--surface-secondary) p-3.5">
            <ConfirmRow label="Unit" value={pending.name} />
            <ConfirmRow label="Based on" value={basis} />
            <ConfirmRow
              label="Conversion"
              value={`1 ${pending.name} = ${pending.conversionRate} ${basis}`}
            />
            {pending.price != null && <ConfirmRow label="Sell price" value={pending.price} />}
          </dl>
          <p className="m-0 text-[11px] text-(--text-muted)">
            A unit cannot be deleted once it is created.
          </p>
          {errors.root?.message && (
            <p role="alert" className="m-0 text-[11px] font-semibold text-(--danger)">
              {errors.root.message}
            </p>
          )}
          <div className="mt-1 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={back}
              disabled={isCreating}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => void confirm()}
              isLoading={isCreating}
              className="flex-1"
            >
              Create unit
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DialogHeader title="Add custom unit" onClose={onClose} />
      <form onSubmit={continueToConfirm} noValidate className="flex flex-col gap-3 pb-1">
        {errors.root?.message && (
          <p role="alert" className="m-0 text-[11px] font-semibold text-(--danger)">
            {errors.root.message}
          </p>
        )}

        <Field id="add-unit-name" label="Name" error={errors.name?.message}>
          <Input
            id="add-unit-name"
            placeholder="e.g. Shot"
            autoComplete="off"
            maxLength={50}
            {...register('name')}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="add-unit-depends-on" label="Based on" error={errors.dependsOn?.message}>
            <Controller
              name="dependsOn"
              control={control}
              render={({ field }) => (
                <Select
                  id="add-unit-depends-on"
                  value={field.value}
                  error={Boolean(errors.dependsOn)}
                  options={[
                    { value: 'BASE', label: baseSymbol },
                    ...(contentUnit ? [{ value: 'MOU', label: contentSymbol }] : []),
                  ]}
                  onBlur={field.onBlur}
                  onChange={(event) => field.onChange(event.currentTarget.value as UnitDependsOn)}
                />
              )}
            />
          </Field>

          <Field
            id="add-unit-conversion-rate"
            label="Conversion rate"
            hint={`1 ${unitLabel} = ? ${basisLabel}`}
            error={errors.conversionRate?.message}
          >
            <Input
              id="add-unit-conversion-rate"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 25"
              {...register('conversionRate')}
            />
          </Field>
        </div>

        <Field
          id="add-unit-price"
          label="Sell price"
          optional={!sellCapable}
          hint={sellCapable ? undefined : 'Needed only to sell this'}
          error={errors.price?.message}
        >
          <Input
            id="add-unit-price"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            disabled={!sellCapable}
            {...register('price')}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="inline-flex items-center gap-2.5">
            <Controller
              name="purchaseCapable"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onChange={field.onChange}
                  label="This unit can be purchased in"
                />
              )}
            />
            <span className="text-[13px] font-semibold text-(--text)">Can be purchased in</span>
          </span>

          <span className="inline-flex items-center gap-2.5">
            <Controller
              name="sellCapable"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onChange={field.onChange}
                  label="This unit can be sold in"
                />
              )}
            />
            <span className="text-[13px] font-semibold text-(--text)">Can be sold in</span>
          </span>
        </div>

        {errors.sellCapable && (
          <p role="alert" className="m-0 text-[11px] font-semibold text-(--danger)">
            {errors.sellCapable.message}
          </p>
        )}

        <p className="m-0 text-[11px] text-(--text-muted)">
          Units cannot be deleted once created, so you&rsquo;ll confirm first.
        </p>

        <div className="mt-1 flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            Continue
          </Button>
        </div>
      </form>
    </>
  );
}

interface AddContentUnitFormProps {
  baseUnit: ProductUnitResponse | null;
  dimensions: DimensionResponse[];
  onClose: () => void;
  onSubmit: (input: CreateProductUnitInput) => Promise<unknown>;
}

function AddContentUnitForm({ baseUnit, dimensions, onClose, onSubmit }: AddContentUnitFormProps) {
  const {
    form: { register, control },
    errors,
    pending,
    isCreating,
    baseSymbol,
    groups,
    chosenSymbol,
    unitSymbol,
    continueToConfirm,
    back,
    confirm,
  } = useAddContentUnitForm({ baseUnit, dimensions, onClose, onSubmit });

  if (pending && pending.unitRole === 'MOU') {
    const pendingSymbol = unitSymbol(pending.unitId);
    return (
      <>
        <DialogHeader title="Add content unit" onClose={onClose} />
        <div className="flex flex-col gap-3 pb-1">
          <p className="m-0 text-[13px] text-(--text)">Add this unit as the content unit?</p>
          <dl className="m-0 flex flex-col gap-2.5 rounded-xl border border-(--border) bg-(--surface-secondary) p-3.5">
            <ConfirmRow label="Unit" value={pendingSymbol} />
            <ConfirmRow label="Role" value="Content unit" />
            <ConfirmRow
              label="Conversion"
              value={`1 ${baseSymbol} = ${pending.conversionRate} ${pendingSymbol}`}
            />
            {pending.price != null && <ConfirmRow label="Sell price" value={pending.price} />}
          </dl>
          <p className="m-0 text-[11px] text-(--text-muted)">
            A unit cannot be deleted once it is created.
          </p>
          {errors.root?.message && (
            <p role="alert" className="m-0 text-[11px] font-semibold text-(--danger)">
              {errors.root.message}
            </p>
          )}
          <div className="mt-1 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={back}
              disabled={isCreating}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => void confirm()}
              isLoading={isCreating}
              className="flex-1"
            >
              Add content unit
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DialogHeader title="Add content unit" onClose={onClose} />
      <form onSubmit={continueToConfirm} noValidate className="flex flex-col gap-3 pb-1">
        {errors.root?.message && (
          <p role="alert" className="m-0 text-[11px] font-semibold text-(--danger)">
            {errors.root.message}
          </p>
        )}

        <Field id="add-content-unit-unit" label="Unit" error={errors.unitId?.message}>
          <Controller
            name="unitId"
            control={control}
            render={({ field }) => (
              <Select
                id="add-content-unit-unit"
                value={field.value}
                error={Boolean(errors.unitId)}
                placeholder="Select a unit"
                groups={groups}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(event.currentTarget.value)}
              />
            )}
          />
        </Field>

        <Field
          id="add-content-unit-conversion-rate"
          label="Conversion rate"
          hint={`1 ${baseSymbol} = ? ${chosenSymbol}`}
          error={errors.conversionRate?.message}
        >
          <div className="flex items-center gap-2">
            <span className="flex h-10 shrink-0 items-center rounded-[13px] border border-(--border) bg-(--surface-secondary) px-3 text-[13px] font-semibold text-(--text)">
              {baseSymbol}
            </span>
            <Input
              id="add-content-unit-conversion-rate"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 750"
              {...register('conversionRate')}
            />
          </div>
        </Field>

        <Field
          id="add-content-unit-price"
          label="Sell price"
          optional
          hint="Needed only to sell this unit on its own."
          error={errors.price?.message}
        >
          <Input
            id="add-content-unit-price"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            {...register('price')}
          />
        </Field>

        <div className="mt-1 flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            Continue
          </Button>
        </div>
      </form>
    </>
  );
}
