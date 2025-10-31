import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { TrendingUp, DollarSign, Target } from "lucide-react";

export default function ProposalPipeline({ proposals = [] }) {
  // Calculate pipeline stages
  const pipelineData = [
    {
      stage: "Evaluating",
      count: proposals.filter(p => p?.status === 'evaluating').length,
      color: "#3b82f6"
    },
    {
      stage: "Watch List",
      count: proposals.filter(p => p?.status === 'watch_list').length,
      color: "#eab308"
    },
    {
      stage: "In Progress",
      count: proposals.filter(p => p?.status === 'in_progress').length,
      color: "#f59e0b"
    },
    {
      stage: "Submitted",
      count: proposals.filter(p => p?.status === 'submitted').length,
      color: "#8b5cf6"
    },
    {
      stage: "Won",
      count: proposals.filter(p => p?.status === 'won').length,
      color: "#10b981"
    },
    {
      stage: "Lost",
      count: proposals.filter(p => p?.status === 'lost').length,
      color: "#ef4444"
    }
  ];

  const totalActive = proposals.filter(p => 
    p && ['evaluating', 'watch_list', 'in_progress', 'submitted'].includes(p.status)
  ).length;

  const wonCount = proposals.filter(p => p?.status === 'won').length;
  const lostCount = proposals.filter(p => p && ['won', 'lost'].includes(p.status)).length;
  const conversionRate = lostCount > 0 ? (wonCount / lostCount) * 100 : 0;

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Proposal Pipeline
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-500">Active</p>
              <p className="text-lg font-bold text-blue-600">{totalActive}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Conversion</p>
              <p className="text-lg font-bold text-green-600">{conversionRate.toFixed(0)}%</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={pipelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stage" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {pipelineData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">
              {proposals.filter(p => p && ['evaluating', 'watch_list'].includes(p.status)).length}
            </p>
            <p className="text-xs text-slate-600 mt-1">Early Stage</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <p className="text-2xl font-bold text-amber-600">
              {proposals.filter(p => p?.status === 'in_progress').length}
            </p>
            <p className="text-xs text-slate-600 mt-1">In Progress</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">
              {proposals.filter(p => p?.status === 'submitted').length}
            </p>
            <p className="text-xs text-slate-600 mt-1">Awaiting Decision</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}