import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Users, Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

const USER_COLORS = [
  "from-blue-400 to-blue-600",
  "from-green-400 to-green-600",
  "from-purple-400 to-purple-600",
  "from-orange-400 to-orange-600",
  "from-pink-400 to-pink-600",
  "from-teal-400 to-teal-600",
  "from-indigo-400 to-indigo-600",
  "from-cyan-400 to-cyan-600",
];

export default function TeamCalendarView({ organization, currentUser }) {
  const [selectedUsers, setSelectedUsers] = useState([currentUser?.email]);
  const [currentDate, setCurrentDate] = useState(new Date());

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

  // Fetch events for each selected user
  const userEventQueries = useQueries({
    queries: selectedUsers.map(email => ({
      queryKey: ['user-events', organization?.id, email],
      queryFn: async () => {
        if (!organization?.id) return [];
        const events = await base44.entities.CalendarEvent.filter({
          organization_id: organization.id
        });
        // Filter events where user is creator or attendee
        return events.filter(event => 
          event.created_by_email === email ||
          event.attendees?.some(a => a.email === email)
        );
      },
      enabled: !!organization?.id && !!email,
    }))
  });

  const toggleUser = (email) => {
    if (selectedUsers.includes(email)) {
      setSelectedUsers(selectedUsers.filter(e => e !== email));
    } else {
      setSelectedUsers([...selectedUsers, email]);
    }
  };

  const getUserColor = (email) => {
    const index = teamMembers.findIndex(m => m.email === email);
    return USER_COLORS[index % USER_COLORS.length];
  };

  const renderWeekView = () => {
    const startOfWeek = moment(currentDate).startOf('week');
    const days = Array.from({ length: 7 }, (_, i) => moment(startOfWeek).add(i, 'days'));
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="border rounded-xl overflow-hidden">
        <div className="grid grid-cols-8 border-b bg-slate-50">
          <div className="p-3 border-r font-bold text-slate-700">Time</div>
          {days.map((day) => (
            <div key={day.format('YYYY-MM-DD')} className={cn(
              "p-3 text-center border-r",
              day.isSame(moment(), 'day') && "bg-blue-50"
            )}>
              <div className="text-xs font-semibold text-slate-500 uppercase">
                {day.format('ddd')}
              </div>
              <div className={cn(
                "text-lg font-bold mt-1",
                day.isSame(moment(), 'day') && "text-blue-600"
              )}>
                {day.format('D')}
              </div>
            </div>
          ))}
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b min-h-[80px]">
              <div className="p-3 text-right text-sm font-semibold text-slate-600 border-r bg-slate-50">
                {moment().hour(hour).format('h A')}
              </div>
              {days.map((day) => {
                // Get all events for this day and hour across all selected users
                const allEvents = userEventQueries.flatMap((query, userIndex) => {
                  const events = query.data || [];
                  return events
                    .filter(event => {
                      const eventStart = moment(event.start_date);
                      const eventEnd = moment(event.end_date);
                      const targetHour = moment(day).hour(hour);
                      const nextHour = moment(day).hour(hour + 1);
                      
                      return (
                        (eventStart.isSameOrAfter(targetHour) && eventStart.isBefore(nextHour)) ||
                        (eventEnd.isAfter(targetHour) && eventEnd.isSameOrBefore(nextHour)) ||
                        (eventStart.isBefore(targetHour) && eventEnd.isAfter(nextHour))
                      );
                    })
                    .map(event => ({
                      ...event,
                      userEmail: selectedUsers[userIndex],
                      userColor: getUserColor(selectedUsers[userIndex])
                    }));
                });

                return (
                  <div key={day.format('YYYY-MM-DD')} className="p-2 border-r hover:bg-slate-50 transition-all">
                    {allEvents.map((event) => (
                      <Popover key={event.id}>
                        <PopoverTrigger asChild>
                          <div className={cn(
                            "p-2 rounded-lg cursor-pointer mb-1 shadow-sm hover:shadow-md transition-all bg-gradient-to-r text-white text-xs",
                            event.userColor
                          )}>
                            <div className="font-bold truncate">{event.title}</div>
                            <div className="text-[10px] opacity-90 truncate">
                              {teamMembers.find(m => m.email === event.userEmail)?.full_name}
                            </div>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-bold text-slate-900">{event.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Users className="w-4 h-4" />
                              {teamMembers.find(m => m.email === event.userEmail)?.full_name}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Clock className="w-4 h-4" />
                              {moment(event.start_date).format('h:mm A')} - {moment(event.end_date).format('h:mm A')}
                            </div>
                            {event.description && (
                              <p className="text-sm text-slate-600">{event.description}</p>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Select Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {teamMembers.map((member, index) => {
              const isSelected = selectedUsers.includes(member.email);
              const color = USER_COLORS[index % USER_COLORS.length];
              
              return (
                <div
                  key={member.email}
                  onClick={() => toggleUser(member.email)}
                  className={cn(
                    "p-3 rounded-lg border-2 cursor-pointer transition-all",
                    isSelected ? "border-slate-900 shadow-md" : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox checked={isSelected} />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-900 truncate">{member.full_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={cn("w-3 h-3 rounded-full bg-gradient-to-r", color)} />
                        <span className="text-xs text-slate-500">{member.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedUsers.length === 0 && (
            <p className="text-center text-slate-500 py-4">Select at least one team member to view their calendar</p>
          )}
        </CardContent>
      </Card>

      {selectedUsers.length > 0 && (
        <Card className="border-none shadow-xl">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => setCurrentDate(moment(currentDate).subtract(1, 'week').toDate())}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <h2 className="text-2xl font-bold text-slate-900">
                  {moment(currentDate).startOf('week').format('MMM D')} - {moment(currentDate).endOf('week').format('MMM D, YYYY')}
                </h2>
                <Button variant="outline" size="icon" onClick={() => setCurrentDate(moment(currentDate).add(1, 'week').toDate())}>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {renderWeekView()}
          </CardContent>
        </Card>
      )}

      {selectedUsers.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <h4 className="font-semibold text-slate-900 mb-3">Team Member Legend</h4>
            <div className="flex flex-wrap gap-3">
              {selectedUsers.map((email) => {
                const member = teamMembers.find(m => m.email === email);
                const color = getUserColor(email);
                return (
                  <div key={email} className="flex items-center gap-2">
                    <div className={cn("w-4 h-4 rounded bg-gradient-to-r", color)} />
                    <span className="text-sm text-slate-700">{member?.full_name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}