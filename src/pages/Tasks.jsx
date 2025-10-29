import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileContainer, MobileGrid, MobileSection } from "../components/ui/mobile-container";
import { 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Users,
  List,
  LayoutGrid,
  Target
} from "lucide-react";
import TaskForm from "../components/tasks/TaskForm";
import TaskList from "../components/tasks/TaskList";
import TaskBoard from "../components/tasks/TaskBoard";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TasksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterProposal, setFilterProposal] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [selectedTab, setSelectedTab] = useState("my-tasks");

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: proposals } = useQuery({
    queryKey: ['proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-updated_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id
  });

  const { data: allTasks, isLoading } = useQuery({
    queryKey: ['all-tasks', organization?.id],
    queryFn: async () => {
      if (!organization?.id || proposals.length === 0) return [];
      
      const tasks = [];
      for (const proposal of proposals) {
        const proposalTasks = await base44.entities.ProposalTask.filter(
          { proposal_id: proposal.id },
          '-created_date'
        );
        
        // Attach proposal name to each task
        tasks.push(...proposalTasks.map(task => ({
          ...task,
          proposal_name: proposal.proposal_name
        })));
      }
      return tasks;
    },
    initialData: [],
    enabled: !!organization?.id && proposals.length > 0
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      await base44.entities.ProposalTask.delete(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
    }
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }) => {
      const updateData = { status };
      if (status === "completed") {
        updateData.completed_date = new Date().toISOString();
      }
      await base44.entities.ProposalTask.update(taskId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
    }
  });

  const handleTaskSave = () => {
    queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const handleTaskEdit = (task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleTaskDelete = async (task) => {
    if (confirm(`Delete task "${task.title}"?`)) {
      deleteTaskMutation.mutate(task.id);
    }
  };

  const handleTaskStatusChange = (task, newStatus) => {
    updateTaskStatusMutation.mutate({ taskId: task.id, status: newStatus });
  };

  const handleTaskClick = (task) => {
    // Navigate to proposal builder with task details
    if (task.proposal_id) {
      navigate(createPageUrl(`ProposalBuilder?id=${task.proposal_id}`));
    }
  };

  // Filter tasks based on tab
  const myTasks = allTasks.filter(task => task.assigned_to_email === user?.email);
  const teamTasks = allTasks.filter(task => task.assigned_to_email !== user?.email);
  
  const tasksToShow = selectedTab === "my-tasks" ? myTasks : 
                      selectedTab === "team-tasks" ? teamTasks : 
                      allTasks;

  // Apply additional filters
  const filteredTasks = tasksToShow.filter(task => {
    const matchesSearch = !searchQuery || 
      task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.proposal_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    const matchesProposal = filterProposal === "all" || task.proposal_id === filterProposal;

    return matchesSearch && matchesStatus && matchesPriority && matchesProposal;
  });

  // Calculate stats
  const stats = {
    myTotal: myTasks.length,
    myInProgress: myTasks.filter(t => t.status === "in_progress").length,
    myCompleted: myTasks.filter(t => t.status === "completed").length,
    myOverdue: myTasks.filter(t => {
      if (t.status === "completed" || !t.due_date) return false;
      return new Date(t.due_date) < new Date();
    }).length,
    teamTotal: allTasks.length,
    teamInProgress: allTasks.filter(t => t.status === "in_progress").length
  };

  return (
    <MobileContainer>
      <MobileSection
        title="Task Management"
        description="Track and manage all proposal tasks across your organization"
        actions={
          <Button onClick={() => { setEditingTask(null); setShowTaskForm(true); }}>
            <Plus className="w-5 h-5 mr-2" />
            New Task
          </Button>
        }
      />

      {/* Statistics Cards */}
      <MobileGrid cols="4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{stats.myTotal}</p>
            <p className="text-sm text-slate-600 mt-1">My Tasks</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600">{stats.myInProgress}</p>
            <p className="text-sm text-slate-600 mt-1">In Progress</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.myCompleted}</p>
            <p className="text-sm text-slate-600 mt-1">Completed</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600">{stats.myOverdue}</p>
            <p className="text-sm text-slate-600 mt-1">Overdue</p>
          </CardContent>
        </Card>
      </MobileGrid>

      {/* Main Content */}
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="my-tasks">My Tasks ({stats.myTotal})</TabsTrigger>
              <TabsTrigger value="team-tasks">Team Tasks ({teamTasks.length})</TabsTrigger>
              <TabsTrigger value="all-tasks">All Tasks ({stats.teamTotal})</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">In Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterProposal} onValueChange={setFilterProposal}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Proposal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Proposals</SelectItem>
                {proposals.map(proposal => (
                  <SelectItem key={proposal.id} value={proposal.id}>
                    {proposal.proposal_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "board" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("board")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-slate-600 mt-4">Loading tasks...</p>
            </div>
          ) : viewMode === "list" ? (
            <TaskList
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              onTaskEdit={handleTaskEdit}
              onTaskDelete={handleTaskDelete}
              onTaskStatusChange={handleTaskStatusChange}
              currentUser={user}
            />
          ) : (
            <TaskBoard
              tasks={filteredTasks}
              onTaskStatusChange={handleTaskStatusChange}
              onTaskEdit={handleTaskEdit}
              onTaskDelete={handleTaskDelete}
              onTaskClick={handleTaskClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Task Form Dialog */}
      {showTaskForm && proposals.length > 0 && (
        <TaskForm
          open={showTaskForm}
          onOpenChange={(open) => {
            setShowTaskForm(open);
            if (!open) setEditingTask(null);
          }}
          proposal={proposals[0]} // Default to first proposal, or could add proposal selector
          task={editingTask}
          onSave={handleTaskSave}
          user={user}
          organization={organization}
        />
      )}
    </MobileContainer>
  );
}