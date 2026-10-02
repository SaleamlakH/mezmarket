import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { UseFormRegister, FieldErrors, Control } from 'react-hook-form';
import { Button } from '@/components/Button';
import { CustomUnitCard } from '@/features/products/components/CustomUnitCard';
import type { CreateProductInput } from '@mez/types';
import type { CreateProductFormValues } from '@mez/validation';

export interface CustomUnitsStepProps {
  control: Control<CreateProductFormValues, unknown, CreateProductInput>;
  register: UseFormRegister<CreateProductFormValues>;
  fields: readonly { id: string }[];
  errors: FieldErrors<CreateProductFormValues>['customUnits'];
  baseUnitSymbol: string;
  contentUnitSymbol: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  triggerUnit: (index: number) => void;
}

/**
 * The second and last step: the units this product is traded in beyond its own.
 *
 * Optional in the plainest sense — leaving it empty creates the product exactly as
 * it would have been created before this step existed, which is why there is nothing
 * here about not filling it in.
 */
export function CustomUnitsStep({
  control,
  register,
  fields,
  errors,
  baseUnitSymbol,
  contentUnitSymbol,
  onAdd,
  onRemove,
  triggerUnit,
}: CustomUnitsStepProps) {
  // Which unit is open is held here and not in the card, so that opening one closes
  // the one before it instead of two cards ending up open at once.
  const [openFieldId, setOpenFieldId] = useState<string | null>(null);

  /*
   * A unit added from this step is opened for its owner, since it has just been asked
   * for and nothing about it is filled in yet.
   *
   * `append` hands back nothing to identify the new unit by, so the only thing that
   * says one has been added is that there are more of them than there were — which is
   * a change in an input, and is answered while rendering rather than in an effect
   * that would render a second time to catch up with it.
   */
  const [seenFieldCount, setSeenFieldCount] = useState(fields.length);

  if (fields.length !== seenFieldCount) {
    setSeenFieldCount(fields.length);
    // Only an addition is acted on. A removal is dealt with by `handleRemove`, which
    // knows which unit went.
    if (fields.length > seenFieldCount) setOpenFieldId(fields.at(-1)?.id ?? null);
  }

  const handleRemove = (index: number) => {
    const removedId = fields[index]?.id;
    onRemove(index);
    // Removing the open unit would otherwise leave its id held with nothing behind it.
    if (removedId === openFieldId) setOpenFieldId(null);
  };

  return (
    // The step's own width. The form lays itself out as a wrapping row, and without
    // this the step would be sized by its contents and sit to one side of the dialog
    // instead of across it.
    <div className="flex flex-col gap-3 md:flex-[1_1_100%]">
      {/*
        What this step is for, on one side, with the control that acts on it on the
        other. Said before anything is on screen rather than wherever the list happens
        to end, so the wording stays put as units are added.
      */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex flex-col gap-1">
          <h3 className="m-0 text-[15px] font-bold text-(--text)">Add custom units</h3>
          <p className="m-0 text-[12px] leading-relaxed text-(--text-muted)">
            A portion of this product, or a friendlier name for a unit.
          </p>
        </div>

        {/*
          The one thing to do with this step, so it is filled rather than outlined:
          an empty step has nothing on it but this. Kept beside the wording rather than
          under it, which leaves the width of the list below it to the units.
        */}
        <Button type="button" onClick={onAdd} className="w-full shrink-0 cursor-pointer md:w-auto">
          <Plus size={15} aria-hidden />
          Add a unit
        </Button>
      </div>

      {fields.map((field, index) => (
        <CustomUnitCard
          key={field.id}
          index={index}
          control={control}
          register={register}
          errors={errors}
          baseUnitSymbol={baseUnitSymbol}
          contentUnitSymbol={contentUnitSymbol}
          open={openFieldId === field.id}
          onOpenChange={(open) => setOpenFieldId(open ? field.id : null)}
          triggerUnit={triggerUnit}
          onRemove={handleRemove}
        />
      ))}
    </div>
  );
}
