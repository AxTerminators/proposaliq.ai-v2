import React from "react";
import { createRoot } from "react-dom/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Info, XCircle } from "lucide-react";

const NotificationDialog = ({ message, type = "info", onClose }) => {
  const [open, setOpen] = React.useState(true);

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      onClose();
    }, 150);
  };

  const iconMap = {
    success: <CheckCircle2 className="w-6 h-6 text-green-600" />,
    error: <XCircle className="w-6 h-6 text-red-600" />,
    warning: <AlertCircle className="w-6 h-6 text-amber-600" />,
    info: <Info className="w-6 h-6 text-blue-600" />
  };

  const colorMap = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-amber-50 border-amber-200",
    info: "bg-blue-50 border-blue-200"
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {iconMap[type]}
            <span>Notification</span>
          </DialogTitle>
        </DialogHeader>
        <div className={`p-4 rounded-lg border ${colorMap[type]}`}>
          <p className="text-slate-900">{message}</p>
        </div>
        <DialogFooter>
          <Button onClick={handleClose} className="w-full">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const showNotification = (message, type = "info") => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const cleanup = () => {
    root.unmount();
    document.body.removeChild(container);
  };

  root.render(<NotificationDialog message={message} type={type} onClose={cleanup} />);
};

// Convenience methods
export const showSuccess = (message) => showNotification(message, "success");
export const showError = (message) => showNotification(message, "error");
export const showWarning = (message) => showNotification(message, "warning");
export const showInfo = (message) => showNotification(message, "info");