import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, AtSign } from "lucide-react";

export default function MentionHelper({ className = "" }) {
  return (
    <Card className={`border-blue-200 bg-blue-50 ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-xs text-blue-900">
            <p className="font-semibold mb-1 flex items-center gap-1">
              <AtSign className="w-3 h-3" />
              Mention team members to notify them
            </p>
            <p className="text-blue-700 mb-2">
              Type <Badge variant="secondary" className="text-[10px] h-4 px-1 mx-1">@</Badge> 
              followed by their email address:
            </p>
            <div className="bg-white rounded border border-blue-200 p-2 font-mono text-[10px]">
              <span className="text-blue-600">@john.doe@company.com</span> can you review this section?
            </div>
            <p className="text-blue-700 mt-2">
              They'll receive an instant notification and can jump directly to your comment.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}