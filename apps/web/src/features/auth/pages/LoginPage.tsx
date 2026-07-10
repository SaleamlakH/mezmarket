import { useState } from 'react';
import { Button } from '../../../components/Button';
import { Field } from '../../../components/Field';
import { Input } from '../../../components/Input';
import { PasswordInput } from '../../../components/PasswordInput';
import { LedgerLine } from '../../../components/LedgerLine';
import { Link } from 'react-router';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      {/*headline*/}
      <div className="mt-6 mb-6">
        <h1 className="text-3xl font-bold text-(--text) leading-tighter">
          Welcome <br /> back
        </h1>
        <LedgerLine />
        <p className="text-left text-md text-(--text-muted) mt-1">Log in to your ledger</p>
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
          isLoading={isLoading}
          onClick={() => setIsLoading((prev) => !prev)}
          className="font-bold"
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
