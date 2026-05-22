import { ValidationResult } from '../types/validations/general';

// ─── Generic Validators ──────────────────────────────────────────────────────

export const validateRequired = (
  value: unknown,
  fieldName = 'Field',
): ValidationResult => {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return { valid: false, message: `${fieldName} is required` };
  }
  return { valid: true };
};

export const validateStringLength = (
  value: string,
  min: number,
  max: number,
  fieldName = 'Field',
): ValidationResult => {
  if (typeof value !== 'string') {
    return { valid: false, message: `${fieldName} must be a string` };
  }
  if (value.length < min || value.length > max) {
    return {
      valid: false,
      message: `${fieldName} must be between ${min} and ${max} characters`,
    };
  }
  return { valid: true };
};

export const validateEnum = (
  value: string,
  allowed: readonly string[],
  fieldName = 'Field',
): ValidationResult => {
  if (!allowed.includes(value)) {
    return {
      valid: false,
      message: `${fieldName} must be one of: ${allowed.join(', ')}`,
    };
  }
  return { valid: true };
};

// ─── Field-Specific Validators ───────────────────────────────────────────────

/**
 * Letters (Unicode-aware) and spaces only, 2–50 characters.
 */
export const validateName = (
  name: string,
  fieldName = 'Name',
): ValidationResult => {
  if (typeof name !== 'string') {
    return { valid: false, message: `${fieldName} must be a string` };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return {
      valid: false,
      message: `${fieldName} must be between 2 and 50 characters`,
    };
  }
  // Allow letters (any script) and spaces
  const nameRegex = /^[A-Za-z\s]+$/;
  if (!nameRegex.test(trimmed)) {
    return {
      valid: false,
      message: `${fieldName} must contain only letters without spaces and special characters`,
    };
  }
  return { valid: true };
};

/**
 * Validates an email address (RFC-5322 approximation, max 255 chars).
 */
export const validateEmail = (email: string): ValidationResult => {
  if (typeof email !== 'string') {
    return { valid: false, message: 'Email must be a string' };
  }
  if (email.length > 255) {
    return { valid: false, message: 'Email must not exceed 255 characters' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Email format is invalid' };
  }
  return { valid: true };
};

/**
 * International phone format: starts with +, 7–15 digits.
 */
export const validatePhone = (phone: string): ValidationResult => {
  if (typeof phone !== 'string') {
    return { valid: false, message: 'Phone must be a string' };
  }
  const phoneRegex = /^\+[1-9]\d{6,14}$/;
  if (!phoneRegex.test(phone)) {
    return {
      valid: false,
      message: 'Phone must be in international format (e.g. +1234567890)',
    };
  }
  return { valid: true };
};

/**
 * Bio text, max 500 characters.
 */
export const validateBio = (bio: string): ValidationResult => {
  if (typeof bio !== 'string') {
    return { valid: false, message: 'Bio must be a string' };
  }
  if (bio.length > 500) {
    return { valid: false, message: 'Bio must not exceed 500 characters' };
  }
  return { valid: true };
};

/**
 * URL starting with http:// or https://.
 */
export const validateUrl = (
  url: string,
  fieldName = 'URL',
): ValidationResult => {
  if (typeof url !== 'string') {
    return { valid: false, message: `${fieldName} must be a string` };
  }
  const urlRegex = /^https?:\/\/.+/;
  if (!urlRegex.test(url)) {
    return {
      valid: false,
      message: `${fieldName} must start with http:// or https://`,
    };
  }
  return { valid: true };
};

/**
 * Date string in YYYY-MM-DD format, must be a real calendar date.
 */
export const validateDate = (
  dateStr: string,
  fieldName = 'Date',
): ValidationResult => {
  if (typeof dateStr !== 'string') {
    return { valid: false, message: `${fieldName} must be a string` };
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return {
      valid: false,
      message: `${fieldName} must be in YYYY-MM-DD format`,
    };
  }
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    return { valid: false, message: `${fieldName} is not a valid date` };
  }
  return { valid: true };
};

/**
 * Gender: 'male', 'female', or 'other'.
 */
const GENDERS = ['male', 'female', 'other'] as const;

export const validateGender = (gender: string): ValidationResult => {
  return validateEnum(gender, GENDERS, 'Gender');
};

/**
 * UUID v4 format.
 */
export const validateUUID = (
  id: string,
  fieldName = 'ID',
): ValidationResult => {
  if (typeof id !== 'string') {
    return { valid: false, message: `${fieldName} must be a string` };
  }
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return { valid: false, message: `${fieldName} must be a valid UUID` };
  }
  return { valid: true };
};

export const validateDeviceID = (deviceId: string): ValidationResult => {
  if (typeof deviceId !== 'string') {
    return { valid: false, message: 'Device ID must be a string' };
  }
  if (deviceId.length < 5 || deviceId.length > 100) {
    return {
      valid: false,
      message: 'Device ID must be between 5 and 100 characters',
    };
  }
  return { valid: true };
};

export const validateOTP = (otp: string): ValidationResult => {
  if (typeof otp !== 'string') {
    return { valid: false, message: 'OTP must be a string' };
  }
  const otpRegex = /^\d{6}$/;
  if (!otpRegex.test(otp)) {
    return { valid: false, message: 'OTP must be a 6-digit number' };
  }
  return { valid: true };
};
