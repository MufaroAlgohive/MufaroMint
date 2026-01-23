import { Capacitor } from '@capacitor/core';

const BIOMETRICS_ENABLED_KEY = 'biometricsEnabled';
const BIOMETRICS_USER_KEY = 'biometricsUserEmail';
const FIRST_LOGIN_KEY = 'hasLoggedInBefore';

export const isNativePlatform = () => {
  return typeof Capacitor.isNativePlatform === 'function'
    ? Capacitor.isNativePlatform()
    : Capacitor.getPlatform() !== 'web';
};

export const isBiometricsAvailable = async () => {
  if (!isNativePlatform()) {
    return { available: false, biometryType: null };
  }

  try {
    const { FaceId } = await import('capacitor-face-id');
    const result = await FaceId.isAvailable();
    return {
      available: !!result.value,
      biometryType: result.value || null
    };
  } catch (error) {
    console.error('Error checking biometrics availability:', error);
    return { available: false, biometryType: null };
  }
};

export const authenticateWithBiometrics = async (reason = 'Authenticate to continue') => {
  if (!isNativePlatform()) {
    throw new Error('Biometrics only available on native platforms');
  }

  try {
    const { FaceId } = await import('capacitor-face-id');
    await FaceId.auth({ reason });
    return true;
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    throw error;
  }
};

export const isBiometricsEnabled = () => {
  return localStorage.getItem(BIOMETRICS_ENABLED_KEY) === 'true';
};

export const enableBiometrics = (userEmail) => {
  localStorage.setItem(BIOMETRICS_ENABLED_KEY, 'true');
  if (userEmail) {
    localStorage.setItem(BIOMETRICS_USER_KEY, userEmail);
  }
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
  const type = biometryType.toLowerCase();
  if (type.includes('face')) return 'Face ID';
  if (type.includes('touch') || type.includes('fingerprint')) return 'Touch ID';
  return 'Biometrics';
};
