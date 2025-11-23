import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";

export default function TestExecutionPanel({ organization, testCases, onRefresh }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Execute Tests</CardTitle>
        <p className="text-sm text-slate-600">
          Run tests and record results
        </p>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-slate-500">
          <PlayCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No tests ready to execute</p>
          <p className="text-xs mt-1">Create test cases first</p>
        </div>
      </CardContent>
    </Card>
  );
}