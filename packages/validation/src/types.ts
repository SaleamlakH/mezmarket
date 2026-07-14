export type FieldErrors<T> = Partial<Record<keyof T, string>> & {
  _root?: string;
};

export type ValidationResult<T> =
  | { data: T; errors: null }
  | { data: null; errors: FieldErrors<T> };
