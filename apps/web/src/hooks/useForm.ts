import { useCallback, useState } from 'react';
import type { FieldErrors, ValidationResult } from '@mez/validation';

export interface UseFormOptions<TValues, TData> {
  initialValues: TValues;
  validate: (values: TValues) => ValidationResult<TData>;
  onSubmit: (data: TData) => Promise<void>;
}

export function useForm<TValues, TData = TValues>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<TValues, TData>) {
  const [values, setValues] = useState<TValues>(initialValues);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error' | 'success'>('idle');
  const [touched, setTouched] = useState<Partial<Record<keyof TData, boolean>>>({});

  const [errors, setErrors] = useState<FieldErrors<TData>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const writeFieldError = useCallback((field: keyof TData, message: string | undefined) => {
    setErrors((prevError) => {
      if (message) {
        return { ...prevError, [field]: message };
      }

      // eslint-disable-next-line
      const { [field]: _omit, ...restError } = prevError;
      return restError as FieldErrors<TData>;
    });
  }, []);

  const handleChange = useCallback(
    (field: keyof TData, value: string | boolean) => {
      if (status === 'submitting') return;

      const nextValues = { ...values, [field]: value };
      setValues(nextValues);

      if (touched[field]) {
        const { errors: nextErrors } = validate(nextValues);
        // TData mirrors the form field names, so raw values index typed errors.
        const nextError = nextErrors?.[field];
        writeFieldError(field, nextError);
      }
    },
    [status, values, touched, validate, writeFieldError],
  );

  const handleBlur = useCallback(
    (field: keyof TData) => {
      if (status === 'submitting') return;
      setTouched((prev) => ({ ...prev, [field]: true }));

      const { errors: currentErrors } = validate(values);
      const currentError = currentErrors?.[field];
      writeFieldError(field, currentError);
    },
    [status, values, validate, writeFieldError],
  );

  const reset = useCallback(
    (nextValues?: TValues) => {
      setValues(nextValues ?? initialValues);
      setStatus('idle');
      setTouched({});
      setErrors({});
      setFormError(null);
    },
    [initialValues],
  );

  const handleSubmit: React.SubmitEventHandler = useCallback(
    async (e) => {
      e.preventDefault();
      if (status === 'submitting') return;

      const result = validate(values);
      if (result.errors) {
        // Raw and typed forms share field names; error keys match the form fields.
        setErrors(result.errors);
        setStatus('error');
        return;
      }

      setStatus('submitting');
      setFormError(null);

      try {
        await onSubmit(result.data as TData);
        setStatus('success');
      } catch (error) {
        setStatus('error');

        const submitError = error as Error;
        setFormError(submitError.message);
      }
    },
    [status, values, validate, onSubmit],
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
    reset,
  };
}
