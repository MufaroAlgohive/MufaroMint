const PIN_HASH_KEY = 'mint_pin_hash';
const PIN_EMAIL_KEY = 'mint_pin_email';

const hashPin = async (pin) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const isPinEnabled = () => {
  return !!localStorage.getItem(PIN_HASH_KEY);
};

export const setPin = async (pin) => {
  const hash = await hashPin(pin);
  localStorage.setItem(PIN_HASH_KEY, hash);
};

export const setPinEmail = (email) => {
  localStorage.setItem(PIN_EMAIL_KEY, email);
};

export const verifyPin = async (pin) => {
  const storedHash = localStorage.getItem(PIN_HASH_KEY);
  if (!storedHash) return false;
  const hash = await hashPin(pin);
  return hash === storedHash;
};

export const removePin = () => {
  localStorage.removeItem(PIN_HASH_KEY);
  localStorage.removeItem(PIN_EMAIL_KEY);
};

export const getPinEmail = () => {
  return localStorage.getItem(PIN_EMAIL_KEY);
};
