import { ClientContext, ClientData } from '../types/auth/session';

export function toClientData(ctx?: ClientContext | null): ClientData {
  return {
    deviceFingerprint: ctx?.deviceFingerPrint ?? '',
    deviceInfo: ctx?.userAgent ?? '',
    ipAddress: ctx?.ipAddress ?? '',
    location: 'gRPC',
    deviceToken: ctx?.deviceToken ?? null,
    fingerprintComponents: {
      deviceName: ctx?.deviceName ?? '',
      platform: ctx?.devicePlatform ?? ctx?.platform ?? '',
      hardwareConcurrency: ctx?.deviceHardwareConcurrency ?? 0,
      timezone: ctx?.deviceTimezone ?? ctx?.timezone ?? '',
      language: ctx?.deviceLanguage ?? '',
    },
  };
}
