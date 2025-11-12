import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  RefreshCw, 
  Plus, 
  Calendar, 
  Pause, 
  Play, 
  Trash2,
  Clock,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

const RECURRENCE_PATTERNS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly (every 2 weeks)' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly (every 3 months)' },
  { value: 'semiannual', label: 'Semi-annually (every 6 months)' },
  { value: 'annual', label: 'Annually' }
];

export default function RecurringDataCallManager({ organization, user }) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    series_name: "",
    series_description: "",
    recurrence_pattern: "monthly",
    template_data: {
      request_title: "",
      request_description: "",
      recipient_type: "client_organization",
      assigned_to_email: "",
      priority: "medium",
      checklist_items: []
    },
    start_date: "",
    end_date: "",
    is_active: true
  });

  // Fetch recurring series (stored as special data calls with recurrence flag)
  const { data: recurringSeries = [], isLoading } = useQuery({
    queryKey: ['recurring-data-calls', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      // We'll store recurring configs in notes as JSON for now
      // In production, you'd create a RecurringDataCall entity
      return [];
    },
    enabled: !!organization?.id
  });

  const createSeriesMutation = useMutation({
    mutationFn: async (data) => {
      // For now, store as a draft data call with special marker
      const seriesConfig = {
        organization_id: organization.id,
        request_title: `[RECURRING SERIES] ${data.series_name}`,
        request_description: data.series_description,
        overall_status: 'draft',
        recipient_type: data.template_data.recipient_type,
        assigned_to_email: data.template_data.assigned_to_email,
        priority: data.template_data.priority,
        checklist_items: data.template_data.checklist_items,
        notes: JSON.stringify({
          is_recurring_series: true,
          recurrence_pattern: data.recurrence_pattern,
          start_date: data.start_date,
          end_date: data.end_date,
          template_data: data.template_data
        }),
        created_by_email: user.email,
        created_by_name: user.full_name
      };

      await base44.entities.DataCallRequest.create(seriesConfig);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-data-calls'] });
      toast.success('Recurring series created!');
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create series: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      series_name: "",
      series_description: "",
      recurrence_pattern: "monthly",
      template_data: {
        request_title: "",
        request_description: "",
        recipient_type: "client_organization",
        assigned_to_email: "",
        priority: "medium",
        checklist_items: []
      },
      start_date: "",
      end_date: "",
      is_active: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-purple-600" />
            Recurring Data Calls
          </h2>
          <p className="text-slate-600 mt-1">
            Set up automated data call requests that repeat on a schedule
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Recurring Series
        </Button>
      </div>

      {/* Recurring Series List */}
      {recurringSeries.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <RefreshCw className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Recurring Series Yet
            </h3>
            <p className="text-slate-600 mb-4">
              Create recurring data calls for monthly reports, quarterly updates, etc.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Series
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {recurringSeries.map(series => (
            <Card key={series.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{series.series_name}</CardTitle>
                    <p className="text-sm text-slate-600 mt-1">{series.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      {series.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Pattern</p>
                    <p className="font-semibold capitalize">{series.recurrence_pattern}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Next Generation</p>
                    <p className="font-semibold">In 5 days</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Generated</p>
                    <p className="font-semibold">12 requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-purple-600" />
              Create Recurring Data Call Series
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-900">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                This feature will automatically generate data call requests based on your schedule.
              </p>
            </div>

            <div>
              <Label>Series Name *</Label>
              <Input
                value={formData.series_name}
                onChange={(e) => setFormData({ ...formData, series_name: e.target.value })}
                placeholder="e.g., Monthly Status Reports"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Recurrence Pattern *</Label>
              <Select
                value={formData.recurrence_pattern}
                onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_PATTERNS.map(pattern => (
                    <SelectItem key={pattern.value} value={pattern.value}>
                      {pattern.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Date (optional)</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-semibold text-slate-700 mb-3">
                Preview: Next 3 generations
              </p>
              <div className="space-y-2">
                {[0, 1, 2].map(i => {
                  const nextDate = moment().add(i, formData.recurrence_pattern === 'monthly' ? 'months' : 'weeks');
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm p-2 bg-slate-50 rounded">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-slate-900">{nextDate.format('MMM D, YYYY')}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createSeriesMutation.mutate(formData)}
                disabled={createSeriesMutation.isPending || !formData.series_name.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {createSeriesMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Create Series
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}