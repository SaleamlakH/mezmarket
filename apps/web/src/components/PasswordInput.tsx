import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './Input';
import type { InputProps } from './Input';

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  /** Start with the password visible instead of hidden. */
  defaultVisible?: boolean;
}

export function PasswordInput({
  defaultVisible = false,
  className = '',
  ...rest
}: PasswordInputProps) {
  const [visible, setVisible] = useState(defaultVisible);

  return (
    <div className="relative flex items-center">
      <Input type={visible ? 'text' : 'password'} className={`pr-10 ${className}`} {...rest} />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        className="focus-ring absolute right-4 cursor-pointer text-(--text-muted) hover:text-(--text)"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
