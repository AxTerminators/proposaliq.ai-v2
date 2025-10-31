import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";

export default function RevenueChart({ proposals = [] }) {
  // Calculate monthly revenue data
  const monthlyData = [];
  const currentDate = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthKey = date.toLocaleString('default', { month: 'short' });
    
    const monthProposals = proposals.filter(p => {
      if (!p || !p.updated_date) return false;
      const pDate = new Date(p.updated_date);
      return pDate.getMonth() === date.getMonth() && 
             pDate.getFullYear() === date.getFullYear();
    });

    // Calculate won and submitted values (in thousands)
    const wonValue = monthProposals
      .filter(p => p?.status === 'won' && p.contract_value)
      .reduce((sum, p) => sum + (p.contract_value || 0), 0) / 1000;

    const submittedValue = monthProposals
      .filter(p => p?.status === 'submitted' && p.estimated_value)
      .reduce((sum, p) => sum + (p.estimated_value || 0), 0) / 1000;

    const pipelineValue = monthProposals
      .filter(p => p && ['in_progress', 'draft'].includes(p.status) && p.estimated_value)
      .reduce((sum, p) => sum + (p.estimated_value || 0), 0) / 1000;

    monthlyData.push({
      month: monthKey,
      won: Math.round(wonValue),
      submitted: Math.round(submittedValue),
      pipeline: Math.round(pipelineValue)
    });
  }

  // Calculate totals and trends
  const totalWon = monthlyData.reduce((sum, m) => sum + (m.won || 0), 0);
  const totalSubmitted = monthlyData.reduce((sum, m) => sum + (m.submitted || 0), 0);
  const totalPipeline = monthlyData.reduce((sum, m) => sum + (m.pipeline || 0), 0);

  const lastMonth = monthlyData[monthlyData.length - 1]?.won || 0;
  const previousMonth = monthlyData[monthlyData.length - 2]?.won || 0;
  const trend = previousMonth > 0 ? ((lastMonth - previousMonth) / previousMonth * 100) : 0;

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Revenue Tracking
          </CardTitle>
          <div className="flex items-center gap-3">
            {trend !== 0 && (
              <Badge variant={trend > 0 ? "default" : "destructive"} className="gap-1">
                {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(trend).toFixed(0)}% MoM
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorSubmitted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPipeline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip 
              formatter={(value) => `$${value}k`}
              labelStyle={{ color: '#1e293b' }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="won" 
              stroke="#10b981" 
              fillOpacity={1} 
              fill="url(#colorWon)"
              name="Won"
            />
            <Area 
              type="monotone" 
              dataKey="submitted" 
              stroke="#8b5cf6" 
              fillOpacity={1} 
              fill="url(#colorSubmitted)"
              name="Submitted"
            />
            <Area 
              type="monotone" 
              dataKey="pipeline" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorPipeline)"
              name="Pipeline"
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              ${totalWon}k
            </p>
            <p className="text-xs text-slate-600 mt-1">Won (6 months)</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">
              ${totalSubmitted}k
            </p>
            <p className="text-xs text-slate-600 mt-1">Submitted</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">
              ${totalPipeline}k
            </p>
            <p className="text-xs text-slate-600 mt-1">Pipeline</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}