import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { validateCreateBusiness, type CreateBusinessFormValues } from '@mez/validation';
import type { CreateBusinessInput } from '@mez/types';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useForm } from '@/hooks/useForm';
import { businessService } from '../api/businessService';

const INITIAL_VALUES: CreateBusinessFormValues = {
  name: '',
  currencyCode: '',
};

export function useCreateBusinessForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setCurrentBusiness } = useBusinessContext();
  const [showOptional, setShowOptional] = useState(false);

  const mutation = useMutation({
    mutationFn: (values: CreateBusinessInput) => businessService.createBusiness(values),
  });

  const handleSubmit = useCallback(
    (values: CreateBusinessInput) =>
      mutation.mutateAsync(values).then((result) => {
        queryClient.removeQueries({ queryKey: ['businesses'] });
        setCurrentBusiness(result.business.id);
        navigate('/dashboard');
      }),
    [mutation, queryClient, setCurrentBusiness, navigate],
  );

  const form = useForm<CreateBusinessFormValues, CreateBusinessInput>({
    initialValues: INITIAL_VALUES,
    validate: validateCreateBusiness,
    onSubmit: handleSubmit,
  });

  return {
    ...form,
    showOptional,
    setShowOptional,
    isSubmitting: form.status === 'submitting',
  };
}
