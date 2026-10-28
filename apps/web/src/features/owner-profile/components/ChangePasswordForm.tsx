import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { PasswordInput } from '@/components/PasswordInput';
import type { UseChangePasswordFormReturn } from '../hooks/useChangePasswordForm';

export interface ChangePasswordFormProps {
  flow: UseChangePasswordFormReturn;
  onCancel?: () => void;
}

export function ChangePasswordForm({ flow, onCancel }: ChangePasswordFormProps) {
  const { form, error, clearError } = flow;
  const isSubmitting = form.formState.isSubmitting;

  return (
    <form onSubmit={form.submit} className="flex flex-col gap-3.5 pt-3 pb-1">
      {error && <Banner tone="danger" title={error} onDismiss={clearError} />}

      <Field
        id="current-password"
        label="Current password"
        error={form.formState.errors.currentPassword?.message}
      >
        <PasswordInput
          id="current-password"
          placeholder="Enter your current password"
          {...form.register('currentPassword')}
          autoComplete="current-password"
          disabled={isSubmitting}
        />
      </Field>

      <Field
        id="new-password"
        label="New password"
        error={form.formState.errors.newPassword?.message}
      >
        <PasswordInput
          id="new-password"
          placeholder="At least 8 characters"
          {...form.register('newPassword')}
          autoComplete="new-password"
          disabled={isSubmitting}
        />
      </Field>

      <Field
        id="confirm-new-password"
        label="Confirm new password"
        error={form.formState.errors.confirmPassword?.message}
      >
        <PasswordInput
          id="confirm-new-password"
          {...form.register('confirmPassword')}
          autoComplete="new-password"
          disabled={isSubmitting}
        />
      </Field>

      <p className="m-0 text-[11px] text-(--text-muted)">
        You&apos;ll be signed out on all devices after changing your password.
      </p>

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isSubmitting} className="flex-1">
          Update password
        </Button>
      </div>
    </form>
  );
}
