import crypto from 'crypto';

export const generateSecureToken = () => {
  return crypto.randomUUID();
};
