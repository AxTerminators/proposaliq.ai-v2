import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Calendar, Clock, Users, TrendingUp, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function AISchedulingAssistant({ organization, user, onEventScheduled }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  
  const [formData, setFormData] = useState({
    meeting_title: "",
    meeting_description: "",
    duration_minutes: 60,
    required_attendees: [],
    preferred_date_range: {
      start_date: moment().format('YYYY-MM-DD'),
      end_date: moment().add(14, 'days').format('YYYY-MM-DD')
    },
    preferred_times: [],
    avoid_days: []
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const users = await base44.entities.User.filter({});
      return users.filter(u => 
        u.client_accesses?.some(access => access.organization_id === organization.id)
      );
    },
    enabled: !!organization?.id,
  });

  const analyzeScheduling = async () => {
    setAnalyzing(true);
    try {
      // Get all calendar events for required attendees
      const attendeeEmails = formData.required_attendees.map(a => a.email);
      const allEvents = await base44.entities.CalendarEvent.filter({
        organization_id: organization.id
      });

      // Filter events where any required attendee is involved
      const relevantEvents = allEvents.filter(event =>
        attendeeEmails.includes(event.created_by_email) ||
        event.attendees?.some(a => attendeeEmails.includes(a.email))
      );

      // Generate time slots and check availability
      const startDate = moment(formData.preferred_date_range.start_date);
      const endDate = moment(formData.preferred_date_range.end_date);
      const timeSlots = [];

      let currentDate = moment(startDate);
      while (currentDate.isSameOrBefore(endDate)) {
        // Skip avoided days
        const dayName = currentDate.format('dddd').toLowerCase();
        if (!formData.avoid_days.includes(dayName)) {
          // Generate slots based on preferred times
          const timesToCheck = formData.preferred_times.length > 0 
            ? formData.preferred_times 
            : ['morning', 'afternoon'];

          timesToCheck.forEach(timeOfDay => {
            let hours = [];
            if (timeOfDay === 'morning') hours = [9, 10, 11];
            else if (timeOfDay === 'afternoon') hours = [13, 14, 15, 16];
            else if (timeOfDay === 'evening') hours = [17, 18, 19];

            hours.forEach(hour => {
              const slotStart = moment(currentDate).hour(hour).minute(0).second(0);
              const slotEnd = moment(slotStart).add(formData.duration_minutes, 'minutes');

              // Check if this slot has any conflicts
              const conflicts = relevantEvents.filter(event => {
                const eventStart = moment(event.start_date);
                const eventEnd = moment(event.end_date);
                return (
                  (slotStart.isBefore(eventEnd) && slotEnd.isAfter(eventStart))
                );
              });

              timeSlots.push({
                start: slotStart.toISOString(),
                end: slotEnd.toISOString(),
                conflicts: conflicts.length,
                conflictDetails: conflicts.map(e => e.title)
              });
            });
          });
        }

        currentDate.add(1, 'day');
      }

      // Sort by fewest conflicts and calculate scores
      const scoredSlots = timeSlots
        .sort((a, b) => a.conflicts - b.conflicts)
        .slice(0, 10)
        .map((slot, index) => {
          const availabilityScore = Math.max(0, 100 - (slot.conflicts * 20));
          const confidenceScore = availabilityScore - (index * 5); // Prefer earlier suggestions
          
          return {
            suggested_time: slot.start,
            confidence_score: Math.max(0, confidenceScore),
            availability_score: availabilityScore,
            conflicts: slot.conflictDetails,
            reasoning: slot.conflicts === 0 
              ? "Perfect availability - all attendees are free"
              : `${slot.conflicts} potential conflict${slot.conflicts > 1 ? 's' : ''} detected`
          };
        });

      setSuggestions(scoredSlots);

    } catch (error) {
      console.error("Error analyzing schedule:", error);
      alert("Failed to analyze availability");
    } finally {
      setAnalyzing(false);
    }
  };

  const scheduleEvent = async (suggestion) => {
    try {
      const eventData = {
        title: formData.meeting_title,
        description: formData.meeting_description,
        event_type: "meeting",
        start_date: suggestion.suggested_time,
        end_date: moment(suggestion.suggested_time).add(formData.duration_minutes, 'minutes').toISOString(),
        attendees: [...formData.required_attendees],
        organization_id: organization.id,
        created_by_email: user.email,
        created_by_name: user.full_name
      };

      const newEvent = await base44.entities.CalendarEvent.create(eventData);
      
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      
      if (onEventScheduled) {
        onEventScheduled(newEvent);
      }

      setShowDialog(false);
      resetForm();
      setSuggestions([]);
      
    } catch (error) {
      console.error("Error scheduling event:", error);
      alert("Failed to create event");
    }
  };

  const resetForm = () => {
    setFormData({
      meeting_title: "",
      meeting_description: "",
      duration_minutes: 60,
      required_attendees: [],
      preferred_date_range: {
        start_date: moment().format('YYYY-MM-DD'),
        end_date: moment().add(14, 'days').format('YYYY-MM-DD')
      },
      preferred_times: [],
      avoid_days: []
    });
  };

  const toggleAttendee = (member) => {
    const exists = formData.required_attendees.find(a => a.email === member.email);
    if (exists) {
      setFormData({
        ...formData,
        required_attendees: formData.required_attendees.filter(a => a.email !== member.email)
      });
    } else {
      setFormData({
        ...formData,
        required_attendees: [...formData.required_attendees, { email: member.email, name: member.full_name }]
      });
    }
  };

  const togglePreferredTime = (time) => {
    if (formData.preferred_times.includes(time)) {
      setFormData({
        ...formData,
        preferred_times: formData.preferred_times.filter(t => t !== time)
      });
    } else {
      setFormData({
        ...formData,
        preferred_times: [...formData.preferred_times, time]
      });
    }
  };

  const toggleAvoidDay = (day) => {
    if (formData.avoid_days.includes(day)) {
      setFormData({
        ...formData,
        avoid_days: formData.avoid_days.filter(d => d !== day)
      });
    } else {
      setFormData({
        ...formData,
        avoid_days: [...formData.avoid_days, day]
      });
    }
  };

  return (
    <>
      <Button 
        onClick={() => setShowDialog(true)}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        AI Scheduling Assistant
      </Button>

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          resetForm();
          setSuggestions([]);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Scheduling Assistant
            </DialogTitle>
          </DialogHeader>

          {suggestions.length === 0 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Meeting Title *</label>
                <Input
                  value={formData.meeting_title}
                  onChange={(e) => setFormData({ ...formData, meeting_title: e.target.value })}
                  placeholder="What's the meeting about?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={formData.meeting_description}
                  onChange={(e) => setFormData({ ...formData, meeting_description: e.target.value })}
                  placeholder="Meeting agenda or details..."
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Duration</label>
                <select
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                  className="w-full border rounded-md p-2"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Required Attendees *</label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {teamMembers.map(member => {
                    const isSelected = formData.required_attendees.find(a => a.email === member.email);
                    return (
                      <div key={member.email} className="flex items-center gap-2">
                        <Checkbox 
                          checked={!!isSelected}
                          onCheckedChange={() => toggleAttendee(member)}
                        />
                        <span className="text-sm">{member.full_name}</span>
                        <span className="text-xs text-slate-500">({member.email})</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {formData.required_attendees.length} attendee{formData.required_attendees.length !== 1 ? 's' : ''} selected
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">From Date</label>
                  <Input
                    type="date"
                    value={formData.preferred_date_range.start_date}
                    onChange={(e) => setFormData({
                      ...formData,
                      preferred_date_range: { ...formData.preferred_date_range, start_date: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">To Date</label>
                  <Input
                    type="date"
                    value={formData.preferred_date_range.end_date}
                    onChange={(e) => setFormData({
                      ...formData,
                      preferred_date_range: { ...formData.preferred_date_range, end_date: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Preferred Times</label>
                <div className="flex gap-2">
                  {['morning', 'afternoon', 'evening'].map(time => (
                    <Button
                      key={time}
                      type="button"
                      size="sm"
                      variant={formData.preferred_times.includes(time) ? "default" : "outline"}
                      onClick={() => togglePreferredTime(time)}
                      className="capitalize"
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Avoid Days</label>
                <div className="flex flex-wrap gap-2">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => (
                    <Button
                      key={day}
                      type="button"
                      size="sm"
                      variant={formData.avoid_days.includes(day) ? "destructive" : "outline"}
                      onClick={() => toggleAvoidDay(day)}
                      className="capitalize"
                    >
                      {day.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={analyzeScheduling}
                  disabled={!formData.meeting_title.trim() || formData.required_attendees.length === 0 || analyzing}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Find Best Times
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                <Sparkles className="w-12 h-12 mx-auto mb-2 text-purple-600" />
                <h3 className="text-lg font-semibold text-slate-900">AI-Recommended Time Slots</h3>
                <p className="text-sm text-slate-600">Based on {formData.required_attendees.length} attendee availability</p>
              </div>

              <div className="space-y-3">
                {suggestions.map((suggestion, index) => {
                  const suggestedMoment = moment(suggestion.suggested_time);
                  const isTopChoice = index === 0;
                  
                  return (
                    <Card key={index} className={cn(
                      "border-2 transition-all hover:shadow-lg",
                      isTopChoice ? "border-purple-400 bg-purple-50/30" : "border-slate-200"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {isTopChoice && (
                                <Badge className="bg-purple-600">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Best Match
                                </Badge>
                              )}
                              <Badge variant="secondary">
                                {suggestion.confidence_score}% confidence
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4 mb-2">
                              <div className="flex items-center gap-2 text-slate-900">
                                <Calendar className="w-4 h-4" />
                                <span className="font-semibold">
                                  {suggestedMoment.format('dddd, MMMM D, YYYY')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-900">
                                <Clock className="w-4 h-4" />
                                <span className="font-semibold">
                                  {suggestedMoment.format('h:mm A')} - {moment(suggestion.suggested_time).add(formData.duration_minutes, 'minutes').format('h:mm A')}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <TrendingUp className={cn(
                                "w-4 h-4",
                                suggestion.availability_score >= 80 ? "text-green-600" :
                                suggestion.availability_score >= 60 ? "text-amber-600" :
                                "text-red-600"
                              )} />
                              <span className="text-slate-600">{suggestion.reasoning}</span>
                            </div>

                            {suggestion.conflicts.length > 0 && (
                              <div className="mt-2 text-xs text-slate-500">
                                Conflicts: {suggestion.conflicts.join(', ')}
                              </div>
                            )}
                          </div>

                          <Button
                            size="sm"
                            onClick={() => scheduleEvent(suggestion)}
                            className={cn(
                              isTopChoice && "bg-gradient-to-r from-purple-600 to-pink-600"
                            )}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Schedule
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setSuggestions([])}
                >
                  Back to Form
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => {
                    setShowDialog(false);
                    resetForm();
                    setSuggestions([]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}