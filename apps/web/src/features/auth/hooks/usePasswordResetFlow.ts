import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import type { ForgotPasswordFormValues, NewPasswordFormValues } from '@mez/types';
import { forgotPasswordSchema, newPasswordSchema } from '@mez/validation';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { pendingPasswordReset } from '../lib/pendingOtp';
import { useOtpVerification } from './useOtpVerification';

export type PasswordResetStep = 'email' | 'code' | 'password';

interface PasswordResetEmailForm extends UseFormReturn<ForgotPasswordFormValues> {
  submit: () => Promise<void>;
}

interface PasswordResetPasswordForm extends UseFormReturn<NewPasswordFormValues> {
  submit: () => Promise<void>;
}

export interface UsePasswordResetFlowReturn {
  step: PasswordResetStep;
  email: string | null;
  showResetSent: boolean;
  dismissResetSent: () => void;
  restart: () => void;
  emailForm: PasswordResetEmailForm;
  codeForm: ReturnType<typeof useOtpVerification>;
  newPasswordForm: PasswordResetPasswordForm;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

export function usePasswordResetFlow(): UsePasswordResetFlowReturn {
  const navigate = useNavigate();
  const { session, requestPasswordReset, verifyOtp, updatePassword, signOut } = useAuthContext();
  const [step, setStep] = useState<PasswordResetStep>(() =>
    pendingPasswordReset.get() ? 'code' : 'email',
  );
  const [showResetSent, setShowResetSent] = useState(false);

  const codeForm = useOtpVerification({
    pendingStore: pendingPasswordReset,
    verify: async (email, code) => {
      await verifyOtp({ email, token: code, type: 'recovery' });
    },
    resend: requestPasswordReset,
    onVerified: () => setStep('password'),
    clearOnVerified: false,
  });

  const email = codeForm.email;

  useEffect(() => {
    if (!email && session.status === 'authenticated' && session.user?.emailVerifiedAt) {
      navigate('/', { replace: true });
    }
  }, [email, navigate, session]);

  const emailForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  });

  const submitEmail = emailForm.handleSubmit(async ({ email: sentEmail }) => {
    emailForm.clearErrors('root');

    try {
      await requestPasswordReset(sentEmail);
      codeForm.start(sentEmail);
      setShowResetSent(true);
      setStep('code');
    } catch (error) {
      emailForm.setError('root', {
        type: 'server',
        message: errorMessage(error),
      });
    }
  });

  const newPasswordForm = useForm<NewPasswordFormValues>({
    resolver: zodResolver(newPasswordSchema),
    mode: 'onTouched',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const submitPassword = newPasswordForm.handleSubmit(async ({ password }) => {
    newPasswordForm.clearErrors('root');

    try {
      await updatePassword(password);
      await signOut('global');
      codeForm.clear();
      navigate('/login', { replace: true, state: { passwordReset: true } });
    } catch (error) {
      newPasswordForm.setError('root', {
        type: 'server',
        message: errorMessage(error),
      });
    }
  });

  function restart() {
    codeForm.clear();
    setStep('email');
    setShowResetSent(false);
    emailForm.reset();
    newPasswordForm.reset();
  }

  return {
    step,
    email,
    showResetSent,
    dismissResetSent: () => setShowResetSent(false),
    restart,
    emailForm: { ...emailForm, submit: submitEmail },
    codeForm,
    newPasswordForm: { ...newPasswordForm, submit: submitPassword },
  };
}
