import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { Toast } from '@/components/Toast';
import type { OwnerResponse } from '@mez/types';
import type { OwnerApi } from '../api/ownerApi';
import { useOwnerProfileForm } from '../hooks/useOwnerProfileForm';

export interface ProfileEditFormProps {
  ownerApi: OwnerApi;
  profile: OwnerResponse;
  onCancel: () => void;
  onSaved: (updated: OwnerResponse) => void;
}

export function ProfileEditForm({ ownerApi, profile, onCancel, onSaved }: ProfileEditFormProps) {
  const form = useOwnerProfileForm(ownerApi, profile, onSaved);

  return (
    <>
      {form.submitError && (
        <Toast
          message={form.submitError}
          variant="error"
          duration={5000}
          position="top-right"
          onDismiss={() => {}}
        />
      )}

      <form onSubmit={form.handleSubmit} className="flex flex-col">
        <div className="flex flex-col gap-5 p-5">
          <Field id="name" label="Name" error={form.errors.name}>
            <Input
              id="name"
              name="name"
              value={form.values.name ?? ''}
              onChange={(e) => form.handleChange('name', e.target.value)}
              onBlur={() => form.handleBlur('name')}
              placeholder="Your name"
            />
          </Field>

          <Field id="contactEmail" label="Contact Email" error={form.errors.contactEmail}>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              value={form.values.contactEmail ?? ''}
              onChange={(e) => form.handleChange('contactEmail', e.target.value)}
              onBlur={() => form.handleBlur('contactEmail')}
              placeholder="you@example.com"
            />
          </Field>

          <Field id="contactPhone" label="Contact Phone" error={form.errors.contactPhone}>
            <Input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              value={form.values.contactPhone ?? ''}
              onChange={(e) => form.handleChange('contactPhone', e.target.value)}
              onBlur={() => form.handleBlur('contactPhone')}
              placeholder="+1234567890"
            />
          </Field>
        </div>

        <div className="flex gap-3 border-t border-(--border) p-5">
          <Button variant="secondary" onClick={onCancel} type="button" className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            isLoading={form.isSubmitting}
            disabled={!form.hasChanges || form.isSubmitting || !!Object.values(form.errors).length}
          >
            Save
          </Button>
        </div>
      </form>
    </>
  );
}
