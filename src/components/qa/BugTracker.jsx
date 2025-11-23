import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bug, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BugTracker({ organization, bugs, testCases, onRefresh }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Bug Tracker</CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              {bugs.length} total bugs reported
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Report Bug
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-slate-500">
          <Bug className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No bugs reported yet</p>
          <p className="text-xs mt-1">Create QABug entity to start tracking</p>
        </div>
      </CardContent>
    </Card>
  );
}