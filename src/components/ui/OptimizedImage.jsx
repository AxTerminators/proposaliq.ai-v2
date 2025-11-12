import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Optimized Image Component
 * Implements lazy loading and responsive image sizing
 * Automatically shows loading state and fallback
 */
export default function OptimizedImage({
  src,
  alt,
  thumbnailSrc,
  mediumSrc,
  className,
  containerClassName,
  fallbackIcon,
  aspectRatio = "auto",
  priority = false, // If true, loads immediately (for above-fold images)
  onLoad,
  onError,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
      }
    );

    observer.observe(imgRef.current);

    return () => {
      if (observer) observer.disconnect();
    };
  }, [priority]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleError = (e) => {
    setHasError(true);
    if (onError) onError(e);
  };

  // Build srcset for responsive images
  const buildSrcSet = () => {
    const srcset = [];
    if (thumbnailSrc) srcset.push(`${thumbnailSrc} 400w`);
    if (mediumSrc) srcset.push(`${mediumSrc} 800w`);
    if (src) srcset.push(`${src} 1920w`);
    return srcset.length > 0 ? srcset.join(', ') : undefined;
  };

  const srcSet = buildSrcSet();

  return (
    <div 
      ref={imgRef}
      className={cn("relative overflow-hidden", containerClassName)}
      style={aspectRatio !== "auto" ? { aspectRatio } : undefined}
    >
      {/* Loading Skeleton */}
      {!isLoaded && !hasError && (
        <Skeleton className={cn("absolute inset-0", className)} />
      )}

      {/* Error Fallback */}
      {hasError && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400",
          className
        )}>
          {fallbackIcon || (
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs">Image unavailable</p>
            </div>
          )}
        </div>
      )}

      {/* Actual Image */}
      {isInView && (
        <img
          src={src}
          srcSet={srcSet}
          sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1920px"
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
    </div>
  );
}