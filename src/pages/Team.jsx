import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Shield, UserPlus, Trash2, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import InviteUserDialog from "../components/team/InviteUserDialog";

// Helper function to get user's active organization
async function getUserActiveOrganization(user) {
  if (!user) return null;
  let orgId = null;
  if (user.active_client_id) {
    orgId = user.active_client_id;
  } else if (user.client_accesses && user.client_accesses.length > 0) {
    orgId = user.client_accesses[0].organization_id;
  } else {
    const orgs = await base44.entities.Organization.filter(
      { created_by: user.email },
      '-created_date',
      1
    );
    if (orgs.length > 0) {
      orgId = orgs[0].id;
    }
  }
  if (orgId) {
    const orgs = await base44.entities.Organization.filter({ id: orgId });
    if (orgs.length > 0) {
      return orgs[0];
    }
  }
  return null;
}

export default function Team() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const org = await getUserActiveOrganization(currentUser);
        if (org) {
          setOrganization(org);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: allUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  // Filter team members who have access to this organization
  const teamMembers = allUsers.filter(u => {
    if (!organization?.id) return false;
    
    // Check if user has access to this organization via client_accesses
    const accesses = u.client_accesses || [];
    return accesses.some(a => a.organization_id === organization.id);
  });

  const getRoleColor = (role) => {
    const colors = {
      organization_owner: "bg-purple-100 text-purple-800",
      proposal_manager: "bg-blue-100 text-blue-800",
      capture_manager: "bg-blue-100 text-blue-800",
      writer: "bg-green-100 text-green-800",
      reviewer: "bg-amber-100 text-amber-800",
      guest: "bg-slate-100 text-slate-800",
      viewer: "bg-slate-100 text-slate-800"
    };
    return colors[role] || colors.viewer;
  };

  const getUserRoleInOrg = (user) => {
    if (!organization?.id) return "viewer";
    const access = user.client_accesses?.find(a => a.organization_id === organization.id);
    return access?.role || "viewer";
  };

  if (!organization || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Team Members</h1>
          <p className="text-slate-600">Manage your team and permissions</p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="w-5 h-5 mr-2" />
          Invite Member
        </Button>
      </div>

      {loadingUsers ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : teamMembers.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Team Members Yet</h3>
            <p className="text-slate-600 mb-6">
              Start building your team by inviting members
            </p>
            <Button onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="w-5 h-5 mr-2" />
              Invite Your First Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member) => {
            const memberRole = getUserRoleInOrg(member);
            
            return (
              <Card key={member.id} className="border-none shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {member.full_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base line-clamp-1">{member.full_name || 'User'}</CardTitle>
                        <p className="text-sm text-slate-500 line-clamp-1">{member.email}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Role</span>
                    <Badge className={getRoleColor(memberRole)}>
                      {memberRole?.replace('_', ' ')}
                    </Badge>
                  </div>

                  {member.job_title && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Title</span>
                      <span className="text-sm font-medium text-slate-900">{member.job_title}</span>
                    </div>
                  )}

                  {member.department && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Department</span>
                      <span className="text-sm font-medium text-slate-900">{member.department}</span>
                    </div>
                  )}

                  {member.role === 'admin' && (
                    <div className="pt-2 border-t">
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        <Shield className="w-3 h-3 mr-1" />
                        Platform Admin
                      </Badge>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <a
                      href={`mailto:${member.email}`}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Mail className="w-4 h-4" />
                      Send Email
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showInviteDialog && (
        <InviteUserDialog
          organization={organization}
          onClose={() => setShowInviteDialog(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['all-users'] });
            setShowInviteDialog(false);
          }}
        />
      )}
    </div>
  );
}