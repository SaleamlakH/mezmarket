import { useCallback, useState } from 'react';
import { type FieldErrors, type ValidationResult } from '@mez/validation';

interface UseAuthFormOptions<TValues> {
  initialValues: TValues;
  validate: (values: TValues) => ValidationResult<TValues>;
  onSubmit: (values: TValues) => void;
  onSuccess: () => void;
}

export function useAuthForm<TValues>({
  initialValues,
  validate,
  onSubmit,
  onSuccess,
}: UseAuthFormOptions<TValues>) {
  const [values, setValues] = useState<TValues>(initialValues);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error' | 'success'>('idle');
  const [touched, setTouched] = useState<Partial<Record<keyof TValues, boolean>>>({});

  const [errors, setErrors] = useState<FieldErrors<TValues>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const writeFieldError = useCallback((field: keyof TValues, message: string | undefined) => {
    setErrors((prevError) => {
      if (message) {
        return { ...prevError, [field]: message };
      }

      // eslint-disable-next-line
      const { [field]: _omit, ...restError } = prevError;
      return restError as FieldErrors<TValues>;
    });
  }, []);

  const handleChange = useCallback(
    (field: keyof TValues, value: string) => {
      if (status === 'submitting') return;

      const nextValues = { ...values, [field]: value };
      setValues(nextValues);

      if (touched[field]) {
        const { errors: nextErrors } = validate(nextValues);
        writeFieldError(field, nextErrors?.[field]);
      }
    },
    [status, values, touched, validate, writeFieldError],
  );

  const handleBlur = useCallback(
    (field: keyof TValues) => {
      if (status === 'submitting') return;
      setTouched((prev) => ({ ...prev, [field]: true }));

      const { errors: currentErrors } = validate(values);
      writeFieldError(field, currentErrors?.[field]);
    },
    [status, values, validate, writeFieldError],
  );

  const handleSubmit: React.SubmitEventHandler = useCallback(
    async (e) => {
      e.preventDefault();
      if (status === 'submitting') return;

      const { errors: allErrors, data } = validate(values);
      if (allErrors) {
        setErrors(allErrors);
        setStatus('error');
        return;
      }

      setStatus('submitting');
      setFormError(null);

      try {
        await onSubmit(data as TValues);
        onSuccess();
      } catch (error) {
        setStatus('error');

        const authError = error as Error;
        setFormError(authError.message);
      }
    },
    [status, values, validate, onSubmit, onSuccess],
  );

  return {
    status,
    setStatus,
    values,
    errors,
    formError,
    setFormError,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}
