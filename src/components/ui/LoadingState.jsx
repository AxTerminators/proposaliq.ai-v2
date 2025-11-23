import React from "react";
import { Loader2 } from "lucide-react";
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