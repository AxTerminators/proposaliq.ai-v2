import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingDown, 
  TrendingUp, 
  Focus, 
  Clock, 
  AlertCircle, 
  Lightbulb,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart } from "recharts";

export default function TimeDebtTracker({ organization, user }) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(moment());
  const [viewMode, setViewMode] = useState('week'); // week or month

  const { data: trackingData = [] } = useQuery({
    queryKey: ['time-debt-tracking', organization?.id, user?.email, selectedDate.format('YYYY-MM')],
    queryFn: async () => {
      if (!organization?.id || !user?.email) return [];
      
      const startDate = moment(selectedDate).startOf(viewMode).format('YYYY-MM-DD');
      const endDate = moment(selectedDate).endOf(viewMode).format('YYYY-MM-DD');
      
      return base44.entities.TimeDebtTracking.filter({
        organization_id: organization.id,
        user_email: user.email,
        date: { $gte: startDate, $lte: endDate }
      }, 'date');
    },
    enabled: !!organization?.id && !!user?.email,
  });

  const { data: calendarEvents = [] } = useQuery({
    queryKey: ['focus-blocks', organization?.id, user?.email],
    queryFn: async () => {
      if (!organization?.id || !user?.email) return [];
      return base44.entities.CalendarEvent.filter({
        organization_id: organization.id,
        created_by_email: user.email,
        event_type: 'time_block'
      });
    },
    enabled: !!organization?.id && !!user?.email,
  });

  // Calculate aggregate metrics
  const totalPlannedHours = trackingData.reduce((sum, d) => sum + (d.planned_focus_hours || 0), 0);
  const totalActualHours = trackingData.reduce((sum, d) => sum + (d.actual_focus_hours || 0), 0);
  const totalDebt = totalPlannedHours - totalActualHours;
  const achievementRate = totalPlannedHours > 0 ? (totalActualHours / totalPlannedHours * 100) : 0;

  // Prepare chart data
  const chartData = trackingData.map(d => ({
    date: moment(d.date).format('MMM D'),
    planned: d.planned_focus_hours || 0,
    actual: d.actual_focus_hours || 0,
    productivity: d.productivity_score || 0
  }));

  // Identify productivity patterns
  const productivityByHour = Array.from({ length: 24 }, (_, hour) => {
    const relevantData = trackingData.filter(d => 
      d.most_productive_hours?.includes(hour)
    );
    return {
      hour,
      frequency: relevantData.length,
      avgProductivity: relevantData.length > 0 
        ? relevantData.reduce((sum, d) => sum + (d.productivity_score || 0), 0) / relevantData.length
        : 0
    };
  });

  const peakHours = productivityByHour
    .filter(h => h.frequency > 0)
    .sort((a, b) => b.avgProductivity - a.avgProductivity)
    .slice(0, 3);

  const navigate = (direction) => {
    if (direction === 'prev') {
      setSelectedDate(moment(selectedDate).subtract(1, viewMode));
    } else {
      setSelectedDate(moment(selectedDate).add(1, viewMode));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Time Debt & Focus Tracking</h3>
          <p className="text-sm text-slate-600">Analyze your focus time performance and productivity patterns</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium">
            {selectedDate.format(viewMode === 'week' ? '[Week of] MMM D' : 'MMMM YYYY')}
          </span>
          <Button size="sm" variant="outline" onClick={() => navigate('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <Badge variant="secondary">{viewMode}</Badge>
            </div>
            <div className="text-2xl font-bold text-slate-900">{totalPlannedHours.toFixed(1)}h</div>
            <div className="text-xs text-slate-600">Planned Focus Time</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Focus className="w-5 h-5 text-green-600" />
              <Badge variant="secondary">{achievementRate.toFixed(0)}%</Badge>
            </div>
            <div className="text-2xl font-bold text-slate-900">{totalActualHours.toFixed(1)}h</div>
            <div className="text-xs text-slate-600">Actual Focus Time</div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-none shadow-md",
          totalDebt > 0 ? "bg-red-50" : "bg-green-50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              {totalDebt > 0 ? (
                <TrendingDown className="w-5 h-5 text-red-600" />
              ) : (
                <TrendingUp className="w-5 h-5 text-green-600" />
              )}
              <Badge variant={totalDebt > 0 ? "destructive" : "default"}>
                {totalDebt > 0 ? 'Debt' : 'Surplus'}
              </Badge>
            </div>
            <div className={cn(
              "text-2xl font-bold",
              totalDebt > 0 ? "text-red-600" : "text-green-600"
            )}>
              {Math.abs(totalDebt).toFixed(1)}h
            </div>
            <div className="text-xs text-slate-600">Time Debt</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {trackingData.length > 0 
                ? (trackingData.reduce((sum, d) => sum + (d.productivity_score || 0), 0) / trackingData.length).toFixed(0)
                : 0}
            </div>
            <div className="text-xs text-slate-600">Avg Productivity Score</div>
          </CardContent>
        </Card>
      </div>

      {/* Focus vs Actual Chart */}
      {chartData.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm">Focus Time: Planned vs Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="planned" fill="#94a3b8" name="Planned" />
                <Bar dataKey="actual" fill="#3b82f6" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Productivity Trend */}
      {chartData.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm">Productivity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="productivity" stroke="#8b5cf6" strokeWidth={2} name="Productivity" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Peak Productivity Hours */}
      {peakHours.length > 0 && (
        <Card className="border-none shadow-lg bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Your Peak Productivity Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {peakHours.map((hourData, index) => (
              <div key={hourData.hour} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">
                      {moment().hour(hourData.hour).format('h:00 A')} - {moment().hour(hourData.hour + 1).format('h:00 A')}
                    </div>
                    <div className="text-xs text-slate-600">
                      Most productive {hourData.frequency} time{hourData.frequency > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <Badge className="bg-purple-600">
                  {hourData.avgProductivity.toFixed(0)}% avg
                </Badge>
              </div>
            ))}
            <div className="mt-4 p-3 bg-white rounded-lg border-2 border-purple-300">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5" />
                <div className="text-sm text-slate-700">
                  <strong>AI Recommendation:</strong> Try blocking these hours for your most important deep work tasks. 
                  Your data shows you're {peakHours[0]?.avgProductivity.toFixed(0)}% more productive during these periods.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {trackingData.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <Focus className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Time Tracking Data Yet</h3>
            <p className="text-sm text-slate-600 mb-4">
              Start blocking focus time on your calendar to begin tracking your productivity patterns
            </p>
            <p className="text-xs text-slate-500">
              Time debt tracking automatically monitors time blocks marked with 🔒 emoji
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}