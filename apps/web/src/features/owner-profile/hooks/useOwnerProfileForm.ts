import { useRef, useMemo } from 'react';
import type { OwnerResponse, UpdateOwnerInput } from '@mez/types';
import { validateUpdateOwnerValues, type UpdateOwnerFormValues } from '@mez/validation';
import { useForm } from '@/hooks/useForm';
import type { OwnerApi } from '../api/ownerApi';

function toUpdateInput(data: UpdateOwnerFormValues): UpdateOwnerInput {
  const input: UpdateOwnerInput = {};
  if (data.name !== undefined) input.name = data.name;
  if (data.contactEmail !== undefined) input.contactEmail = data.contactEmail;
  if (data.contactPhone !== undefined) input.contactPhone = data.contactPhone;
  return input;
}

export function useOwnerProfileForm(
  ownerApi: OwnerApi,
  profile: OwnerResponse,
  onSaved: (updated: OwnerResponse) => void,
) {
  const updatedRef = useRef<OwnerResponse | null>(null);

  const initialValues = useMemo<UpdateOwnerFormValues>(
    () => ({
      name: profile.name,
      contactEmail: profile.contactEmail,
      contactPhone: profile.contactPhone,
    }),
    [profile],
  );

  const { status, values, errors, formError, handleChange, handleBlur, handleSubmit } =
    useForm<UpdateOwnerFormValues>({
      initialValues,
      validate: validateUpdateOwnerValues,
      onSubmit: async (data) => {
        const updated = await ownerApi.updateOwnerProfile(toUpdateInput(data));
        updatedRef.current = updated;
      },
      onSuccess: () => {
        if (updatedRef.current) {
          onSaved(updatedRef.current);
        }
      },
    });

  const hasChanges =
    values.name !== profile.name ||
    (values.contactEmail ?? null) !== (profile.contactEmail ?? null) ||
    (values.contactPhone ?? null) !== (profile.contactPhone ?? null);

  return {
    values,
    errors,
    hasChanges,
    isSubmitting: status === 'submitting',
    submitError: formError,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}
