import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, AlertTriangle, ChevronLeft, ChevronRight, Maximize2, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function GanttChartView({ organization, user }) {
  const queryClient = useQueryClient();
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [viewStart, setViewStart] = useState(moment().startOf('month'));
  const [viewRange, setViewRange] = useState(30); // days

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals-gantt', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter({ 
        organization_id: organization.id,
        status: { $in: ['draft', 'in_progress', 'submitted'] }
      });
    },
    enabled: !!organization?.id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['proposal-tasks-gantt', selectedProposal?.id],
    queryFn: async () => {
      if (!selectedProposal?.id) return [];
      return base44.entities.ProposalTask.filter({ 
        proposal_id: selectedProposal.id 
      }, 'due_date');
    },
    enabled: !!selectedProposal?.id,
  });

  const { data: dependencies = [] } = useQuery({
    queryKey: ['task-dependencies', selectedProposal?.id],
    queryFn: async () => {
      if (!selectedProposal?.id) return [];
      return base44.entities.TaskDependency.filter({ 
        proposal_id: selectedProposal.id 
      });
    },
    enabled: !!selectedProposal?.id,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, due_date }) => {
      return base44.entities.ProposalTask.update(taskId, { due_date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-tasks-gantt'] });
    },
  });

  const renderTimeline = () => {
    const days = Array.from({ length: viewRange }, (_, i) => moment(viewStart).add(i, 'days'));
    
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Timeline Header */}
          <div className="grid" style={{ gridTemplateColumns: '200px 1fr' }}>
            <div className="p-3 border-b border-r bg-slate-100 font-bold text-slate-700">
              Task
            </div>
            <div className="flex border-b">
              {days.map((day) => {
                const isToday = day.isSame(moment(), 'day');
                return (
                  <div 
                    key={day.format('YYYY-MM-DD')}
                    className={cn(
                      "flex-1 text-center p-2 border-r text-xs",
                      isToday && "bg-blue-50 border-blue-300"
                    )}
                    style={{ minWidth: '40px' }}
                  >
                    <div className="font-semibold">{day.format('D')}</div>
                    <div className="text-slate-500">{day.format('ddd')}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Rows */}
          {tasks.map((task) => {
            const taskStart = moment(task.created_date);
            const taskEnd = moment(task.due_date);
            const daysFromStart = taskStart.diff(viewStart, 'days');
            const duration = taskEnd.diff(taskStart, 'days') + 1;
            
            const leftOffset = Math.max(0, daysFromStart);
            const barWidth = Math.min(duration, viewRange - leftOffset);

            const isOverdue = taskEnd.isBefore(moment()) && task.status !== 'completed';
            const hasDependencies = dependencies.some(d => 
              d.predecessor_task_id === task.id || d.successor_task_id === task.id
            );

            return (
              <div key={task.id} className="grid" style={{ gridTemplateColumns: '200px 1fr' }}>
                <div className="p-3 border-b border-r bg-white">
                  <div className="text-sm font-medium text-slate-900 truncate">{task.title}</div>
                  <div className="flex gap-1 mt-1">
                    <Badge variant={
                      task.status === 'completed' ? 'default' :
                      task.status === 'in_progress' ? 'secondary' : 'outline'
                    } className="text-xs">
                      {task.status}
                    </Badge>
                    {hasDependencies && (
                      <Badge variant="outline" className="text-xs">
                        <LinkIcon className="w-2 h-2 mr-1" />
                        Linked
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="relative border-b flex" style={{ minHeight: '60px' }}>
                  {days.map((day, index) => (
                    <div 
                      key={index}
                      className="flex-1 border-r"
                      style={{ minWidth: '40px' }}
                    />
                  ))}
                  
                  {barWidth > 0 && leftOffset < viewRange && (
                    <div
                      className={cn(
                        "absolute top-2 h-8 rounded-lg shadow-md cursor-pointer transition-all hover:shadow-xl",
                        task.status === 'completed' ? "bg-green-500" :
                        task.status === 'in_progress' ? "bg-blue-500" :
                        isOverdue ? "bg-red-500" :
                        "bg-slate-400"
                      )}
                      style={{
                        left: `${(leftOffset / viewRange) * 100}%`,
                        width: `${(barWidth / viewRange) * 100}%`,
                      }}
                      title={`${task.title} - ${taskStart.format('MMM D')} to ${taskEnd.format('MMM D')}`}
                    >
                      <div className="px-2 py-1 text-white text-xs font-medium truncate">
                        {task.title}
                      </div>
                    </div>
                  )}

                  {isOverdue && (
                    <div className="absolute top-11 left-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {tasks.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No tasks to display in Gantt view</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Gantt Chart / Project Timeline</h3>
          <p className="text-sm text-slate-600">Visualize task dependencies and critical path</p>
        </div>
        <Select 
          value={selectedProposal?.id || "none"}
          onValueChange={(value) => {
            const proposal = proposals.find(p => p.id === value);
            setSelectedProposal(proposal || null);
          }}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a proposal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select a proposal</SelectItem>
            {proposals.map(proposal => (
              <SelectItem key={proposal.id} value={proposal.id}>
                {proposal.proposal_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProposal ? (
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{selectedProposal.proposal_name}</CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setViewStart(moment(viewStart).subtract(viewRange, 'days'))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium">
                  {viewStart.format('MMM D')} - {moment(viewStart).add(viewRange, 'days').format('MMM D, YYYY')}
                </span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setViewStart(moment(viewStart).add(viewRange, 'days'))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Select 
                  value={viewRange.toString()}
                  onValueChange={(value) => setViewRange(parseInt(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="14">2 weeks</SelectItem>
                    <SelectItem value="30">1 month</SelectItem>
                    <SelectItem value="60">2 months</SelectItem>
                    <SelectItem value="90">3 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {renderTimeline()}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a Proposal</h3>
            <p className="text-sm text-slate-600">Choose a proposal above to view its task timeline</p>
          </CardContent>
        </Card>
      )}

      {tasks.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <h4 className="font-semibold text-slate-900 mb-3">Legend</h4>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span className="text-slate-700">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500" />
                <span className="text-slate-700">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-400" />
                <span className="text-slate-700">Not Started</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span className="text-slate-700">Overdue</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}