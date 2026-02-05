import { useRef, useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

let Haptics = null;
if (Capacitor.isNativePlatform()) {
  import('@capacitor/haptics').then(module => {
    Haptics = module.Haptics;
  }).catch(() => {});
}

const triggerHaptic = async () => {
  if (Haptics && Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style: 'medium' });
    } catch {}
  }
};

// Detect Android web browser (not native app)
const isAndroidWeb = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const isAndroid = ua.includes('android');
  const isNative = Capacitor.isNativePlatform();
  return isAndroid && !isNative;
};

const SwipeBackWrapper = ({ 
  children, 
  onBack, 
  enabled = true,
  previousPage = null 
}) => {
  // On Android web: swipe works but skip iOS-style visual effects
  const isAndroid = isAndroidWeb();
  const showVisualEffects = !isAndroid;
  const containerRef = useRef(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationType, setAnimationType] = useState(null);
  
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const lastTouchX = useRef(0);
  const lastTouchTime = useRef(0);
  const isSwiping = useRef(false);
  const startedFromEdge = useRef(false);
  const hasPassedThreshold = useRef(false);
  const velocityRef = useRef(0);

  const edgeThreshold = 25;
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 375;
  const maxVerticalDistance = 80;
  const velocityThreshold = 0.5;
  const progressThreshold = 0.5;

  const handleTouchStart = useCallback((e) => {
    if (!enabled || isAnimating) return;
    
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    lastTouchX.current = touch.clientX;
    lastTouchTime.current = Date.now();
    velocityRef.current = 0;
    hasPassedThreshold.current = false;
    
    startedFromEdge.current = touch.clientX <= edgeThreshold;
    isSwiping.current = startedFromEdge.current;
    
    if (startedFromEdge.current) {
      setSwipeProgress(0);
    }
  }, [enabled, isAnimating]);

  const handleTouchMove = useCallback((e) => {
    if (!enabled || !isSwiping.current || !startedFromEdge.current || isAnimating) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = Math.abs(touch.clientY - touchStartY.current);
    
    if (deltaY > maxVerticalDistance) {
      isSwiping.current = false;
      startedFromEdge.current = false;
      setSwipeProgress(0);
      return;
    }
    
    const currentTime = Date.now();
    const timeDelta = currentTime - lastTouchTime.current;
    if (timeDelta > 0) {
      const positionDelta = touch.clientX - lastTouchX.current;
      velocityRef.current = positionDelta / timeDelta;
    }
    
    lastTouchX.current = touch.clientX;
    lastTouchTime.current = currentTime;
    
    if (deltaX > 0) {
      const progress = Math.min(deltaX / screenWidth, 1);
      setSwipeProgress(progress);
      
      if (progress >= progressThreshold && !hasPassedThreshold.current) {
        hasPassedThreshold.current = true;
        triggerHaptic();
      } else if (progress < progressThreshold && hasPassedThreshold.current) {
        hasPassedThreshold.current = false;
        triggerHaptic();
      }
    }
  }, [enabled, isAnimating, screenWidth]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !startedFromEdge.current || isAnimating) {
      setSwipeProgress(0);
      return;
    }
    
    const shouldNavigateBack = 
      swipeProgress >= progressThreshold || 
      (velocityRef.current > velocityThreshold && swipeProgress > 0.1);
    
    if (shouldNavigateBack && onBack) {
      setIsAnimating(true);
      setAnimationType('complete');
      setSwipeProgress(1);
      
      setTimeout(() => {
        onBack();
        setSwipeProgress(0);
        setIsAnimating(false);
        setAnimationType(null);
      }, 350);
    } else {
      setIsAnimating(true);
      setAnimationType('snapback');
      setSwipeProgress(0);
      
      setTimeout(() => {
        setIsAnimating(false);
        setAnimationType(null);
      }, 400);
    }
    
    isSwiping.current = false;
    startedFromEdge.current = false;
    velocityRef.current = 0;
    hasPassedThreshold.current = false;
  }, [enabled, swipeProgress, onBack, isAnimating]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const translateX = swipeProgress * screenWidth;
  const previousScale = 0.95 + (swipeProgress * 0.05);
  const previousOpacity = 0.6 + (swipeProgress * 0.4);
  const shadowOpacity = swipeProgress * 0.3;

  const getTransition = () => {
    if (!isAnimating) return 'none';
    if (animationType === 'complete') {
      return 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.1)';
    }
    return 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  };

  // Only show iOS-style visual effects (previous page preview) if not on Android web
  const showPreviousPage = showVisualEffects && (swipeProgress > 0 || isAnimating) && previousPage;

  return (
    <div 
      ref={containerRef}
      className="swipe-back-container relative w-full h-full overflow-hidden"
      style={{ position: 'relative' }}
    >
      {showPreviousPage && (
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            transform: `scale(${previousScale})`,
            opacity: previousOpacity,
            transition: isAnimating ? getTransition() : 'none',
            zIndex: 1,
            transformOrigin: 'center center',
          }}
        >
          {previousPage}
        </div>
      )}
      
      <div
        className="relative w-full h-full"
        style={{
          transform: showVisualEffects && (swipeProgress > 0 || isAnimating) ? `translateX(${translateX}px)` : 'none',
          transition: getTransition(),
          zIndex: 2,
          backgroundColor: 'inherit',
        }}
      >
        {showVisualEffects && (swipeProgress > 0 || isAnimating) && (
          <div 
            className="absolute left-0 top-0 bottom-0 pointer-events-none"
            style={{
              width: '20px',
              transform: 'translateX(-100%)',
              background: `linear-gradient(to left, rgba(0,0,0,${shadowOpacity}), transparent)`,
              transition: isAnimating ? getTransition() : 'none',
            }}
          />
        )}
        
        {children}
      </div>
    </div>
  );
};

export default SwipeBackWrapper;
