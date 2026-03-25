import { useState, useRef, startTransition } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const TOUCH_ANIM_MS = 380;
const MOUSE_ANIM_MS = 150;

const OriginButton = ({ children, onClick, className, circleColor = "rgba(148,163,184,0.18)", style, type = "button", "aria-label": ariaLabel }) => {
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const scale = useMotionValue(0);
  const smoothScale = useSpring(scale, { stiffness: 85, damping: 18, restDelta: 0.001 });
  const touchTimer = useRef(null);
  const fromTouch = useRef(false);

  const getPos = (clientX, clientY) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    startTransition(() => setCursorPos({ x: clientX - rect.left, y: clientY - rect.top }));
  };

  const handleMouseEnter = (e) => {
    if (fromTouch.current) return;
    getPos(e.clientX, e.clientY);
    scale.set(1);
  };

  const handleMouseLeave = (e) => {
    if (fromTouch.current) return;
    getPos(e.clientX, e.clientY);
    scale.set(0);
  };

  const handleTouchStart = (e) => {
    fromTouch.current = true;
    const touch = e.touches[0];
    getPos(touch.clientX, touch.clientY);
    scale.set(1);
    clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => {
      scale.set(0);
      fromTouch.current = false;
    }, TOUCH_ANIM_MS);
  };

  const handleClick = (e) => {
    if (!onClick) return;
    if (fromTouch.current) {
      const remaining = TOUCH_ANIM_MS;
      setTimeout(() => onClick(e), remaining);
    } else {
      setTimeout(() => {
        scale.set(0);
        onClick(e);
      }, MOUSE_ANIM_MS);
    }
  };

  return (
    <button
      ref={containerRef}
      type={type}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      className={className}
      style={{ ...style, position: "relative", overflow: "hidden" }}
      aria-label={ariaLabel}
    >
      <motion.span
        style={{
          position: "absolute",
          left: cursorPos.x,
          top: cursorPos.y,
          width: 500,
          height: 500,
          borderRadius: "50%",
          backgroundColor: circleColor,
          scale: smoothScale,
          x: "-50%",
          y: "-50%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <span style={{ position: "relative", zIndex: 1, display: "contents" }}>{children}</span>
    </button>
  );
};

export default OriginButton;
