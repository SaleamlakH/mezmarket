import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './Input';

type PasswordFieldProps = React.InputHTMLAttributes<HTMLInputElement>;

export function PasswordInput({ className, ...inputProps }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative flex items-center">
      <Input type={visible ? 'text' : 'password'} className={className} {...inputProps} />

      <button
        type="button"
        className="absolute right-4"
        onClick={() => setVisible((prev) => !prev)}
      >
        {visible ? (
          <EyeOff size={18} color="var(--text-muted)" />
        ) : (
          <Eye size={18} color="var(--text-muted)" />
        )}
      </button>
    </div>
  );
}
