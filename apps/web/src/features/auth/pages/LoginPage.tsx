import { Button } from '../../../components/Button';
import { Field } from '../../../components/Field';
import { Input } from '../../../components/Input';
import { PasswordInput } from '../../../components/PasswordInput';
import { LedgerLine } from '../../../components/LedgerLine';
import { Link } from 'react-router';
import { useLoginForm } from '../hooks/useLoginForm';
import { Toast } from '@/components/Toast';

export function LoginPage() {
  const {
    status,
    values,
    errors,
    formError,
    setFormError,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useLoginForm();

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
          Welcome <br /> back
        </h1>
        <LedgerLine />
        <p className="text-left text-md text-(--text-muted) mt-1">Log in to your ledger</p>
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
            name="password"
            placeholder="••••••••"
            value={values.password}
            onChange={(e) => handleChange('password', e.target.value)}
            onBlur={() => handleBlur('password')}
            autoComplete="current-password"
          />
        </Field>

        <div className="flex justify-end">
          <Link to="#" className="text-end text-(--text-muted) underline underline-offset-1">
            Forgot password?
          </Link>
        </div>

        {/*spacer*/}
        <div className="flex-1"></div>

        <Button
          type="submit"
          isLoading={status === 'submitting'}
          className="w-full h-11 rounded-2xl font-bold"
        >
          Log In
        </Button>

        <p className="text-center text-sm text-(--text-muted)">
          New here?{' '}
          <Link
            to="/signup"
            className="text-(--accent) font-bold no-underline cursor-pointer hover:text-(--accent-hover)"
          >
            Create an account
          </Link>
        </p>
      </form>
    </>
  );
}
