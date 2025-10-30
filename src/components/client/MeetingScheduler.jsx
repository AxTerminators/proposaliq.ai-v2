import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar,
  Plus,
  Video,
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  FileText
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

export default function MeetingScheduler({ proposal, client, organization, currentMember }) {
  const queryClient = useQueryClient();
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);

  const [meetingData, setMeetingData] = useState({
    meeting_title: "",
    meeting_type: "review",
    scheduled_date: "",
    duration_minutes: 60,
    meeting_link: "",
    location: "",
    agenda: ""
  });

  const { data: meetings } = useQuery({
    queryKey: ['client-meetings', proposal?.id, client.id],
    queryFn: () => base44.entities.ClientMeeting.filter({
      client_id: client.id,
      proposal_id: proposal?.id || { $exists: false }
    }, '-scheduled_date'),
    initialData: []
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['meeting-team-members', client.id],
    queryFn: () => base44.entities.ClientTeamMember.filter({ client_id: client.id }),
    initialData: []
  });

  const createMeetingMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ClientMeeting.create({
        ...data,
        client_id: client.id,
        proposal_id: proposal?.id,
        organization_id: organization.id,
        organized_by: currentMember.member_email,
        status: 'scheduled',
        attendees: teamMembers.map(tm => ({
          name: tm.member_name,
          email: tm.member_email,
          role: tm.team_role,
          is_required: tm.team_role === 'owner' || tm.team_role === 'approver',
          rsvp_status: 'pending'
        }))
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-meetings'] });
      setShowMeetingDialog(false);
      resetForm();
      alert("Meeting scheduled successfully");
    },
  });

  const updateMeetingMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.ClientMeeting.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-meetings'] });
      setShowMeetingDialog(false);
      setEditingMeeting(null);
      resetForm();
      alert("Meeting updated");
    },
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: async (meetingId) => {
      return await base44.entities.ClientMeeting.delete(meetingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-meetings'] });
      alert("Meeting cancelled");
    },
  });

  const handleSubmit = () => {
    if (!meetingData.meeting_title || !meetingData.scheduled_date) {
      alert("Please fill in meeting title and date");
      return;
    }

    if (editingMeeting) {
      updateMeetingMutation.mutate({
        id: editingMeeting.id,
        data: meetingData
      });
    } else {
      createMeetingMutation.mutate(meetingData);
    }
  };

  const handleEdit = (meeting) => {
    setEditingMeeting(meeting);
    setMeetingData({
      meeting_title: meeting.meeting_title,
      meeting_type: meeting.meeting_type,
      scheduled_date: meeting.scheduled_date,
      duration_minutes: meeting.duration_minutes,
      meeting_link: meeting.meeting_link || "",
      location: meeting.location || "",
      agenda: meeting.agenda || ""
    });
    setShowMeetingDialog(true);
  };

  const resetForm = () => {
    setMeetingData({
      meeting_title: "",
      meeting_type: "review",
      scheduled_date: "",
      duration_minutes: 60,
      meeting_link: "",
      location: "",
      agenda: ""
    });
  };

  const getStatusBadge = (status) => {
    const configs = {
      scheduled: { icon: Clock, color: "bg-blue-100 text-blue-700", label: "Scheduled" },
      in_progress: { icon: Clock, color: "bg-green-100 text-green-700", label: "In Progress" },
      completed: { icon: CheckCircle2, color: "bg-slate-100 text-slate-700", label: "Completed" },
      cancelled: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Cancelled" }
    };
    const config = configs[status] || configs.scheduled;
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const upcomingMeetings = meetings.filter(m => 
    moment(m.scheduled_date).isAfter(moment()) && m.status === 'scheduled'
  );

  const pastMeetings = meetings.filter(m => 
    moment(m.scheduled_date).isBefore(moment()) || m.status === 'completed'
  );

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Meetings & Calls
              </CardTitle>
              <CardDescription>
                Schedule and manage meetings with your team
              </CardDescription>
            </div>
            <Button onClick={() => {
              setEditingMeeting(null);
              resetForm();
              setShowMeetingDialog(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Meeting
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Upcoming Meetings */}
          {upcomingMeetings.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-slate-900 mb-3">Upcoming Meetings</h3>
              <div className="space-y-3">
                {upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} className="p-4 border-2 rounded-lg hover:border-blue-300 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900">{meeting.meeting_title}</h4>
                          {getStatusBadge(meeting.status)}
                          <Badge variant="outline" className="capitalize">
                            {meeting.meeting_type.replace(/_/g, ' ')}
                          </Badge>
                        </div>

                        <div className="grid md:grid-cols-2 gap-2 text-sm text-slate-600 mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {moment(meeting.scheduled_date).format('MMM D, YYYY [at] h:mm A')}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {meeting.duration_minutes} minutes
                          </div>
                          {meeting.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {meeting.location}
                            </div>
                          )}
                          {meeting.attendees && (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              {meeting.attendees.length} attendees
                            </div>
                          )}
                        </div>

                        {meeting.agenda && (
                          <p className="text-sm text-slate-700 mb-2">{meeting.agenda}</p>
                        )}

                        {meeting.meeting_link && (
                          <a
                            href={meeting.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                          >
                            <Video className="w-4 h-4" />
                            Join Meeting
                          </a>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(meeting)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Cancel this meeting?')) {
                              updateMeetingMutation.mutate({
                                id: meeting.id,
                                data: { status: 'cancelled' }
                              });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Meetings */}
          {pastMeetings.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Past Meetings</h3>
              <div className="space-y-2">
                {pastMeetings.slice(0, 5).map((meeting) => (
                  <div key={meeting.id} className="p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{meeting.meeting_title}</p>
                        <p className="text-sm text-slate-600">
                          {moment(meeting.scheduled_date).format('MMM D, YYYY')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {meeting.has_notes && (
                          <Badge variant="outline">
                            <FileText className="w-3 h-3 mr-1" />
                            Has Notes
                          </Badge>
                        )}
                        {getStatusBadge(meeting.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {meetings.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>No meetings scheduled</p>
              <p className="text-sm">Schedule your first meeting to collaborate</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meeting Dialog */}
      <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMeeting ? 'Edit Meeting' : 'Schedule New Meeting'}</DialogTitle>
            <DialogDescription>
              Set up a meeting with your team and consultant
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="meeting_title">Meeting Title *</Label>
              <Input
                id="meeting_title"
                value={meetingData.meeting_title}
                onChange={(e) => setMeetingData({ ...meetingData, meeting_title: e.target.value })}
                placeholder="Proposal Review Meeting"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="meeting_type">Meeting Type</Label>
                <Select
                  value={meetingData.meeting_type}
                  onValueChange={(value) => setMeetingData({ ...meetingData, meeting_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kickoff">Kickoff</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="q_and_a">Q&A</SelectItem>
                    <SelectItem value="presentation">Presentation</SelectItem>
                    <SelectItem value="status_update">Status Update</SelectItem>
                    <SelectItem value="final_review">Final Review</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  value={meetingData.duration_minutes}
                  onChange={(e) => setMeetingData({ ...meetingData, duration_minutes: parseInt(e.target.value) })}
                  min="15"
                  step="15"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="scheduled_date">Date & Time *</Label>
              <Input
                id="scheduled_date"
                type="datetime-local"
                value={meetingData.scheduled_date}
                onChange={(e) => setMeetingData({ ...meetingData, scheduled_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="meeting_link">Video Meeting Link</Label>
              <Input
                id="meeting_link"
                type="url"
                value={meetingData.meeting_link}
                onChange={(e) => setMeetingData({ ...meetingData, meeting_link: e.target.value })}
                placeholder="https://zoom.us/j/..."
              />
            </div>

            <div>
              <Label htmlFor="location">Location (if in-person)</Label>
              <Input
                id="location"
                value={meetingData.location}
                onChange={(e) => setMeetingData({ ...meetingData, location: e.target.value })}
                placeholder="Conference Room A"
              />
            </div>

            <div>
              <Label htmlFor="agenda">Agenda</Label>
              <Textarea
                id="agenda"
                value={meetingData.agenda}
                onChange={(e) => setMeetingData({ ...meetingData, agenda: e.target.value })}
                rows={3}
                placeholder="Topics to discuss..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowMeetingDialog(false);
                setEditingMeeting(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMeetingMutation.isPending || updateMeetingMutation.isPending}>
              {editingMeeting ? 'Update Meeting' : 'Schedule Meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}