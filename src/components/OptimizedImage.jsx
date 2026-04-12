"use client";
import React, { useState, useCallback } from "react";

/**
 * OptimizedImage Component
 * Handles responsive image loading with proper sizing and fallbacks
 * - Lazy loads images by default
 * - Shows skeleton loading state
 * - Handles errors gracefully
 * - Maintains aspect ratio
 */
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = "",
  containerClassName = "",
  loading = "lazy",
  quality = 75,
  priority = false,
  objectFit = "contain",
  onLoad,
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const aspectRatioPadding = width && height ? (height / width) * 100 : "auto";

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 rounded-lg ${containerClassName}`}
        style={{ paddingBottom: typeof aspectRatioPadding === "number" ? `${aspectRatioPadding}%` : "auto" }}
      >
        <p className="text-xs text-slate-400">No image</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-red-50 rounded-lg border border-red-100 ${containerClassName}`}
        style={{ paddingBottom: typeof aspectRatioPadding === "number" ? `${aspectRatioPadding}%` : "auto" }}
      >
        <p className="text-xs text-red-500">Image failed to load</p>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg bg-slate-100 ${containerClassName}`}
      style={{ paddingBottom: typeof aspectRatioPadding === "number" ? `${aspectRatioPadding}%` : "auto" }}
    >
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : loading}
        decoding="async"
        className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"} ${className}`}
        style={{ objectFit }}
        onLoad={handleLoad}
        onError={handleError}
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-100 animate-pulse" />
      )}
    </div>
  );
}
