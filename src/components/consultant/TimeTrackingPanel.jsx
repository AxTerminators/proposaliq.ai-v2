import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Plus, Calendar, Building2, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

/**
 * Time Tracking Panel
 * Track billable hours per client workspace
 */
export default function TimeTrackingPanel({ consultingFirm, user }) {
  const queryClient = useQueryClient();
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerStart, setTimerStart] = useState(null);
  
  const [timeEntry, setTimeEntry] = useState({
    client_organization_id: '',
    proposal_id: '',
    hours: '',
    description: '',
    date: moment().format('YYYY-MM-DD'),
    billable: true
  });

  // Fetch client organizations
  const { data: clientOrgs = [] } = useQuery({
    queryKey: ['time-track-clients', consultingFirm?.id],
    queryFn: async () => {
      if (!consultingFirm?.id) return [];
      return base44.entities.Organization.filter({
        organization_type: 'client_organization',
        parent_organization_id: consultingFirm.id
      });
    },
    enabled: !!consultingFirm?.id,
  });

  // Fetch proposals for selected client
  const { data: clientProposals = [] } = useQuery({
    queryKey: ['time-track-proposals', timeEntry.client_organization_id],
    queryFn: async () => {
      if (!timeEntry.client_organization_id) return [];
      return base44.entities.Proposal.filter({
        organization_id: timeEntry.client_organization_id
      }, '-created_date');
    },
    enabled: !!timeEntry.client_organization_id,
  });

  // Create time entry entity if it doesn't exist
  const logTimeMutation = useMutation({
    mutationFn: async (data) => {
      // For now, store in Feedback entity with a special type
      // You could create a dedicated TimeEntry entity for production
      return base44.entities.Feedback.create({
        organization_id: consultingFirm.id,
        issue_type: 'other',
        title: `Time Entry: ${data.hours}h - ${data.description}`,
        description: JSON.stringify(data),
        reporter_email: user.email,
        reporter_name: user.full_name,
        priority: 'low'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Time logged successfully');
      setShowLogDialog(false);
      setTimeEntry({
        client_organization_id: '',
        proposal_id: '',
        hours: '',
        description: '',
        date: moment().format('YYYY-MM-DD'),
        billable: true
      });
    },
  });

  const handleStartTimer = (clientOrgId) => {
    setActiveTimer(clientOrgId);
    setTimerStart(new Date());
    toast.success('Timer started');
  };

  const handleStopTimer = () => {
    if (!activeTimer || !timerStart) return;

    const hours = ((new Date() - timerStart) / (1000 * 60 * 60)).toFixed(2);
    setTimeEntry({
      ...timeEntry,
      client_organization_id: activeTimer,
      hours: hours.toString()
    });
    setShowLogDialog(true);
    setActiveTimer(null);
    setTimerStart(null);
  };

  const handleLogTime = () => {
    if (!timeEntry.client_organization_id || !timeEntry.hours || !timeEntry.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    logTimeMutation.mutate(timeEntry);
  };

  return (
    <>
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Time Tracking
            </CardTitle>
            <Button
              onClick={() => setShowLogDialog(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Log Time
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeTimer ? (
            <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-green-900 mb-1">Timer Running</p>
                  <p className="text-sm text-green-700">
                    {clientOrgs.find(c => c.id === activeTimer)?.organization_name}
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    Started: {moment(timerStart).format('h:mm A')}
                  </p>
                </div>
                <Button
                  onClick={handleStopTimer}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {clientOrgs.slice(0, 5).map(client => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                >
                  <p className="font-medium text-slate-900 truncate flex-1">
                    {client.organization_name}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStartTimer(client.id)}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Time Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Log Time Entry
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Client *</Label>
              <Select
                value={timeEntry.client_organization_id}
                onValueChange={(value) => setTimeEntry({
                  ...timeEntry,
                  client_organization_id: value,
                  proposal_id: '' // Reset proposal when client changes
                })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {clientOrgs.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.organization_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {timeEntry.client_organization_id && (
              <div>
                <Label>Proposal (Optional)</Label>
                <Select
                  value={timeEntry.proposal_id}
                  onValueChange={(value) => setTimeEntry({
                    ...timeEntry,
                    proposal_id: value
                  })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select proposal..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>General (not proposal-specific)</SelectItem>
                    {clientProposals.map(proposal => (
                      <SelectItem key={proposal.id} value={proposal.id}>
                        {proposal.proposal_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={timeEntry.date}
                  onChange={(e) => setTimeEntry({...timeEntry, date: e.target.value})}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Hours *</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={timeEntry.hours}
                  onChange={(e) => setTimeEntry({...timeEntry, hours: e.target.value})}
                  placeholder="2.5"
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                value={timeEntry.description}
                onChange={(e) => setTimeEntry({...timeEntry, description: e.target.value})}
                placeholder="What did you work on?"
                rows={3}
                className="mt-2"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="billable"
                checked={timeEntry.billable}
                onChange={(e) => setTimeEntry({...timeEntry, billable: e.target.checked})}
                className="w-4 h-4"
              />
              <Label htmlFor="billable" className="cursor-pointer">
                Billable time
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLogTime}
              disabled={
                !timeEntry.client_organization_id ||
                !timeEntry.hours ||
                !timeEntry.description ||
                logTimeMutation.isPending
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {logTimeMutation.isPending ? (
                <>Logging...</>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Log Time
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}