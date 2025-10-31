import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, XCircle, Info, WifiOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorAlert({ error, onRetry, className }) {
  const getErrorDetails = (error) => {
    // Network errors
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
      return {
        icon: WifiOff,
        title: "Connection Problem",
        message: "Unable to connect to the server. Please check your internet connection and try again.",
        color: "amber"
      };
    }

    // Timeout errors
    if (error?.message?.includes('timeout') || error?.code === 'ETIMEDOUT') {
      return {
        icon: Clock,
        title: "Request Timeout",
        message: "The request took too long to complete. This might be due to a slow connection or server load. Please try again.",
        color: "amber"
      };
    }

    // Authentication errors
    if (error?.status === 401 || error?.message?.includes('Unauthorized')) {
      return {
        icon: XCircle,
        title: "Authentication Required",
        message: "Your session may have expired. Please refresh the page or log in again.",
        color: "red"
      };
    }

    // Permission errors
    if (error?.status === 403 || error?.message?.includes('Forbidden')) {
      return {
        icon: AlertTriangle,
        title: "Access Denied",
        message: "You don't have permission to perform this action. Please contact your administrator.",
        color: "red"
      };
    }

    // Not found errors
    if (error?.status === 404) {
      return {
        icon: Info,
        title: "Not Found",
        message: "The requested resource could not be found. It may have been deleted or moved.",
        color: "amber"
      };
    }

    // Server errors
    if (error?.status >= 500) {
      return {
        icon: AlertTriangle,
        title: "Server Error",
        message: "We're experiencing technical difficulties. Our team has been notified. Please try again in a few moments.",
        color: "red"
      };
    }

    // AI/Integration specific errors
    if (error?.message?.includes('AI') || error?.message?.includes('LLM')) {
      return {
        icon: AlertTriangle,
        title: "AI Service Error",
        message: "The AI service encountered an issue. This could be temporary. Please try again or contact support if the problem persists.",
        color: "amber"
      };
    }

    // Token/credit errors
    if (error?.message?.includes('token') || error?.message?.includes('credit')) {
      return {
        icon: AlertTriangle,
        title: "Insufficient Credits",
        message: "You've reached your token credit limit. Please upgrade your plan or contact support.",
        color: "amber"
      };
    }

    // Generic error
    return {
      icon: AlertTriangle,
      title: "Something Went Wrong",
      message: error?.message || "An unexpected error occurred. Please try again or contact support if the issue persists.",
      color: "red"
    };
  };

  const details = getErrorDetails(error);
  const Icon = details.icon;
  
  const colorClasses = {
    red: "bg-red-50 border-red-200",
    amber: "bg-amber-50 border-amber-200",
    blue: "bg-blue-50 border-blue-200"
  };

  const iconColorClasses = {
    red: "text-red-600",
    amber: "text-amber-600",
    blue: "text-blue-600"
  };

  const textColorClasses = {
    red: "text-red-900",
    amber: "text-amber-900",
    blue: "text-blue-900"
  };

  return (
    <Alert className={`${colorClasses[details.color]} ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 ${iconColorClasses[details.color]} flex-shrink-0`} />
        <div className="flex-1">
          <AlertDescription>
            <p className={`font-semibold ${textColorClasses[details.color]} mb-1`}>
              {details.title}
            </p>
            <p className={`text-sm ${textColorClasses[details.color]}`}>
              {details.message}
            </p>
          </AlertDescription>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-3"
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}

export default ErrorAlert;