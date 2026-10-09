/**
 * Per-field error messages keyed by their dotted path.
 *
 * `validateInput` flattens Zod issues with `issue.path.join('.')`, so a
 * nested field is keyed `address.city` and a field inside a list is keyed
 * `lines.0.purchaseQuantity`. Those paths are matched by a pattern index
 * signature rather than a plain one, so a key of `T` can still be indexed
 * dynamically and the whole record stays assignable to
 * `Record<string, string>` — the shape the API's error envelope carries.
 */
export type FieldErrors<T> = Partial<Record<keyof T, string>> & {
  [path: `${string}.${string}`]: string;
} & {
  _root?: string;
};

export type ValidationResult<T> =
  | { data: T; errors: null }
  | { data: null; errors: FieldErrors<T> };
