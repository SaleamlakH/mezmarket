import { Button } from '../../../components/Button';
import { Field } from '../../../components/Field';
import { Input } from '../../../components/Input';
import { PasswordInput } from '../../../components/PasswordInput';
import { LedgerLine } from '../../../components/LedgerLine';
import { Link } from 'react-router';
import { useSignupForm } from '../hooks/useSignupForm';
import { Banner } from '@/components/Banner';
import { Toast } from '@/components/Toast';

export function SignupPage() {
  const {
    values,
    errors,
    formError,
    setFormError,
    status,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useSignupForm();

  return (
    <>
      {/* Error toast*/}
      {formError && (
        <Toast position="top-right" duration={5000} onDismiss={() => setFormError(null)}>
          <Banner tone="danger" title={formError} onDismiss={() => setFormError(null)} />
        </Toast>
      )}

      {/*headline*/}
      <div className="mt-6 mb-6">
        <h1 className="text-3xl font-bold text-(--text) leading-tighter">
          Start your <br /> ledger
        </h1>
        <LedgerLine />
        <p className="text-left text-md text-(--text-muted) mt-1">
          Track stock, sales, and what's owed from day one.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
        <Field id="name" label="Full Name" error={errors?.name}>
          <Input
            type="text"
            id="name"
            name="name"
            placeholder="John Doe"
            value={values.name}
            onChange={(e) => handleChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            autoComplete="name"
          />
        </Field>

        <Field id="email" label="Email" error={errors?.email}>
          <Input
            type="email"
            id="email"
            name="email"
            placeholder="you@example.com"
            value={values.email}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            autoComplete="email"
          />
        </Field>

        <Field id="password" label="Password" error={errors?.password}>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            value={values.password}
            onChange={(e) => handleChange('password', e.target.value)}
            onBlur={() => handleBlur('password')}
            autoComplete="new-password"
          />
        </Field>

        <Field id="confirm-password" label="Confirm Password" error={errors?.confirmPassword}>
          <PasswordInput
            id="confirm-password"
            placeholder="••••••••"
            value={values.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            onBlur={() => handleBlur('confirmPassword')}
          />
        </Field>

        {/*spacer*/}
        <div className="flex-1"></div>

        <Button
          type="submit"
          isLoading={status === 'submitting'}
          className="w-full h-11 rounded-2xl"
        >
          Create Account
        </Button>

        <p className="text-center text-sm text-(--text-muted)">
          Already have an account?{' '}
          <Link
            to="/login"
            className="pl-1 cursor-pointer focus-ring mx-auto text-sm font-semibold text-(--accent) underline underline-offset-2 transition-colors hover:text-(--text)"
          >
            Login
          </Link>
        </p>
      </form>
    </>
  );
}
