import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, X, Clock } from "lucide-react";
import moment from "moment";

export default function QuickAddEvent({ 
  initialDate, 
  initialTime, 
  customEventTypes = [],
  onSave, 
  onCancel 
}) {
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("meeting");
  const [duration, setDuration] = useState("60");
  const [startTime, setStartTime] = useState(initialTime);

  const handleSave = () => {
    if (!title.trim()) return;

    const startDateTime = moment(`${initialDate} ${startTime}`, 'YYYY-MM-DD HH:mm');
    const endDateTime = moment(startDateTime).add(parseInt(duration), 'minutes');

    const eventData = {
      title,
      event_type: eventType,
      start_date: startDateTime.toISOString(),
      end_date: endDateTime.toISOString(),
      all_day: false
    };

    onSave(eventData);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <Card className="shadow-xl border-2 border-blue-500 animate-in fade-in zoom-in-95">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
            <Zap className="w-3 h-3" />
            Quick Add
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
            <X className="w-3 h-3" />
          </Button>
        </div>
        
        <Input
          placeholder="Event title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyPress={handleKeyPress}
          autoFocus
          className="text-sm"
        />
        
        <div className="grid grid-cols-2 gap-2">
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="task_deadline">Task</SelectItem>
              <SelectItem value="review_session">Review</SelectItem>
              <SelectItem value="time_block">Focus Time</SelectItem>
              <SelectItem value="other">Other</SelectItem>
              {customEventTypes.map(type => (
                <SelectItem key={type.type_key} value={type.type_key}>
                  {type.type_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 min</SelectItem>
              <SelectItem value="30">30 min</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="90">1.5 hours</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="text-sm h-8"
          />
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={!title.trim()} className="flex-1 h-8 text-xs">
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} className="h-8 text-xs">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}