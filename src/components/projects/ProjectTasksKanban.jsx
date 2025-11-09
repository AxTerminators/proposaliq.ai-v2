import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import KanbanColumn from "../proposals/KanbanColumn";
import ProjectTaskCard from "./ProjectTaskCard";
import ProjectTaskModal from "./ProjectTaskModal";

export default function ProjectTasksKanban({ organization, user, kanbanConfig }) {
  const queryClient = useQueryClient();
  
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  // Fetch project tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['project-tasks', organization?.id, kanbanConfig?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const filter = { organization_id: organization.id };
      if (kanbanConfig?.id) {
        filter.board_id = kanbanConfig.id;
      }
      
      return base44.entities.ProjectTask.filter(filter, '-created_date');
    },
    enabled: !!organization?.id,
  });

  const columns = kanbanConfig?.columns || [];

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = !searchQuery ||
        task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAssignee = filterAssignee === "all" || task.assigned_to_email === filterAssignee;
      const matchesPriority = filterPriority === "all" || task.priority === filterPriority;

      return matchesSearch && matchesAssignee && matchesPriority;
    });
  }, [tasks, searchQuery, filterAssignee, filterPriority]);

  // Get unique assignees for filter
  const uniqueAssignees = useMemo(() => {
    const assignees = tasks
      .map(t => t.assigned_to_email)
      .filter(Boolean);
    return [...new Set(assignees)].sort();
  }, [tasks]);

  // Assign tasks to columns
  const getTasksForColumn = useCallback((column) => {
    return filteredTasks.filter(task => {
      return task.current_column_id === column.id;
    });
  }, [filteredTasks]);

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }) => {
      return base44.entities.ProjectTask.update(taskId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
    },
  });

  // Handle drag and drop
  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const task = tasks.find(t => t.id === draggableId);
    if (!task) return;

    const destinationColumn = columns.find(col => col.id === destination.droppableId);
    if (!destinationColumn) return;

    // Update task's column
    await updateTaskMutation.mutateAsync({
      taskId: task.id,
      updates: {
        current_column_id: destinationColumn.id,
        manual_order: destination.index
      }
    });
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setShowTaskModal(true);
  };

  const handleToggleTaskSelection = (taskId) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterAssignee("all");
    setFilterPriority("all");
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (filterAssignee !== "all") count++;
    if (filterPriority !== "all") count++;
    return count;
  }, [searchQuery, filterAssignee, filterPriority]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Project Tasks</h2>
            <Button
              onClick={handleCreateTask}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-white text-blue-600 rounded-full text-xs font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 text-sm">Filters</h3>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                    <X className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Assignees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {uniqueAssignees.map(email => (
                      <SelectItem key={email} value={email}>{email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden bg-slate-100">
        <div className="h-full overflow-x-auto overflow-y-visible p-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 h-full" style={{ minWidth: 'min-content' }}>
              {columns.map((column, index) => {
                const columnTasks = getTasksForColumn(column);

                return (
                  <Droppable key={column.id} droppableId={column.id} type="card">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-shrink-0 w-80 bg-white rounded-xl border-2 border-slate-200 flex flex-col",
                          snapshot.isDraggingOver && "border-blue-400 bg-blue-50"
                        )}
                      >
                        {/* Column Header */}
                        <div className={cn(
                          "p-4 border-b border-slate-200 bg-gradient-to-r rounded-t-xl",
                          column.color || "from-slate-400 to-slate-600"
                        )}>
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-white">
                              {column.label}
                            </h3>
                            <span className="px-2 py-1 bg-white/20 rounded-full text-white text-sm font-semibold">
                              {columnTasks.length}
                            </span>
                          </div>
                        </div>

                        {/* Column Content */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                          {columnTasks.map((task, taskIndex) => (
                            <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                              {(provided, snapshot) => (
                                <ProjectTaskCard
                                  task={task}
                                  onClick={handleTaskClick}
                                  provided={provided}
                                  snapshot={snapshot}
                                  isSelected={selectedTaskIds.includes(task.id)}
                                  onToggleSelection={handleToggleTaskSelection}
                                />
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        </div>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <ProjectTaskModal
          task={selectedTask}
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          organization={organization}
          kanbanConfig={kanbanConfig}
        />
      )}
    </div>
  );
}