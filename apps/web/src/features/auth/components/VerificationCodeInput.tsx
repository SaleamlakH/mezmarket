import { useRef } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';

const CODE_LENGTH = 6;

function digitsOf(value: string): string[] {
  return Array.from({ length: CODE_LENGTH }, (_, index) => value[index] ?? '');
}

interface VerificationCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function VerificationCodeInput({
  value,
  onChange,
  disabled = false,
}: VerificationCodeInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  function focusAt(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), CODE_LENGTH - 1);
    inputs.current[nextIndex]?.focus();
    inputs.current[nextIndex]?.select();
  }

  function writeFrom(index: number, raw: string) {
    const digits = digitsOf(value);
    const entered = raw.replace(/\D/g, '');

    if (!entered) {
      digits[index] = '';
      onChange(digits.join(''));
      return;
    }

    for (let offset = 0; offset < entered.length && index + offset < CODE_LENGTH; offset += 1) {
      digits[index + offset] = entered[offset] as string;
    }

    onChange(digits.join(''));
    focusAt(index + entered.length);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !value[index]) {
      event.preventDefault();
      focusAt(index - 1);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusAt(index - 1);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusAt(index + 1);
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text');
    if (!pasted) return;

    event.preventDefault();
    writeFrom(index, pasted);
  }

  return (
    <div role="group" aria-label="Verification code" className="flex justify-between gap-2">
      {digitsOf(value).map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`Verification code digit ${index + 1}`}
          onChange={(event) => writeFrom(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.target.select()}
          className="focus-ring h-12 w-11 rounded-xl border border-(--border) bg-(--surface-primary) text-center text-xl font-semibold text-(--text) transition-colors focus:border-(--accent) disabled:opacity-50"
        />
      ))}
    </div>
  );
}
