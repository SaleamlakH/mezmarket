import { validateSignupValues, type SignupFormValues } from '@mez/validation';
import { useAuthForm } from './useAuthForm';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';

export function useSignupForm() {
  const navigate = useNavigate();
  const { signUpWithEmail } = useAuthContext();

  return useAuthForm<SignupFormValues>({
    initialValues: { email: '', password: '', confirmPassword: '' },
    validate: validateSignupValues,
    onSubmit: signUpWithEmail,
    onSuccess: () => navigate('/'),
  });
}
