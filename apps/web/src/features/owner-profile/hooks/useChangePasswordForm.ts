import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router';
import type { ChangePasswordFormValues } from '@mez/types';
import { changePasswordSchema } from '@mez/validation';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';

interface ChangePasswordForm extends UseFormReturn<ChangePasswordFormValues> {
  submit: () => Promise<void>;
}

export interface UseChangePasswordFormReturn {
  form: ChangePasswordForm;
  error: string | null;
  clearError: () => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

export function useChangePasswordForm(): UseChangePasswordFormReturn {
  const navigate = useNavigate();
  const { updatePassword, signOut } = useAuthContext();

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const submit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    form.clearErrors('root');

    try {
      await updatePassword(newPassword, currentPassword);

      try {
        await signOut('global');
      } catch {
        throw new Error('Password changed, but we could not sign you out. Sign out manually.');
      }

      navigate('/login', { replace: true });
    } catch (error) {
      form.setError('root', {
        type: 'server',
        message: errorMessage(error),
      });
    }
  });

  return {
    form: { ...form, submit },
    error: form.formState.errors.root?.message ?? null,
    clearError: () => form.clearErrors('root'),
  };
}
