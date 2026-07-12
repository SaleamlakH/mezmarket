import { useState } from 'react';
import { Button } from '../../../components/Button';
import { Field } from '../../../components/Field';
import { Input } from '../../../components/Input';
import { PasswordInput } from '../../../components/PasswordInput';
import { LedgerLine } from '../../../components/LedgerLine';
import { Link } from 'react-router';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
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

      <form className="flex flex-col gap-4 flex-1">
        <Field id="email" label="Email">
          <Input
            type="email"
            id="email"
            name="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </Field>

        <Field id="password" label="Password">
          <PasswordInput
            id="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>

        <Field id="confirm-password" label="Confirm Password">
          <PasswordInput
            type="password"
            id="confirm-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>

        {/*spacer*/}
        <div className="flex-1"></div>

        <Button isLoading={isLoading} onClick={() => setIsLoading((prev) => !prev)}>
          Create Account
        </Button>

        <Button variant="outline">Google</Button>

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
