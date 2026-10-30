import type { SignupFormValues } from '@mez/types';
import { validateSignupValues } from '@mez/validation';
import { useForm } from '@/hooks/useForm';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { pendingVerification } from '../lib/pendingOtp';

export function useSignupForm() {
  const navigate = useNavigate();
  const { signUpWithEmail } = useAuthContext();

  async function handleSubmit({ name, email, password }: SignupFormValues) {
    const user = await signUpWithEmail({ name, email, password });

    if (!user.emailVerifiedAt) {
      pendingVerification.start(email);
      navigate('/verify-email', { replace: true, state: { verificationSent: true } });
      return;
    }

    navigate('/dashboard', { replace: true });
  }

  return useForm<SignupFormValues>({
    initialValues: { name: '', email: '', password: '', confirmPassword: '' },
    validate: validateSignupValues,
    onSubmit: handleSubmit,
    onSuccess: () => navigate('/dashboard'),
  });
}
