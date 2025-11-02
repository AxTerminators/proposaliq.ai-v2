
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
import moment from 'moment';

export default function RevenueChart({ proposals = [] }) {
  // Defensive check to ensure we have an array
  const safeProposals = Array.isArray(proposals) ? proposals : [];

  const monthlyData = React.useMemo(() => {
    const dataMap = {};
    const currentDate = moment();

    // Initialize data for the last 6 months to ensure all months are present, even if no data
    for (let i = 5; i >= 0; i--) {
      const monthMoment = currentDate.clone().subtract(i, 'months').startOf('month');
      const monthKey = monthMoment.format('YYYY-MM'); // Use YYYY-MM for consistent mapping and sorting
      dataMap[monthKey] = {
        month: monthMoment.format('MMM'), // Short month name for chart display (e.g., Jan)
        won: 0,
        submitted: 0,
        pipeline: 0,
        _sortKey: monthMoment.valueOf() // For chronological sorting
      };
    }

    safeProposals.forEach(p => {
      let targetMonthKey = null;
      let targetValue = 0;
      let targetField = null;

      // For 'won' proposals, use created_date and contract_value as suggested by the outline
      if (p?.status === 'won' && p.created_date && p.contract_value != null) {
        const proposalDate = moment(p.created_date);
        targetMonthKey = proposalDate.format('YYYY-MM');
        targetValue = p.contract_value;
        targetField = 'won';
      }
      // For 'submitted' proposals, retain original logic using updated_date and estimated_value
      else if (p?.status === 'submitted' && p.updated_date && p.estimated_value != null) {
        const proposalDate = moment(p.updated_date);
        targetMonthKey = proposalDate.format('YYYY-MM');
        targetValue = p.estimated_value;
        targetField = 'submitted';
      }
      // For 'pipeline' proposals, retain original logic using updated_date and estimated_value
      else if (p && ['in_progress', 'draft'].includes(p.status) && p.updated_date && p.estimated_value != null) {
        const proposalDate = moment(p.updated_date);
        targetMonthKey = proposalDate.format('YYYY-MM');
        targetValue = p.estimated_value;
        targetField = 'pipeline';
      }

      // Aggregate value if the month key exists in our initialized dataMap (i.e., it's within the last 6 months)
      if (targetMonthKey && targetField && dataMap[targetMonthKey]) {
        dataMap[targetMonthKey][targetField] += targetValue;
      }
    });

    // Convert aggregated values to thousands and round them
    const result = Object.values(dataMap).map(item => ({
      month: item.month,
      won: Math.round(item.won / 1000),
      submitted: Math.round(item.submitted / 1000),
      pipeline: Math.round(item.pipeline / 1000),
      _sortKey: item._sortKey
    }));

    // Sort the months chronologically
    return result.sort((a, b) => a._sortKey - b._sortKey);
  }, [safeProposals]);

  // Calculate totals and trends based on the new monthlyData
  const totalWon = monthlyData.reduce((sum, m) => sum + (m.won || 0), 0);
  const totalSubmitted = monthlyData.reduce((sum, m) => sum + (m.submitted || 0), 0);
  const totalPipeline = monthlyData.reduce((sum, m) => sum + (m.pipeline || 0), 0);

  const lastMonth = monthlyData[monthlyData.length - 1]?.won || 0;
  const previousMonth = monthlyData[monthlyData.length - 2]?.won || 0;
  // Calculate trend, handling division by zero appropriately
  const trend = previousMonth !== 0 ? ((lastMonth - previousMonth) / previousMonth * 100) : (lastMonth > 0 ? 100 : 0);

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
