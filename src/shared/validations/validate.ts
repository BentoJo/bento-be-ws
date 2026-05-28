// ─── Types ───────────────────────────────────────────────────────────────────

import { ValidationResult } from './general';

/**
 * A validator function that takes a value and returns a ValidationResult.
 */
export type ValidatorFn = (value: any) => ValidationResult;

/**
 * A map of field names to an array of validator functions.
 */
export type ValidationSchema = Record<string, ValidatorFn[]>;

export interface FieldsValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

// ─── Core Helper ─────────────────────────────────────────────────────────────

/**
 * Run multiple validators against a data object.
 * Stops at the first error **per field** (so each field gets at most one message).
 *
 * @example
 * ```ts
 * import { validateRequired, validateEmail, validateName } from './general.validation';
 * import { validateFields } from './validate';
 *
 * const result = validateFields(
 *   { email: 'bad', firstName: '' },
 *   {
 *     email:     [(v) => validateRequired(v, 'Email'),     (v) => validateEmail(v)],
 *     firstName: [(v) => validateRequired(v, 'First name'), (v) => validateName(v, 'First name')],
 *   },
 * );
 *
 * if (!result.valid) {
 *   console.log(result.errors);
 *   // { firstName: 'First name is required' }
 * }
 * ```
 */
export const validateFields = (
  data: Record<string, unknown>,
  schema: ValidationSchema,
): FieldsValidationResult => {
  const errors: Record<string, string> = {};

  for (const [field, validators] of Object.entries(schema)) {
    const value = data[field];

    for (const validator of validators) {
      const result = validator(value);
      if (!result.valid) {
        errors[field] = result.message ?? `${field} is invalid`;
        break; // stop at first error per field
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};
