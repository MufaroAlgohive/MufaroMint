import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isBiometricsAvailable, authenticateWithBiometrics, enableBiometrics, getBiometryTypeName } from '../lib/biometrics';

const BiometricPromptModal = ({ isOpen, onClose, userEmail, onComplete }) => {
  const [biometryType, setBiometryType] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const checkBiometrics = async () => {
      const { available, biometryType: type } = await isBiometricsAvailable();
      if (available) {
        setBiometryType(type);
      }
    };
    if (isOpen) {
      checkBiometrics();
    }
  }, [isOpen]);

  const biometryName = getBiometryTypeName(biometryType);

  const handleEnable = async () => {
    setIsAuthenticating(true);
    try {
      await authenticateWithBiometrics(`Enable ${biometryName} for faster login`);
      enableBiometrics(userEmail);
      onComplete?.(true);
      onClose();
    } catch (error) {
      console.error('Failed to enable biometrics:', error);
      setIsAuthenticating(false);
    }
  };

  const handleDecline = () => {
    onComplete?.(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
        onClick={handleDecline}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-700">
              <svg
                className="h-10 w-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </div>
          </div>

          <h2 className="mb-2 text-center text-xl font-semibold text-slate-900">
            Enable {biometryName}?
          </h2>
          <p className="mb-8 text-center text-sm text-slate-500">
            Use {biometryName} for faster and more secure login next time.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleEnable}
              disabled={isAuthenticating}
              className="w-full rounded-full bg-slate-900 py-4 text-sm font-semibold tracking-[0.16em] text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
            >
              {isAuthenticating ? 'VERIFYING...' : `ENABLE ${biometryName.toUpperCase()}`}
            </button>
            <button
              onClick={handleDecline}
              disabled={isAuthenticating}
              className="w-full rounded-full border border-slate-200 py-4 text-sm font-semibold tracking-[0.16em] text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
            >
              NOT NOW
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BiometricPromptModal;
