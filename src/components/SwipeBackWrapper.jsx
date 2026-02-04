import { useRef, useState, useCallback, useEffect } from 'react';

const SwipeBackWrapper = ({ children, onBack, enabled = true }) => {
  const containerRef = useRef(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  const startedFromEdge = useRef(false);

  const edgeThreshold = 25;
  const minSwipeDistance = 100;
  const maxVerticalDistance = 80;

  const handleTouchStart = useCallback((e) => {
    if (!enabled || isAnimating) return;
    
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    
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
    
    if (deltaX > 0) {
      const progress = Math.min(deltaX / minSwipeDistance, 1);
      setSwipeProgress(progress);
    }
  }, [enabled, isAnimating]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !startedFromEdge.current || isAnimating) {
      setSwipeProgress(0);
      return;
    }
    
    if (swipeProgress >= 0.5 && onBack) {
      setIsAnimating(true);
      setSwipeProgress(1);
      
      setTimeout(() => {
        onBack();
        setSwipeProgress(0);
        setIsAnimating(false);
      }, 200);
    } else {
      setSwipeProgress(0);
    }
    
    isSwiping.current = false;
    startedFromEdge.current = false;
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

  const translateX = swipeProgress * 100;
  const opacity = 1 - (swipeProgress * 0.3);

  return (
    <div 
      ref={containerRef}
      className="swipe-back-container relative w-full h-full"
      style={{
        transform: swipeProgress > 0 ? `translateX(${translateX}px)` : 'none',
        opacity: opacity,
        transition: isAnimating ? 'transform 0.2s ease-out, opacity 0.2s ease-out' : 'none',
      }}
    >
      {swipeProgress > 0 && (
        <div 
          className="fixed left-0 top-0 bottom-0 w-1 pointer-events-none z-50"
          style={{
            background: `linear-gradient(to right, rgba(0,0,0,${swipeProgress * 0.15}), transparent)`,
            width: `${swipeProgress * 20}px`,
          }}
        />
      )}
      
      {swipeProgress > 0.2 && (
        <div 
          className="fixed left-2 top-1/2 -translate-y-1/2 pointer-events-none z-50 transition-opacity"
          style={{ opacity: Math.min((swipeProgress - 0.2) * 2, 1) }}
        >
          <div className="w-8 h-8 rounded-full bg-slate-200/80 flex items-center justify-center">
            <svg 
              className="w-4 h-4 text-slate-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        </div>
      )}
      
      {children}
    </div>
  );
};

export default SwipeBackWrapper;
