import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, TrendingUp, Target, AlertTriangle, Sparkles } from "lucide-react";
import moment from "moment";
import { cn } from "@/lib/utils";

export default function DataCallTimePrediction({ dataCall, organization }) {
  // Fetch historical data for prediction
  const { data: prediction } = useQuery({
    queryKey: ['data-call-prediction', dataCall?.id, organization?.id],
    queryFn: async () => {
      if (!dataCall?.id || !organization?.id) return null;

      // Get similar completed data calls
      const historicalCalls = await base44.entities.DataCallRequest.filter({
        organization_id: organization.id,
        overall_status: 'completed',
        recipient_type: dataCall.recipient_type
      });

      if (historicalCalls.length === 0) {
        return {
          predicted_days: 7,
          confidence: 'low',
          basis: 'default_estimate',
          message: 'No historical data available. Using default estimate.'
        };
      }

      // Calculate average completion time
      const completionTimes = historicalCalls
        .filter(dc => dc.sent_date && dc.completed_date)
        .map(dc => {
          const sent = new Date(dc.sent_date);
          const completed = new Date(dc.completed_date);
          return Math.floor((completed - sent) / (1000 * 60 * 60 * 24));
        });

      if (completionTimes.length === 0) {
        return {
          predicted_days: 7,
          confidence: 'low',
          basis: 'default_estimate',
          message: 'Insufficient completion data. Using default estimate.'
        };
      }

      const avgDays = Math.round(
        completionTimes.reduce((sum, days) => sum + days, 0) / completionTimes.length
      );

      // Adjust for complexity (number of items)
      const itemCount = dataCall.checklist_items?.length || 0;
      const avgItemCount = historicalCalls.reduce((sum, dc) => 
        sum + (dc.checklist_items?.length || 0), 0
      ) / historicalCalls.length;

      const complexityMultiplier = itemCount / avgItemCount;
      const adjustedDays = Math.round(avgDays * complexityMultiplier);

      // Confidence based on sample size
      const confidence = completionTimes.length >= 10 ? 'high' :
                        completionTimes.length >= 5 ? 'medium' :
                        'low';

      // Check if on track
      let status = 'on_track';
      let statusMessage = 'On track for timely completion';

      if (dataCall.sent_date) {
        const daysSinceSent = Math.floor(
          (new Date() - new Date(dataCall.sent_date)) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceSent > adjustedDays * 1.2) {
          status = 'at_risk';
          statusMessage = 'Behind expected timeline';
        } else if (daysSinceSent > adjustedDays * 0.8) {
          status = 'watch';
          statusMessage = 'Approaching predicted completion time';
        }
      }

      return {
        predicted_days: adjustedDays,
        confidence,
        basis: 'historical_data',
        sample_size: completionTimes.length,
        avg_days: avgDays,
        complexity_adjustment: complexityMultiplier,
        status,
        statusMessage,
        message: `Based on ${completionTimes.length} similar ${dataCall.recipient_type.replace('_', ' ')} requests`
      };
    },
    enabled: !!dataCall?.id && !!organization?.id
  });

  if (!prediction) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'on_track': return 'bg-green-600';
      case 'watch': return 'bg-amber-600';
      case 'at_risk': return 'bg-red-600';
      default: return 'bg-slate-600';
    }
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Prediction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 mb-1">Predicted Completion Time</p>
            <p className="text-3xl font-bold text-purple-900">
              {prediction.predicted_days}
              <span className="text-lg text-slate-600 ml-2">days</span>
            </p>
          </div>
          <Badge className={getConfidenceColor(prediction.confidence)}>
            {prediction.confidence} confidence
          </Badge>
        </div>

        {dataCall.sent_date && prediction.status && (
          <div className="pt-3 border-t">
            <Badge className={getStatusColor(prediction.status)}>
              {prediction.statusMessage}
            </Badge>
          </div>
        )}

        <div className="space-y-2 text-xs">
          <p className="text-slate-600">
            <Target className="w-3 h-3 inline mr-1" />
            {prediction.message}
          </p>
          
          {prediction.basis === 'historical_data' && (
            <>
              <p className="text-slate-600">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                Average: {prediction.avg_days} days
              </p>
              {prediction.complexity_adjustment !== 1 && (
                <p className="text-slate-600">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  Adjusted for {dataCall.checklist_items?.length || 0} items 
                  (×{prediction.complexity_adjustment.toFixed(2)})
                </p>
              )}
            </>
          )}
        </div>

        {dataCall.due_date && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Set due date:</span>
              <span className="font-semibold text-slate-900">
                {moment(dataCall.due_date).format('MMM D, YYYY')}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-slate-600">Days until due:</span>
              <span className={cn(
                "font-semibold",
                moment(dataCall.due_date).diff(moment(), 'days') < prediction.predicted_days
                  ? 'text-red-600'
                  : 'text-green-600'
              )}>
                {moment(dataCall.due_date).diff(moment(), 'days')} days
              </span>
            </div>
            
            {moment(dataCall.due_date).diff(moment(), 'days') < prediction.predicted_days && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-900">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Due date may be too aggressive based on historical data
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}