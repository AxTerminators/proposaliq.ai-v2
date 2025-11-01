import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Clock, Plus, Zap, Focus, Coffee, BookOpen, Dumbbell, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

const TIME_BLOCK_TEMPLATES = [
  {
    name: "Deep Work",
    icon: Focus,
    color: "from-purple-400 to-purple-600",
    badge: "bg-purple-500 text-white",
    duration: 120,
    description: "Uninterrupted focus time for important work"
  },
  {
    name: "Quick Task",
    icon: Zap,
    color: "from-yellow-400 to-yellow-600",
    badge: "bg-yellow-500 text-white",
    duration: 30,
    description: "Short burst for quick tasks"
  },
  {
    name: "Break",
    icon: Coffee,
    color: "from-green-400 to-green-600",
    badge: "bg-green-500 text-white",
    duration: 15,
    description: "Rest and recharge"
  },
  {
    name: "Learning",
    icon: BookOpen,
    color: "from-blue-400 to-blue-600",
    badge: "bg-blue-500 text-white",
    duration: 60,
    description: "Professional development time"
  },
  {
    name: "Exercise",
    icon: Dumbbell,
    color: "from-red-400 to-red-600",
    badge: "bg-red-500 text-white",
    duration: 45,
    description: "Physical activity"
  },
  {
    name: "Personal Time",
    icon: Moon,
    color: "from-indigo-400 to-indigo-600",
    badge: "bg-indigo-500 text-white",
    duration: 60,
    description: "Personal appointments or downtime"
  }
];

export default function TimeBlockingPanel({ 
  organization, 
  user, 
  trigger,
  initialDate,
  initialTime 
}) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(TIME_BLOCK_TEMPLATES[0]);
  const [customTitle, setCustomTitle] = useState("");
  const [blockDate, setBlockDate] = useState(initialDate || moment().format('YYYY-MM-DD'));
  const [blockTime, setBlockTime] = useState(initialTime || moment().hour(9).minute(0).format('HH:mm'));
  const [duration, setDuration] = useState(120);

  const createBlockMutation = useMutation({
    mutationFn: async (blockData) => {
      return base44.entities.CalendarEvent.create(blockData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setShowDialog(false);
      setCustomTitle("");
    },
  });

  const handleCreateBlock = () => {
    const startDateTime = moment(`${blockDate} ${blockTime}`, 'YYYY-MM-DD HH:mm');
    const endDateTime = moment(startDateTime).add(duration, 'minutes');

    const title = customTitle.trim() || selectedTemplate.name;

    createBlockMutation.mutate({
      title: `🔒 ${title}`,
      description: selectedTemplate.description,
      event_type: "time_block",
      start_date: startDateTime.toISOString(),
      end_date: endDateTime.toISOString(),
      organization_id: organization.id,
      created_by_email: user.email,
      created_by_name: user.full_name,
      all_day: false,
      is_recurring: false,
      color: selectedTemplate.color
    });
  };

  return (
    <>
      {React.cloneElement(trigger, {
        onClick: () => setShowDialog(true)
      })}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Block Time on Calendar
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Choose a Time Block Type</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {TIME_BLOCK_TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate.name === template.name;
                  
                  return (
                    <Card
                      key={template.name}
                      className={cn(
                        "cursor-pointer transition-all border-2",
                        isSelected ? "border-purple-600 shadow-lg" : "border-slate-200 hover:border-slate-300"
                      )}
                      onClick={() => {
                        setSelectedTemplate(template);
                        setDuration(template.duration);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r text-white mb-3",
                          template.color
                        )}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <h5 className="font-bold text-sm mb-1">{template.name}</h5>
                        <p className="text-xs text-slate-600">{template.description}</p>
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {template.duration} min
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-2">Custom Title (Optional)</label>
                <Input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={`Leave blank for "${selectedTemplate.name}"`}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <Input
                    type="date"
                    value={blockDate}
                    onChange={(e) => setBlockDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Start Time</label>
                  <Input
                    type="time"
                    value={blockTime}
                    onChange={(e) => setBlockTime(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Duration</label>
                  <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="180">3 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-white p-3 rounded border">
                <p className="text-sm font-medium text-slate-900">
                  {customTitle || selectedTemplate.name}
                </p>
                <p className="text-xs text-slate-600">
                  {moment(`${blockDate} ${blockTime}`, 'YYYY-MM-DD HH:mm').format('dddd, MMMM D, YYYY [at] h:mm A')}
                  {' - '}
                  {moment(`${blockDate} ${blockTime}`, 'YYYY-MM-DD HH:mm').add(duration, 'minutes').format('h:mm A')}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateBlock}
                disabled={createBlockMutation.isPending}
                className={cn("bg-gradient-to-r text-white", selectedTemplate.color)}
              >
                {createBlockMutation.isPending ? 'Creating...' : 'Block Time'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}