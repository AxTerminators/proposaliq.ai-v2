import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

/**
 * Unsaved Changes Guard
 * 
 * Prevents users from accidentally losing data by showing a confirmation
 * dialog when they try to navigate away with unsaved changes.
 */

// Hook for tracking unsaved changes
export function useUnsavedChanges(hasChanges = false) {
  const [isDirty, setIsDirty] = React.useState(hasChanges);

  React.useEffect(() => {
    setIsDirty(hasChanges);
  }, [hasChanges]);

  // Warn on browser navigation (back button, refresh, close tab)
  React.useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
      return ''; // Required for some browsers
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return {
    isDirty,
    setIsDirty,
    markClean: () => setIsDirty(false),
    markDirty: () => setIsDirty(true)
  };
}

// Component for in-app navigation warnings
export function UnsavedChangesDialog({ 
  isOpen, 
  onConfirm, 
  onCancel,
  title = "Unsaved Changes",
  description = "You have unsaved changes. Are you sure you want to leave? Your changes will be lost.",
  confirmText = "Leave without saving",
  cancelText = "Stay and save"
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-amber-900">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-700">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Higher-order component that wraps content and guards navigation
export function UnsavedChangesGuard({ 
  hasUnsavedChanges, 
  onNavigate, 
  children 
}) {
  const [showDialog, setShowDialog] = React.useState(false);
  const [pendingNavigation, setPendingNavigation] = React.useState(null);
  const { isDirty } = useUnsavedChanges(hasUnsavedChanges);

  const handleNavigationAttempt = (navigationCallback) => {
    if (isDirty) {
      setPendingNavigation(() => navigationCallback);
      setShowDialog(true);
      return false; // Block navigation
    } else {
      navigationCallback();
      return true; // Allow navigation
    }
  };

  const handleConfirmLeave = () => {
    setShowDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleCancelLeave = () => {
    setShowDialog(false);
    setPendingNavigation(null);
  };

  return (
    <>
      {typeof children === 'function' 
        ? children({ handleNavigationAttempt, isDirty })
        : children
      }
      
      <UnsavedChangesDialog
        isOpen={showDialog}
        onConfirm={handleConfirmLeave}
        onCancel={handleCancelLeave}
      />
    </>
  );
}