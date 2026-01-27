import { Capacitor, registerPlugin } from '@capacitor/core';

const BIOMETRICS_ENABLED_KEY = 'biometricsEnabled';
const BIOMETRICS_USER_KEY = 'biometricsUserEmail';
const FIRST_LOGIN_KEY = 'hasLoggedInBefore';

export const isNativePlatform = () => {
  return typeof Capacitor.isNativePlatform === 'function'
    ? Capacitor.isNativePlatform()
    : Capacitor.getPlatform() !== 'web';
};

export const isNativeIOS = () => {
  return isNativePlatform() && Capacitor.getPlatform() === 'ios';
};

export const isNativeAndroid = () => {
  return isNativePlatform() && Capacitor.getPlatform() === 'android';
};

const NativeBiometric = registerPlugin('NativeBiometric');

export const isBiometricsAvailable = async () => {
  if (!isNativePlatform()) return { available: false, biometryType: null };

  try {
    const res = await NativeBiometric.isAvailable();
    const available = !!res?.isAvailable;
    const biometryType = res?.biometryType || null;
    
    if (!available && isNativeAndroid()) {
      console.warn('[Biometrics] Not available on Android:', {
        biometryType,
        reason: 'Device may not have biometric hardware or OS version < 6.0'
      });
    }
    
    return { available, biometryType };
  } catch (error) {
    console.error('Error checking biometrics availability:', error);
    if (isNativeAndroid()) {
      console.error('[Biometrics] Android-specific error:', {
        message: error.message,
        code: error.code,
        platform: 'android'
      });
    }
    return { available: false, biometryType: null };
  }
};

export const authenticateWithBiometrics = async (reason = 'Authenticate to continue') => {
  if (!isNativePlatform()) throw new Error('Biometrics only available on native platforms');

  try {
    await NativeBiometric.verifyIdentity({ reason });
    return true;
  } catch (error) {
    // Log platform-specific errors for debugging
    if (isNativeAndroid()) {
      console.error('[Biometrics] Android authentication error:', {
        message: error.message,
        code: error.code,
        platform: 'android'
      });
    }
    throw error;
  }
};

export const isBiometricsEnabled = () => {
  return localStorage.getItem(BIOMETRICS_ENABLED_KEY) === 'true';
};

export const enableBiometrics = (userEmail) => {
  localStorage.setItem(BIOMETRICS_ENABLED_KEY, 'true');
  if (userEmail) localStorage.setItem(BIOMETRICS_USER_KEY, userEmail);
};

export const disableBiometrics = () => {
  localStorage.removeItem(BIOMETRICS_ENABLED_KEY);
  localStorage.removeItem(BIOMETRICS_USER_KEY);
};

export const getBiometricsUserEmail = () => {
  return localStorage.getItem(BIOMETRICS_USER_KEY);
};

export const isFirstLogin = (userEmail) => {
  const loginHistory = JSON.parse(localStorage.getItem(FIRST_LOGIN_KEY) || '{}');
  return !loginHistory[userEmail];
};

export const markAsLoggedIn = (userEmail) => {
  const loginHistory = JSON.parse(localStorage.getItem(FIRST_LOGIN_KEY) || '{}');
  loginHistory[userEmail] = true;
  localStorage.setItem(FIRST_LOGIN_KEY, JSON.stringify(loginHistory));
};

export const getBiometryTypeName = (biometryType) => {
  if (!biometryType) return 'Biometrics';
  const type = String(biometryType).toLowerCase();
  if (type.includes('face')) return isNativeAndroid() ? 'Face Unlock' : 'Face ID';
  if (type.includes('touch') || type.includes('fingerprint')) return isNativeAndroid() ? 'Fingerprint' : 'Touch ID';
  return 'Biometrics';
};
