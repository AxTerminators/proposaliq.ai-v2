import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, FileText, Brain, Database } from "lucide-react";

export function LoadingSpinner({ size = "default", className = "" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    default: "w-8 h-8",
    lg: "w-12 h-12"
  };

  return (
    <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600 ${className}`} />
  );
}

export function LoadingCard({ message = "Loading...", icon: Icon = Loader2 }) {
  return (
    <Card className="border-none shadow-xl">
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Icon className="w-12 h-12 text-blue-600 animate-pulse" />
          <p className="text-slate-600 font-medium">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function LoadingOverlay({ message = "Processing..." }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="border-none shadow-2xl max-w-md">
        <CardContent className="p-8">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
            <p className="text-slate-900 font-semibold text-lg">{message}</p>
            <p className="text-slate-500 text-sm text-center">
              This may take a few moments. Please don't close this window.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AILoadingState({ message = "AI is thinking...", subMessage }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
      <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
      <div className="flex-1">
        <p className="font-medium text-indigo-900">{message}</p>
        {subMessage && (
          <p className="text-sm text-indigo-600 mt-1">{subMessage}</p>
        )}
      </div>
      <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
    </div>
  );
}

export function SkeletonLoader({ lines = 3, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded" style={{ width: `${Math.random() * 30 + 70}%` }} />
        </div>
      ))}
    </div>
  );
}

export function TableSkeletonLoader({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 animate-pulse">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1 h-12 bg-slate-200 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function LoadingStateWithProgress({ message, progress, subMessage }) {
  return (
    <Card className="border-none shadow-xl">
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-slate-900 font-semibold text-lg">{message}</p>
          
          {progress !== undefined && (
            <div className="w-full space-y-2">
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-slate-600">{progress}% Complete</p>
            </div>
          )}
          
          {subMessage && (
            <p className="text-slate-500 text-sm text-center">{subMessage}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function DataFetchingState({ type = "generic" }) {
  const configs = {
    generic: { icon: Database, message: "Loading data..." },
    proposals: { icon: FileText, message: "Loading proposals..." },
    sections: { icon: FileText, message: "Loading sections..." },
    ai: { icon: Brain, message: "Preparing AI..." },
    analysis: { icon: Sparkles, message: "Analyzing data..." }
  };

  const config = configs[type] || configs.generic;
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center space-y-3">
        <Icon className="w-10 h-10 text-blue-600 animate-pulse" />
        <p className="text-slate-600">{config.message}</p>
      </div>
    </div>
  );
}

export default LoadingSpinner;