import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function QuickAddEvent({ 
  initialDate, 
  initialTime, 
  onSave, 
  onCancel,
  customEventTypes = []
}) {
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("meeting");
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    // Auto-focus on mount
    const input = document.getElementById('quick-add-title');
    if (input) {
      input.focus();
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const startDateTime = moment(initialDate)
      .hour(moment(initialTime, 'HH:mm').hour())
      .minute(moment(initialTime, 'HH:mm').minute());
    
    const endDateTime = moment(startDateTime).add(duration, 'minutes');

    onSave({
      title: title.trim(),
      event_type: eventType,
      start_date: startDateTime.toISOString(),
      end_date: endDateTime.toISOString(),
      description: "",
      location: "",
      meeting_link: "",
      all_day: false,
      is_recurring: false
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <Card className="border-2 border-blue-500 shadow-xl p-3 space-y-2 bg-white z-50">
      <form onSubmit={handleSubmit} className="space-y-2">
        <Input
          id="quick-add-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Event title..."
          className="font-medium"
          autoComplete="off"
        />

        <div className="flex gap-2">
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="flex-1 text-sm border rounded-md px-2 py-1"
          >
            <optgroup label="System Types">
              <option value="meeting">Meeting</option>
              <option value="task_deadline">Task</option>
              <option value="milestone">Milestone</option>
              <option value="other">Other</option>
            </optgroup>
            {customEventTypes.length > 0 && (
              <optgroup label="Custom Types">
                {customEventTypes.map(type => (
                  <option key={type.type_key} value={type.type_key}>
                    {type.type_name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          <select
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="text-sm border rounded-md px-2 py-1"
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button type="submit" size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
            <Check className="w-3 h-3 mr-1" />
            Create
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            <X className="w-3 h-3 mr-1" />
            Cancel
          </Button>
        </div>
      </form>

      <div className="text-xs text-slate-500 flex items-center gap-2">
        <Calendar className="w-3 h-3" />
        {moment(initialDate).format('MMM D, YYYY')}
        <Clock className="w-3 h-3 ml-2" />
        {initialTime}
      </div>
    </Card>
  );
}