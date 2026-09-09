import { validateLoginValues, type LoginFormValues } from '@mez/validation';
import { useForm } from '@/hooks/useForm';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';

export function useLoginForm() {
  const navigate = useNavigate();
  const { signInWithEmail } = useAuthContext();

  return useForm<LoginFormValues>({
    initialValues: { email: '', password: '' },
    validate: validateLoginValues,
    onSubmit: signInWithEmail,
    onSuccess: () => navigate('/'),
  });
}
