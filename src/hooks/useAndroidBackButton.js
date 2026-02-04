import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function useAndroidBackButton(onBack, enabled = true) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    const handleBackButton = ({ canGoBack }) => {
      console.log('Android back button pressed, enabled:', enabled, 'canGoBack:', canGoBack);
      
      if (enabled && onBack && typeof onBack === 'function') {
        console.log('Calling onBack function');
        onBack();
      }
    };

    const listener = App.addListener('backButton', handleBackButton);

    return () => {
      listener.then(l => l.remove());
    };
  }, [onBack, enabled]);
}
