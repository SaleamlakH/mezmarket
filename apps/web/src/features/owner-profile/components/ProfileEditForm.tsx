import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { SectionCard } from '@/components/SectionCard';
import { SectionFooter } from '@/components/SectionFooter';
import type { OwnerResponse } from '@mez/types';
import type { OwnerApi } from '../api/ownerApi';
import { useOwnerProfileForm } from '../hooks/useOwnerProfileForm';

export interface ProfileEditFormProps {
  ownerApi: OwnerApi;
  profile: OwnerResponse;
  /** Defaults to true so the form can be rendered on its own. */
  editing?: boolean;
  onEdit?: () => void;
  onCancel: () => void;
  onSaved: (updated: OwnerResponse) => void;
}

/**
 * The owner's contact details. The card owns the form, so the page only decides
 * when it is being edited.
 */
export function ProfileEditForm({
  ownerApi,
  profile,
  editing = true,
  onEdit,
  onCancel,
  onSaved,
}: ProfileEditFormProps) {
  const form = useOwnerProfileForm(ownerApi, profile, onSaved);

  const handleCancel = () => {
    form.reset();
    onCancel();
  };

  return (
    <SectionCard
      title="Profile"
      subtitle="Your name and the details we use to reach you."
      editing={editing}
      onEdit={onEdit ?? (() => {})}
      showEdit={Boolean(onEdit)}
    >
      <form onSubmit={form.handleSubmit} className="flex flex-col">
        <div className="flex flex-col gap-3.5">
          <Field id="name" label="Name" error={form.errors.name}>
            <Input
              id="name"
              name="name"
              value={form.values.name ?? ''}
              onChange={(e) => form.handleChange('name', e.target.value)}
              onBlur={() => form.handleBlur('name')}
              placeholder="Your name"
              disabled={!editing}
            />
          </Field>

          <Field id="contactEmail" label="Contact email" error={form.errors.contactEmail}>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              value={form.values.contactEmail ?? ''}
              onChange={(e) => form.handleChange('contactEmail', e.target.value)}
              onBlur={() => form.handleBlur('contactEmail')}
              placeholder="you@example.com"
              disabled={!editing}
            />
          </Field>

          <Field id="contactPhone" label="Contact phone" error={form.errors.contactPhone}>
            <Input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              value={form.values.contactPhone ?? ''}
              onChange={(e) => form.handleChange('contactPhone', e.target.value)}
              onBlur={() => form.handleBlur('contactPhone')}
              placeholder="+1234567890"
              disabled={!editing}
            />
          </Field>
        </div>

        <SectionFooter
          editing={editing}
          isDirty={form.hasChanges}
          isSaving={form.isSubmitting}
          error={form.submitError}
          onCancel={handleCancel}
          submit
        />
      </form>
    </SectionCard>
  );
}
