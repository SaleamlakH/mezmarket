import { Button } from '@/components/Button';

interface SectionFooterProps {
  editing: boolean;
  isDirty: boolean;
  isSaving: boolean;
  error: string | null;
  onSave: () => unknown;
  onCancel: () => void;
}

/**
 * The Cancel/Save row of an editable section. Renders nothing unless its section is
 * in editing mode, so a read-only card carries no controls.
 */
export function SectionFooter({
  editing,
  isDirty,
  isSaving,
  error,
  onSave,
  onCancel,
}: SectionFooterProps) {
  if (!editing) return null;

  return (
    <div className="mt-4 flex flex-col gap-2">
      {error && (
        <p role="alert" className="m-0 text-[11px] font-semibold text-(--danger)">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" size="lg" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          type="button"
          size="lg"
          isLoading={isSaving}
          disabled={!isDirty && !isSaving}
          onClick={() => void onSave()}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
