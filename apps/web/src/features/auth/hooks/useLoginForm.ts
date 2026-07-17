import { validateLoginValues, type LoginFormValues } from '@mez/validation';
import { useAuthForm } from './useAuthForm';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';

export function useLoginForm() {
  const navigate = useNavigate();
  const { signInWithEmail } = useAuthContext();

  return useAuthForm<LoginFormValues>({
    initialValues: { email: '', password: '' },
    validate: validateLoginValues,
    onSubmit: signInWithEmail,
    onSuccess: () => navigate('/'),
  });
}
