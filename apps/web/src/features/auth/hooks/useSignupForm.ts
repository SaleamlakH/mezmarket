import type { SignupFormValues } from '@mez/types';
import { validateSignupValues } from '@mez/validation';
import { useForm } from '@/hooks/useForm';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';

export function useSignupForm() {
  const navigate = useNavigate();
  const { signUpWithEmail } = useAuthContext();

  return useForm<SignupFormValues>({
    initialValues: { email: '', password: '', confirmPassword: '' },
    validate: validateSignupValues,
    onSubmit: signUpWithEmail,
    onSuccess: () => navigate('/'),
  });
}
