import { useEffect } from "react";

/**
 * Reusable hook to warn users about unsaved changes
 * 
 * Usage:
 * useUnsavedChangesWarning(hasUnsavedChanges);
 */
export function useUnsavedChangesWarning(hasUnsavedChanges) {
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
}

/**
 * Helper to show confirmation dialog before navigation
 * 
 * Usage:
 * if (!confirmNavigation(hasUnsavedChanges)) return;
 */
export function confirmNavigation(hasUnsavedChanges) {
  if (!hasUnsavedChanges) return true;
  return window.confirm('You have unsaved changes. Leave anyway?');
}