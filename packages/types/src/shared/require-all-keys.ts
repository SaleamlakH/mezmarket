/**
 * Constrains `T` so every key of `Source` must be present, forcing derived
 * response types to mirror the source type's keys.
 */
export type RequireAllKeys<Source, T extends Record<keyof Source, unknown>> = T;
