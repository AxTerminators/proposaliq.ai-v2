import React from "react";
import { cn } from "@/lib/utils";

/**
 * Mobile-optimized container component
 * Provides consistent padding and max-width for mobile devices
 */
export function MobileContainer({ children, className }) {
  return (
    <div className={cn("px-4 py-6 md:px-6 lg:px-8 max-w-7xl mx-auto", className)}>
      {children}
    </div>
  );
}

/**
 * Mobile-optimized card grid
 * Adjusts columns based on screen size
 */
export function MobileGrid({ children, className, cols = "1" }) {
  const colClasses = {
    "1": "grid-cols-1",
    "2": "grid-cols-1 sm:grid-cols-2",
    "3": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    "4": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
  };

  return (
    <div className={cn("grid gap-4 md:gap-6", colClasses[cols] || colClasses["2"], className)}>
      {children}
    </div>
  );
}

/**
 * Mobile-optimized stack
 * Vertical on mobile, horizontal on desktop
 */
export function MobileStack({ children, className }) {
  return (
    <div className={cn("flex flex-col md:flex-row gap-4 md:gap-6", className)}>
      {children}
    </div>
  );
}

/**
 * Mobile touch-friendly button wrapper
 * Ensures minimum touch target size (44x44px per iOS guidelines)
 */
export function TouchTarget({ children, className }) {
  return (
    <div className={cn("min-h-[44px] min-w-[44px] flex items-center justify-center", className)}>
      {children}
    </div>
  );
}

/**
 * Mobile-optimized section with proper spacing
 */
export function MobileSection({ title, description, children, actions, className }) {
  return (
    <section className={cn("space-y-4 md:space-y-6", className)}>
      {(title || description || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            {title && <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h2>}
            {description && <p className="text-sm md:text-base text-slate-600 mt-1">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Mobile bottom sheet wrapper
 * Better UX than full-screen dialogs on mobile
 */
export function MobileSheet({ isOpen, onClose, children, title }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>
        
        {/* Title */}
        {title && (
          <div className="px-6 pb-4 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
        )}
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Responsive table wrapper
 * Becomes horizontally scrollable on mobile
 */
export function MobileTable({ children, className }) {
  return (
    <div className="w-full overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className={cn("min-w-[640px] md:min-w-full", className)}>
        {children}
      </div>
    </div>
  );
}

/**
 * Mobile-optimized form field
 * Larger touch targets, better spacing
 */
export function MobileFormField({ label, children, description, error, required }) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm md:text-base font-medium text-slate-900">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}
      {description && (
        <p className="text-xs md:text-sm text-slate-600">{description}</p>
      )}
      <div className="[&_input]:min-h-[44px] [&_textarea]:min-h-[44px] [&_button]:min-h-[44px]">
        {children}
      </div>
      {error && (
        <p className="text-xs md:text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

/**
 * Mobile-optimized tabs
 * Horizontal scroll on mobile if too many tabs
 */
export function MobileTabs({ children, className }) {
  return (
    <div className="w-full overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className={cn("min-w-max md:w-full", className)}>
        {children}
      </div>
    </div>
  );
}