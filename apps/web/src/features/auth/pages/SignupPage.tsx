import { Button } from '../../../components/Button';
import { Field } from '../../../components/Field';
import { Input } from '../../../components/Input';
import { PasswordInput } from '../../../components/PasswordInput';
import { LedgerLine } from '../../../components/LedgerLine';
import { Link } from 'react-router';
import { useSignupForm } from '../hooks/useSignupForm';
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
        <Toast
          message={formError}
          variant="error"
          onDismiss={() => setFormError(null)}
          duration={5000}
          position="top-right"
        />
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

        <Button type="submit" isLoading={status === 'submitting'}>
          Create Account
        </Button>

        <p className="text-center text-sm text-(--text-muted)">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-(--accent) font-bold no-underline cursor-pointer hover:text-(--accent-hover)"
          >
            Login
          </Link>
        </p>
      </form>
    </>
  );
}
