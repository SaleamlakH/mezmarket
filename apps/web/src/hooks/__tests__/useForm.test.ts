import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useForm } from '../useForm';
import type { ValidationResult } from '@mez/validation';

function fakeEvent() {
  return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}

function createFakeValidate(result: ValidationResult<{ email: string; password: string }>) {
  return vi.fn().mockReturnValue(result);
}

describe('useForm', () => {
  const initialValues = { email: '', password: '' };

  it('initializes with initial values, no errors, idle status', () => {
    const validate = vi.fn().mockReturnValue({ data: initialValues, errors: null });
    const onSubmit = vi.fn();

    const { result } = renderHook(() => useForm({ initialValues, validate, onSubmit }));

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.status).toBe('idle');
    expect(result.current.formError).toBeNull();
  });

  it('updates a field value on handleChange', () => {
    const validate = vi.fn().mockReturnValue({ data: initialValues, errors: null });
    const { result } = renderHook(() => useForm({ initialValues, validate, onSubmit: vi.fn() }));

    act(() => result.current.handleChange('email', 'a@b.com'));

    expect(result.current.values.email).toBe('a@b.com');
  });

  it('calls validate on handleChange and updates errors from its result', () => {
    const validate = vi.fn().mockReturnValue({
      data: null,
      errors: { email: 'Invalid email' },
    });

    const { result } = renderHook(() => useForm({ initialValues, validate, onSubmit: vi.fn() }));

    act(() => result.current.handleBlur('email')); // validation happen after first touch
    act(() => result.current.handleChange('email', 'not-an-email'));

    expect(validate).toHaveBeenCalledWith(expect.objectContaining({ email: 'not-an-email' }));
    expect(result.current.values.email).toBe('not-an-email');
    expect(result.current.errors).toEqual({ email: 'Invalid email' });
  });

  it('calls validate on handleBlur and updates errors from its result', () => {
    const validate = vi.fn().mockReturnValue({
      data: null,
      errors: { password: 'Too short' },
    });
    const { result } = renderHook(() => useForm({ initialValues, validate, onSubmit: vi.fn() }));

    act(() => result.current.handleBlur('password'));

    expect(validate).toHaveBeenCalledWith(initialValues);
    expect(result.current.errors).toEqual({ password: 'Too short' });
  });

  it('calls preventDefault on the submit event', async () => {
    const validate = vi.fn().mockReturnValue({ data: initialValues, errors: null });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useForm({ initialValues, validate, onSubmit }));

    const event = fakeEvent();
    await act(async () => {
      result.current.handleSubmit(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('does not call onSubmit and populates errors when validate fails', async () => {
    const validate = vi.fn().mockReturnValue({
      data: null,
      errors: { email: 'Invalid email' },
    });
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useForm({ initialValues, validate, onSubmit }));

    await act(async () => {
      result.current.handleSubmit(fakeEvent());
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.errors).toEqual({ email: 'Invalid email' });
  });

  it('calls onSubmit with validated data when validate succeeds', async () => {
    const values = { email: 'a@b.com', password: 'secret123' };
    const validate = vi.fn().mockReturnValue({ data: values, errors: null });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useForm({ initialValues: values, validate, onSubmit }));

    await act(async () => {
      result.current.handleSubmit(fakeEvent());
    });

    expect(onSubmit).toHaveBeenCalledWith(values);
  });

  it('sets status to success after onSubmit resolves successfully', async () => {
    const validate = vi.fn().mockReturnValue({ data: initialValues, errors: null });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useForm({ initialValues, validate, onSubmit }));

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('success');
  });

  it('sets status to submitting while onSubmit is in flight', async () => {
    const validate = vi.fn().mockReturnValue({ data: initialValues, errors: null });
    let resolveSubmit: () => void;
    const pending = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    const onSubmit = vi.fn().mockReturnValue(pending);
    const { result } = renderHook(() => useForm({ initialValues, validate, onSubmit }));

    act(() => {
      result.current.handleSubmit(fakeEvent());
    });
    await waitFor(() => expect(result.current.status).toBe('submitting'));

    act(() => {
      resolveSubmit();
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
  });

  it('sets status to error and fills formError when onSubmit throws', async () => {
    const validate = vi.fn().mockReturnValue({ data: initialValues, errors: null });
    const onSubmit = vi.fn().mockRejectedValue(new Error('Invalid login credentials'));
    const { result } = renderHook(() => useForm({ initialValues, validate, onSubmit }));

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(result.current.status).toBe('error');
    expect(result.current.formError).toMatch(/invalid login credentials/i);
  });

  it('handleChange does not update and validate while status is submitting', async () => {
    const validate = vi.fn().mockReturnValue({ data: initialValues, errors: null });
    let resolveSubmit: () => void;
    const pending = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    const onSubmit = vi.fn().mockReturnValue(pending);
    const { result } = renderHook(() => useForm({ initialValues, validate, onSubmit }));

    act(() => {
      result.current.handleSubmit(fakeEvent());
    });

    await waitFor(() => expect(result.current.status).toBe('submitting'));

    act(() => result.current.handleChange('email', 'ignored@b.com'));

    expect(result.current.values.email).not.toBe('ignored@b.com');
    expect(validate).toHaveBeenCalledTimes(1); // handle submit call

    act(() => {
      resolveSubmit();
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
  });

  it('does not call onSubmit again if handleSubmit is invoked while already submitting', async () => {
    const validate = vi.fn().mockReturnValue({ data: initialValues, errors: null });
    let resolveSubmit: () => void;
    const pending = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    const onSubmit = vi.fn().mockReturnValue(pending);
    const { result } = renderHook(() => useForm({ initialValues, validate, onSubmit }));

    act(() => {
      result.current.handleSubmit(fakeEvent());
    });
    await waitFor(() => expect(result.current.status).toBe('submitting'));

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);

    act(() => {
      resolveSubmit();
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
  });

  it('revalidates on every handleSubmit call and blocks onSubmit while errors persist', async () => {
    const validate = vi.fn().mockReturnValue({
      data: null,
      errors: { email: 'Invalid email' },
    });
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useForm({ initialValues, validate, onSubmit }));

    await act(async () => {
      result.current.handleSubmit(fakeEvent());
    });

    await act(async () => {
      result.current.handleSubmit(fakeEvent());
    });

    expect(validate).toHaveBeenCalledTimes(2);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.errors).toEqual({ email: 'Invalid email' });
  });

  it('clears a previous formError on a new successful submit attempt', async () => {
    const validate = createFakeValidate({
      data: { email: 't@test.com', password: '123' },
      errors: null,
    });
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(new Error('Invalid login credentials'))
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useForm({ initialValues, validate, onSubmit }));

    await act(async () => {
      result.current.handleSubmit(fakeEvent());
    });

    expect(result.current.status).toBe('error');

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(result.current.status).toBe('success');
    expect(result.current.formError).toBeFalsy();
  });

  it('hands the transformed submit data to onSubmit when it differs from form values', async () => {
    type SubmitData = { email: string; password: string; count: number };
    const validate = vi.fn(
      (values: { email: string; password: string }): ValidationResult<SubmitData> => ({
        data: { ...values, count: 3 },
        errors: null,
      }),
    );
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useForm<{ email: string; password: string }, SubmitData>({
        initialValues,
        validate,
        onSubmit,
      }),
    );

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(onSubmit).toHaveBeenCalledWith({ email: '', password: '', count: 3 });
  });
});
