import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import { Disclosure } from '@/components/Disclosure';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Switch } from '@/components/Switch';
import type { CreateProductFormValues, CreateProductInput } from '@mez/types';

export interface CustomUnitCardProps {
  control: Control<CreateProductFormValues, unknown, CreateProductInput>;
  register: UseFormRegister<CreateProductFormValues>;
  index: number;
  errors: FieldErrors<CreateProductFormValues>['customUnits'];
  baseUnitSymbol: string;
  contentUnitSymbol: string;
  /** Open state is the step's, so only one unit is ever open at a time. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerUnit: (index: number) => void;
  onRemove: (index: number) => void;
}

/**
 * One of the owner's own units.
 *
 * A card rather than a row of fields, because most products have no custom units at
 * all and one with four of them would otherwise be a wall. Shut by default once it
 * has been filled, and its heading then carries the unit rather than a number, so a
 * shut card still says which unit it is and what it is worth.
 */
export function CustomUnitCard({
  control,
  register,
  index,
  errors,
  baseUnitSymbol,
  contentUnitSymbol,
  open,
  onOpenChange,
  triggerUnit,
  onRemove,
}: CustomUnitCardProps) {
  const name = `customUnits.${index}` as const;
  const unitErrors = Array.isArray(errors) ? errors[index] : undefined;

  // The heading and the summary are made of the unit's own values, so they are read
  // from the form rather than kept alongside it. Watching the whole unit in one go
  // keeps this to a single subscription per card, so typing in one unit's name does
  // not re-render the others.
  const [unitName, dependsOn, rate, price, purchaseCapable, sellCapable] =
    useWatch({
      control,
      name: [
        `${name}.name`,
        `${name}.dependsOn`,
        `${name}.conversionRate`,
        `${name}.price`,
        `${name}.purchaseCapable`,
        `${name}.sellCapable`,
      ],
      exact: false,
    }) ?? [];

  const typed = unitName?.trim() ?? '';
  // Numbering survives only as the fallback, so a unit with no name yet is still
  // tellable apart from the others.
  const label = typed || `Unit ${index + 1}`;

  /*
   * The rate says what one of this unit is worth in its basis — a `slice` at `0.125`
   * is an eighth of a piece, a `shot` at `25` is twenty-five millilitres — so both the
   * hint and the summary read it in that direction. It is the opposite of the content
   * unit's rate, which answers the other question: how much content one base unit
   * holds. A hint worded the other way round would have the owner type the reciprocal
   * of the factor they meant.
   */
  const basis = dependsOn === 'MOU' ? contentUnitSymbol : baseUnitSymbol;
  const basisLabel = basis || (dependsOn === 'MOU' ? 'content unit' : 'base unit');
  const unitLabel = typed || 'unit';
  const rateLine = rate?.trim() ? `1 ${unitLabel} = ${rate.trim()} ${basisLabel}` : undefined;

  // Said in the words the switches use. With neither switch on there is nothing to
  // say — the card carries the refusal instead, and claiming a use would contradict it.
  const usage =
    purchaseCapable && sellCapable
      ? 'Buy & sell'
      : purchaseCapable
        ? 'Buy only'
        : sellCapable
          ? 'Sell only'
          : undefined;

  // One line for the card while it is shut, since it cannot show its own fields.
  const collapsedError = [
    unitErrors?.name?.message,
    unitErrors?.dependsOn?.message,
    unitErrors?.conversionRate?.message,
    unitErrors?.price?.message,
    unitErrors?.sellCapable?.message,
  ].find(Boolean);

  return (
    <Disclosure
      open={open}
      onOpenChange={onOpenChange}
      title={label}
      description={
        <Summary rate={rateLine} price={price} sellCapable={sellCapable} usage={usage} />
      }
      error={collapsedError}
      action={
        <button
          type="button"
          onClick={() => onRemove(index)}
          aria-label={`Remove ${label}`}
          className="cursor-pointer rounded-full p-1 text-(--text-muted) transition-colors hover:text-(--danger) focus-visible:outline-2 focus-visible:outline-(--accent) focus-visible:outline-offset-2"
        >
          <Trash2 size={15} aria-hidden />
        </button>
      }
    >
      <Field id={`${name}.name`} label="Name" error={unitErrors?.name?.message}>
        <Input
          id={`${name}.name`}
          placeholder="e.g. Shot"
          autoComplete="off"
          maxLength={50}
          {...register(`${name}.name`)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field id={`${name}.dependsOn`} label="Based on" error={unitErrors?.dependsOn?.message}>
          <Controller
            name={`${name}.dependsOn`}
            control={control}
            render={({ field }) => (
              <Select
                id={`${name}.dependsOn`}
                value={field.value}
                error={Boolean(unitErrors?.dependsOn?.message)}
                options={[
                  { value: 'BASE', label: baseUnitSymbol || 'Base unit' },
                  { value: 'MOU', label: contentUnitSymbol || 'Content unit' },
                ]}
                onBlur={field.onBlur}
                onChange={(event) => {
                  field.onChange(event.currentTarget.value);
                  // What a unit needs follows what it is based on — whether it needs a
                  // content unit to exist, whether its rate means anything — so the
                  // whole unit is re-checked rather than only this field.
                  triggerUnit(index);
                }}
              />
            )}
          />
        </Field>

        <Field
          id={`${name}.conversionRate`}
          label="Conversion rate"
          hint={`1 ${unitLabel} = ? ${basisLabel}`}
          error={unitErrors?.conversionRate?.message}
        >
          <Input
            id={`${name}.conversionRate`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="e.g. 25"
            {...register(`${name}.conversionRate`)}
          />
        </Field>
      </div>

      <Controller
        name={`${name}.sellCapable`}
        control={control}
        render={({ field: sellField }) => (
          <Field
            id={`${name}.price`}
            label="Price"
            // A price is what a unit is sold for, so whether it has to be there
            // follows that switch rather than standing on its own.
            optional={!sellField.value}
            hint={sellField.value ? undefined : 'Needed only to sell this'}
            error={unitErrors?.price?.message}
          >
            <Input
              id={`${name}.price`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              {...register(`${name}.price`)}
            />
          </Field>
        )}
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Controller
          name={`${name}.purchaseCapable`}
          control={control}
          render={({ field: purchaseField }) => (
            <span className="inline-flex items-center gap-2.5">
              <Switch
                checked={Boolean(purchaseField.value)}
                onChange={purchaseField.onChange}
                label={`${label} can be purchased in`}
              />
              <span className="text-[13px] font-semibold text-(--text)">Can be purchased in</span>
            </span>
          )}
        />

        <Controller
          name={`${name}.sellCapable`}
          control={control}
          render={({ field: sellField }) => (
            <span className="inline-flex items-center gap-2.5">
              <Switch
                checked={Boolean(sellField.value)}
                onChange={sellField.onChange}
                label={`${label} can be sold in`}
              />
              <span className="text-[13px] font-semibold text-(--text)">Can be sold in</span>
            </span>
          )}
        />

        {unitErrors?.sellCapable?.message && (
          <p role="alert" className="m-0 basis-full text-[11px] font-semibold text-(--danger)">
            {unitErrors.sellCapable.message}
          </p>
        )}
      </div>
    </Disclosure>
  );
}

/**
 * What the unit is worth, for a card that is shut and so cannot show its own fields.
 * Parts that have not been filled in are left out rather than shown as blanks, so a
 * unit nobody has touched yet carries no line at all.
 */
function Summary({
  rate,
  price,
  sellCapable,
  usage,
}: {
  rate: string | undefined;
  price: string | undefined;
  sellCapable: boolean | undefined;
  usage: string | undefined;
}) {
  const parts = [rate, sellCapable && price?.trim() ? price.trim() : undefined, usage].filter(
    (part): part is string => Boolean(part),
  );

  if (parts.length === 0) return null;

  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-(--text-muted)">
      {parts.map((part, index) => (
        <span key={`${index}-${part}`} className="inline-flex items-center gap-1.5">
          {index > 0 && <span aria-hidden>&middot;</span>}
          <span className={part === usage ? 'text-(--text)' : undefined}>{part}</span>
        </span>
      ))}
    </span>
  );
}
