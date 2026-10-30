import type { LoginFormValues } from '@mez/types';
import { validateLoginValues } from '@mez/validation';
import { useForm } from '@/hooks/useForm';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { isAuthFlowError } from '../lib/authErrors';
import { pendingVerification } from '../lib/pendingOtp';

export function useLoginForm() {
  const navigate = useNavigate();
  const { signInWithEmail, resendSignupOtp } = useAuthContext();

  async function handleSubmit({ email, password }: LoginFormValues) {
    try {
      await signInWithEmail({ email, password });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      if (!isAuthFlowError(error, 'email_not_confirmed')) throw error;

      await resendSignupOtp(email);
      pendingVerification.start(email);
      navigate('/verify-email', { replace: true, state: { verificationSent: true } });
    }
  }

  return useForm<LoginFormValues>({
    initialValues: { email: '', password: '' },
    validate: validateLoginValues,
    onSubmit: handleSubmit,
  });
}
