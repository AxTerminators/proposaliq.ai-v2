
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileContainer, MobileGrid, MobileSection } from "../components/ui/mobile-container";
import {
  Users,
  UserPlus,
  Mail,
  Crown,
  Shield,
  Activity,
  TrendingUp,
  Clock,
  FileText,
  MessageSquare,
  CheckCircle2,
  Search,
  Filter,
  BarChart3,
  Target,
  Calendar,
  Award,
  Zap,
  Edit,
  MoreVertical
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_ROLE_PERMISSIONS, hasAppPermission, isOrganizationOwner } from "../components/settings/AppRoleChecker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

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

  // Get team members
  const { data: teamMembers } = useQuery({
    queryKey: ['team-members', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const allUsers = await base44.entities.User.list('-created_date');
      // In production, filter by organization
      return allUsers;
    },
    initialData: [],
    enabled: !!organization?.id
  });

  // Get activity logs
  const { data: recentActivity } = useQuery({
    queryKey: ['team-activity', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const proposals = await base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date',
        10
      );
      
      const logs = [];
      for (const proposal of proposals) {
        const activity = await base44.entities.ActivityLog.filter(
          { proposal_id: proposal.id },
          '-created_date',
          5
        );
        logs.push(...activity);
      }
      
      return logs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 20);
    },
    initialData: [],
    enabled: !!organization?.id
  });

  // Get proposals for team stats
  const { data: proposals } = useQuery({
    queryKey: ['proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id
  });

  // Get tasks
  const { data: tasks } = useQuery({
    queryKey: ['all-tasks', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const allTasks = [];
      for (const proposal of proposals) {
        const proposalTasks = await base44.entities.ProposalTask.filter(
          { proposal_id: proposal.id },
          '-created_date'
        );
        allTasks.push(...proposalTasks);
      }
      return allTasks;
    },
    initialData: [],
    enabled: !!organization?.id && proposals.length > 0
  });

  // Get comments
  const { data: comments } = useQuery({
    queryKey: ['all-comments', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const allComments = [];
      for (const proposal of proposals) {
        const proposalComments = await base44.entities.ProposalComment.filter(
          { proposal_id: proposal.id },
          '-created_date',
          50
        );
        allComments.push(...proposalComments);
      }
      return allComments;
    },
    initialData: [],
    enabled: !!organization?.id && proposals.length > 0
  });

  const userIsOwner = isOrganizationOwner(user?.organization_app_role);
  const canManageTeam = hasAppPermission(user?.organization_app_role, 'canManageTeam');
  const canInviteUsers = hasAppPermission(user?.organization_app_role, 'canInviteUsers');

  // Calculate team statistics
  const stats = {
    totalMembers: teamMembers.length,
    activeProposals: proposals.filter(p => ['draft', 'in_progress'].includes(p.status)).length,
    completedTasks: tasks.filter(t => t.status === 'completed').length,
    pendingTasks: tasks.filter(t => t.status !== 'completed').length,
    totalComments: comments.length,
    activeToday: recentActivity.filter(a => {
      const today = new Date();
      const activityDate = new Date(a.created_date);
      return activityDate.toDateString() === today.toDateString();
    }).length
  };

  // Member activity summary
  const memberActivity = teamMembers.map(member => {
    const memberTasks = tasks.filter(t => t.assigned_to_email === member.email);
    const memberComments = comments.filter(c => c.author_email === member.email);
    const memberActivity = recentActivity.filter(a => a.user_email === member.email);
    
    return {
      ...member,
      tasksCompleted: memberTasks.filter(t => t.status === 'completed').length,
      tasksPending: memberTasks.filter(t => t.status !== 'completed').length,
      commentsCount: memberComments.length,
      lastActive: memberActivity[0]?.created_date || member.last_login,
      activityCount: memberActivity.length
    };
  });

  // Filter members
  const filteredMembers = memberActivity.filter(member => {
    const matchesSearch = !searchQuery || 
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || member.organization_app_role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const handleViewMember = (member) => {
    setSelectedMember(member);
    setShowMemberDialog(true);
  };

  return (
    <MobileContainer>
      <MobileSection
        title="Team Collaboration"
        description={`${organization?.organization_name || 'Your'} Team Dashboard`}
        actions={
          canInviteUsers && (
            <Button 
              onClick={() => setShowInviteDialog(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 min-h-[44px]"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Invite Member
            </Button>
          )
        }
      />

      {/* Statistics Cards */}
      <MobileGrid cols="4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{stats.totalMembers}</p>
            <p className="text-sm text-slate-600 mt-1">Team Members</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.activeToday}</p>
            <p className="text-sm text-slate-600 mt-1">Active Today</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600">{stats.activeProposals}</p>
            <p className="text-sm text-slate-600 mt-1">Active Proposals</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-amber-600">{stats.completedTasks}</p>
            <p className="text-sm text-slate-600 mt-1">Tasks Completed</p>
          </CardContent>
        </Card>
      </MobileGrid>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Team Members - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Team Members</CardTitle>
                  <Badge variant="secondary">{filteredMembers.length} members</Badge>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="organization_owner">Organization Owner</SelectItem>
                      <SelectItem value="proposal_manager">Proposal Manager</SelectItem>
                      <SelectItem value="writer">Writer</SelectItem>
                      <SelectItem value="reviewer">Reviewer</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {filteredMembers.map((member) => {
                  const roleInfo = APP_ROLE_PERMISSIONS[member.organization_app_role || 'viewer'];
                  const memberIsOwner = isOrganizationOwner(member.organization_app_role);
                  
                  return (
                    <Card key={member.id} className="border-slate-200 hover:border-blue-300 transition-all cursor-pointer" onClick={() => handleViewMember(member)}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className={cn(
                            "w-12 h-12",
                            memberIsOwner ? "ring-2 ring-indigo-500" : ""
                          )}>
                            <AvatarFallback className={memberIsOwner ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white" : "bg-gradient-to-br from-blue-500 to-indigo-500 text-white"}>
                              {member.full_name?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-slate-900 truncate">{member.full_name}</h4>
                              {member.email === user?.email && (
                                <Badge variant="secondary" className="text-xs">You</Badge>
                              )}
                              {memberIsOwner && (
                                <Crown className="w-4 h-4 text-indigo-600" />
                              )}
                            </div>
                            <p className="text-sm text-slate-600 truncate">{member.email}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                              <Badge className={`bg-${roleInfo?.color}-100 text-${roleInfo?.color}-700 border-none`}>
                                {roleInfo?.label || 'Viewer'}
                              </Badge>
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {member.tasksCompleted} tasks
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {member.commentsCount} comments
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {member.lastActive && (
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(member.lastActive).toLocaleDateString()}
                              </div>
                            )}
                            {(userIsOwner || canManageTeam) && member.email !== user?.email && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewMember(member);
                                  }}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Role
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600">
                                    <Mail className="w-4 h-4 mr-2" />
                                    Send Message
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {filteredMembers.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p>No team members found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed - 1 column */}
        <div className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="p-6 space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex gap-3 pb-4 border-b border-slate-100 last:border-0">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xs">
                          {activity.user_name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900">
                          <span className="font-semibold">{activity.user_name}</span>
                          {' '}
                          <span className="text-slate-600">{activity.action_description}</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(activity.created_date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}

                  {recentActivity.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm">No recent activity</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">Team Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Pending Tasks</span>
                <Badge variant="outline">{stats.pendingTasks}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Comments</span>
                <Badge variant="outline">{stats.totalComments}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Avg Tasks/Member</span>
                <Badge variant="outline">
                  {stats.totalMembers > 0 ? (stats.completedTasks / stats.totalMembers).toFixed(1) : 0}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invite Dialog */}
      <InviteDialog
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        userRole={user?.organization_app_role}
      />

      {/* Member Details Dialog */}
      {showMemberDialog && selectedMember && (
        <MemberDetailsDialog
          member={selectedMember}
          onClose={() => {
            setShowMemberDialog(false);
            setSelectedMember(null);
          }}
          userRole={user?.organization_app_role}
          tasks={tasks.filter(t => t.assigned_to_email === selectedMember.email)}
          comments={comments.filter(c => c.author_email === selectedMember.email)}
          activity={recentActivity.filter(a => a.user_email === selectedMember.email)}
        />
      )}
    </MobileContainer>
  );
}

function InviteDialog({ isOpen, onClose, userRole }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const userIsOwner = isOrganizationOwner(userRole);

  const handleInvite = () => {
    if (!email) {
      alert("Please enter an email address");
      return;
    }

    // In production, this would send an actual invitation
    alert(`Invitation sent to ${email} with role: ${APP_ROLE_PERMISSIONS[role].label}`);
    setEmail("");
    setRole("viewer");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(APP_ROLE_PERMISSIONS).map(([roleId, roleInfo]) => {
                  if (roleId === 'organization_owner' && !userIsOwner) return null;
                  return (
                    <SelectItem key={roleId} value={roleId}>
                      {roleInfo.label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              {APP_ROLE_PERMISSIONS[role]?.description}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleInvite}>
            <Mail className="w-4 h-4 mr-2" />
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MemberDetailsDialog({ member, onClose, userRole, tasks, comments, activity }) {
  const queryClient = useQueryClient();
  const [newRole, setNewRole] = useState(member.organization_app_role || 'viewer');
  const userIsOwner = isOrganizationOwner(userRole);
  const canEdit = userIsOwner || hasAppPermission(userRole, 'canManageTeam');

  const updateRoleMutation = useMutation({
    mutationFn: (roleData) => base44.entities.User.update(member.id, { organization_app_role: roleData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      alert("✓ Role updated successfully!");
      onClose();
    }
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xl">
                {member.full_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl">{member.full_name}</DialogTitle>
              <DialogDescription>{member.email}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
              <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
              <TabsTrigger value="activity">Activity ({activity.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Role & Permissions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {canEdit ? (
                    <div className="space-y-2">
                      <Label>Assign Role</Label>
                      <Select value={newRole} onValueChange={setNewRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(APP_ROLE_PERMISSIONS).map(([roleId, roleInfo]) => {
                            if (roleId === 'organization_owner' && !userIsOwner) return null;
                            return (
                              <SelectItem key={roleId} value={roleId}>
                                {roleInfo.label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">
                        {APP_ROLE_PERMISSIONS[newRole]?.description}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Badge className={`bg-${APP_ROLE_PERMISSIONS[member.organization_app_role || 'viewer']?.color}-100`}>
                        {APP_ROLE_PERMISSIONS[member.organization_app_role || 'viewer']?.label}
                      </Badge>
                      <p className="text-sm text-slate-600 mt-2">
                        {APP_ROLE_PERMISSIONS[member.organization_app_role || 'viewer']?.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold">{member.tasksCompleted}</p>
                          <p className="text-sm text-slate-600">Tasks Completed</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Target className="w-8 h-8 text-amber-600" />
                        <div>
                          <p className="text-2xl font-bold">{member.tasksPending}</p>
                          <p className="text-sm text-slate-600">Tasks Pending</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold">{member.commentsCount}</p>
                          <p className="text-sm text-slate-600">Comments Posted</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Activity className="w-8 h-8 text-purple-600" />
                        <div>
                          <p className="text-2xl font-bold">{member.activityCount}</p>
                          <p className="text-sm text-slate-600">Recent Actions</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-3">
              {tasks.map(task => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-900">{task.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                            {task.status}
                          </Badge>
                          <Badge variant="outline">{task.priority}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {tasks.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Target className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No tasks assigned</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="comments" className="space-y-3">
              {comments.map(comment => (
                <Card key={comment.id}>
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-700">{comment.content}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(comment.created_date).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {comments.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No comments posted</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-3">
              {activity.map(act => (
                <div key={act.id} className="flex gap-3 p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-slate-900">{act.action_description}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(act.created_date).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No recent activity</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {canEdit && newRole !== member.organization_app_role && (
            <Button onClick={() => updateRoleMutation.mutate(newRole)}>
              Save Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
