import React from "react";
import { Loader2, Sparkles, Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function LoadingState({ message = "Loading..." }) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md border-none shadow-xl">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function AILoadingState({ message = "AI is processing..." }) {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-6">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <Sparkles className="w-16 h-16 text-purple-600 animate-pulse" />
          <div className="absolute inset-0 animate-spin">
            <Loader2 className="w-16 h-16 text-purple-400 opacity-50" />
          </div>
        </div>
        <p className="text-slate-600 font-medium">{message}</p>
      </div>
    </div>
  );
}

export function DataFetchingState({ message = "Fetching data..." }) {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-6">
      <div className="text-center">
        <Database className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
        <p className="text-slate-600">{message}</p>
      </div>
    </div>
  );
}