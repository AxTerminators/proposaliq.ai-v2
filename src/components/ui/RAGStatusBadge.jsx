import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Displays RAG ingestion status for documents
 * Shows whether a document is ready for AI-powered retrieval
 */
export default function RAGStatusBadge({ ragStatus, ragIngested, className }) {
  // Determine status
  const status = ragStatus || (ragIngested ? 'completed' : 'pending');

  const statusConfig = {
    pending: {
      icon: Clock,
      label: "Pending AI",
      color: "bg-slate-100 text-slate-600",
      iconColor: "text-slate-500"
    },
    processing: {
      icon: Loader2,
      label: "Processing...",
      color: "bg-blue-100 text-blue-700",
      iconColor: "text-blue-600",
      animate: true
    },
    completed: {
      icon: CheckCircle2,
      label: "✓ AI Ready",
      color: "bg-green-100 text-green-700",
      iconColor: "text-green-600"
    },
    failed: {
      icon: AlertCircle,
      label: "Failed",
      color: "bg-red-100 text-red-700",
      iconColor: "text-red-600"
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge className={cn(config.color, "gap-1", className)}>
      <Icon className={cn("w-3 h-3", config.iconColor, config.animate && "animate-spin")} />
      {config.label}
    </Badge>
  );
}