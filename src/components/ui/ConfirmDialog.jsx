import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default", // default, danger, success, warning
  icon = null,
  children,
  confirmButtonClass = "",
  isLoading = false
}) {
  const getIcon = () => {
    if (icon) return icon;
    
    switch (variant) {
      case 'danger':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getConfirmButtonStyle = () => {
    if (confirmButtonClass) return confirmButtonClass;
    
    switch (variant) {
      case 'danger':
        return "bg-red-600 hover:bg-red-700";
      case 'success':
        return "bg-green-600 hover:bg-green-700";
      case 'warning':
        return "bg-amber-600 hover:bg-amber-700";
      default:
        return "bg-blue-600 hover:bg-blue-700";
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getIcon()}
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription>
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        
        {children && (
          <div className="py-4">
            {children}
          </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className={cn(getConfirmButtonStyle())}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}