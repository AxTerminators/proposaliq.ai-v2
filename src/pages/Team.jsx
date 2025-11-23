import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Shield, UserPlus, Trash2, Edit, Plus } from "lucide-react"; // Added Plus icon
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
  const [targetClientOrgId, setTargetClientOrgId] = useState(null); // New state

  const urlParams = new URLSearchParams(window.location.search);
  const clientOrgIdFromUrl = urlParams.get('clientOrgId');

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // NEW: If clientOrgId in URL, load that organization instead
        if (clientOrgIdFromUrl) {
          const clientOrgs = await base44.entities.Organization.filter({
            id: clientOrgIdFromUrl
          });
          if (clientOrgs.length > 0) {
            setOrganization(clientOrgs[0]);
            setTargetClientOrgId(clientOrgIdFromUrl);
            return; // Exit early as organization is found
          }
        }

        const org = await getUserActiveOrganization(currentUser);
        if (org) {
          setOrganization(org);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, [clientOrgIdFromUrl]); // Added clientOrgIdFromUrl to dependencies

  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });

  // Filter team members who have access to this organization
  const teamMembers = React.useMemo(() => { // Using React.useMemo
    if (!organization?.id || !allUsers) return [];

    return allUsers.filter(u => {
      // Include if user created the org
      if (u.email === organization.created_by) return true;

      // Include if user has this org in client_accesses
      if (u.client_accesses?.some(acc => acc.organization_id === organization.id)) {
        return true;
      }

      return false;
    });
  }, [allUsers, organization]); // Dependencies for memoization

  // Removed getRoleColor and getUserRoleInOrg as they are no longer used in the new rendering logic

  if (!organization) { // Simplified condition from (!organization || !user)
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
          <p className="text-slate-600">
            {targetClientOrgId
              ? `Managing users for ${organization.organization_name}`
              : 'Manage your team members and permissions'
            }
          </p>
          {organization.organization_type === 'client_organization' && (
            <Badge className="mt-2 bg-blue-100 text-blue-700">
              Client Workspace
            </Badge>
          )}
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <Plus className="w-5 h-5 mr-2" /> {/* Changed UserPlus to Plus */}
          Invite User
        </Button>
      </div>

      {isLoadingUsers ? ( // Changed loadingUsers to isLoadingUsers
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : teamMembers.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Team Members</h3> {/* Updated text */}
            <p className="text-slate-600 mb-6">Invite users to collaborate on proposals</p> {/* Updated text */}
            <Button onClick={() => setShowInviteDialog(true)}>
              <Plus className="w-5 h-5 mr-2" /> {/* Changed UserPlus to Plus */}
              Invite Your First Team Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member) => {
            const isOwner = member.email === organization.created_by;
            const clientAccess = member.client_accesses?.find(acc => acc.organization_id === organization.id);
            const roleLabel = isOwner ? 'Owner' : clientAccess?.role?.replace('_', ' ') || 'Member'; // Corrected role mapping

            return (
              <Card key={member.id} className="border-none shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6"> {/* Simplified to single CardContent */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">
                        {member.full_name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{member.full_name}</h3>
                      <p className="text-sm text-slate-600 truncate">{member.email}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className={isOwner ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>
                          {roleLabel}
                        </Badge>
                        {member.role === 'admin' && ( // Moved platform admin check here
                          <Badge className="bg-red-100 text-red-700">
                            Admin
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* InviteUserDialog changes */}
      <InviteUserDialog
        isOpen={showInviteDialog} // Changed prop name to isOpen
        onClose={() => {
          queryClient.invalidateQueries({ queryKey: ['all-users'] }); // Invalidate queries on close (success or cancel)
          setShowInviteDialog(false);
        }}
        organization={organization}
        // Removed onSuccess prop based on outline
      />
    </div>
  );
}