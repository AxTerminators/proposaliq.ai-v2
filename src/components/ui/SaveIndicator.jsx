import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import moment from "moment";
import { cn } from "@/lib/utils";

/**
 * Reusable save status indicator component
 * 
 * Usage:
 * <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} error={saveError} />
 */
export default function SaveIndicator({ isSaving = false, lastSaved = null, error = null }) {
  if (error) {
    return (
      <Badge variant="outline" className="border-red-300 text-red-700">
        <AlertCircle className="w-3 h-3 mr-1" />
        Save Failed
      </Badge>
    );
  }

  if (isSaving) {
    return (
      <Badge variant="outline" className="border-blue-300 text-blue-700">
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        Saving...
      </Badge>
    );
  }

  if (lastSaved) {
    return (
      <Badge variant="outline" className="border-green-300 text-green-700">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Saved {moment(lastSaved).fromNow()}
      </Badge>
    );
  }

  return null;
}