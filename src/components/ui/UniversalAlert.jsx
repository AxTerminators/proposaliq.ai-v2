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
import { AlertCircle, CheckCircle2, Info, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Universal Alert Component - Use this for all popup messages across the app
 * 
 * Types:
 * - success: Green theme with checkmark
 * - error: Red theme with X circle
 * - warning: Amber theme with alert triangle
 * - info: Blue theme with info icon
 * 
 * Usage:
 * <UniversalAlert
 *   isOpen={showAlert}
 *   onClose={() => setShowAlert(false)}
 *   type="success"
 *   title="Success!"
 *   description="Your action completed successfully."
 *   confirmText="Got it"
 * />
 */
export default function UniversalAlert({
  isOpen,
  onClose,
  type = "info",
  title,
  description,
  confirmText = "OK",
  cancelText,
  onConfirm,
  onCancel,
  children,
  showIcon = true,
}) {
  const themes = {
    success: {
      icon: CheckCircle2,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      buttonClass: "bg-green-600 hover:bg-green-700",
    },
    error: {
      icon: XCircle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      buttonClass: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      icon: AlertTriangle,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      buttonClass: "bg-amber-600 hover:bg-amber-700",
    },
    info: {
      icon: Info,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      buttonClass: "bg-blue-600 hover:bg-blue-700",
    },
  };

  const theme = themes[type] || themes.info;
  const Icon = theme.icon;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4 mb-2">
            {showIcon && (
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", theme.iconBg)}>
                <Icon className={cn("w-6 h-6", theme.iconColor)} />
              </div>
            )}
            <div className="flex-1">
              <AlertDialogTitle className="text-xl mb-2">{title}</AlertDialogTitle>
              <AlertDialogDescription className="text-base text-slate-700">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
          {children && <div className="mt-4">{children}</div>}
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          {cancelText && (
            <AlertDialogCancel onClick={handleCancel}>
              {cancelText}
            </AlertDialogCancel>
          )}
          <AlertDialogAction onClick={handleConfirm} className={cn("w-full", theme.buttonClass)}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}