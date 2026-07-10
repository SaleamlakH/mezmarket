interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ id, error, className, ...inputAttrs }: InputProps) {
  return (
    <input
      id={id}
      className={`
        w-full h-11 px-4 py-3.5 rounded-[13px] bg-(--field) border 
        text-md text-(--text) font-[Inter]
        placeholder:text-(--text-muted)
        focus:outline-none focus:ring-2 focus:ring-(--accent) focus:border-transparent
        transition-colors duration-150
        ${error ? 'border-(--warning)' : 'border-(--border)'}
        ${className}
      `}
      {...inputAttrs}
    />
  );
}
