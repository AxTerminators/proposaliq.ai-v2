// Application role permissions for subscriber team members
export const APP_ROLE_PERMISSIONS = {
  organization_owner: {
    label: "Organization Owner",
    description: "Full administrative control: billing, subscriptions, team management, and all proposal capabilities",
    color: "indigo",
    capabilities: {
      // Organization-level admin
      canManageSubscription: true,
      canAccessBilling: true,
      canEditOrganization: true,
      canDeleteAccount: true,
      canManageAllUsers: true,
      canAssignAnyRole: true,
      
      // Inherited from Proposal Manager
      canCreateProposal: true,
      canDeleteProposal: true,
      canAssignRoles: true,
      canManageTeam: true,
      canEditAllSections: true,
      canApprove: true,
      canViewReports: true,
      canManageResources: true,
      canInviteUsers: true
    }
  },
  proposal_manager: {
    label: "Proposal Manager",
    description: "Create proposals, assign roles, set deadlines, approve final drafts",
    color: "blue",
    capabilities: {
      canCreateProposal: true,
      canDeleteProposal: true,
      canAssignRoles: true,
      canManageTeam: true,
      canEditAllSections: true,
      canApprove: true,
      canManageBilling: false,
      canViewReports: true,
      canManageResources: true,
      canInviteUsers: true
    }
  },
  writer: {
    label: "Writer / Contributor",
    description: "Write and edit assigned sections, upload materials, comment",
    color: "green",
    capabilities: {
      canCreateProposal: false,
      canDeleteProposal: false,
      canAssignRoles: false,
      canManageTeam: false,
      canEditAllSections: false,
      canEditAssignedSections: true,
      canApprove: false,
      canManageBilling: false,
      canViewReports: false,
      canManageResources: true,
      canInviteUsers: false
    }
  },
  reviewer: {
    label: "Reviewer / Approver",
    description: "Read, comment, track changes, approve or reject sections",
    color: "purple",
    capabilities: {
      canCreateProposal: false,
      canDeleteProposal: false,
      canAssignRoles: false,
      canManageTeam: false,
      canEditAllSections: false,
      canApprove: true,
      canComment: true,
      canManageBilling: false,
      canViewReports: true,
      canManageResources: false,
      canInviteUsers: false
    }
  },
  guest: {
    label: "Guest / External Partner",
    description: "Limited access to specific proposals only",
    color: "amber",
    capabilities: {
      canCreateProposal: false,
      canDeleteProposal: false,
      canAssignRoles: false,
      canManageTeam: false,
      canEditAllSections: false,
      canApprove: false,
      canComment: true,
      canManageBilling: false,
      canViewReports: false,
      canManageResources: false,
      canInviteUsers: false
    }
  },
  viewer: {
    label: "Viewer / Read-Only",
    description: "View final or approved proposals only",
    color: "slate",
    capabilities: {
      canCreateProposal: false,
      canDeleteProposal: false,
      canAssignRoles: false,
      canManageTeam: false,
      canEditAllSections: false,
      canApprove: false,
      canManageBilling: false,
      canViewReports: false,
      canManageResources: false,
      canInviteUsers: false
    }
  }
};

export const hasAppPermission = (userRole, permission) => {
  if (!userRole) return false;
  const rolePermissions = APP_ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) return false;
  return rolePermissions.capabilities[permission] === true;
};

export const canAccessProposal = (userRole, proposal, userId) => {
  // Organization owners have access to everything
  if (userRole === 'organization_owner') return true;
  
  // Proposal managers and their org members can access their org's proposals
  if (userRole === 'proposal_manager') return true;
  if (userRole === 'writer' || userRole === 'reviewer') return true;
  if (userRole === 'viewer') return proposal.status === 'submitted' || proposal.status === 'won';
  if (userRole === 'guest') {
    // Guest can only access if explicitly granted (would need proposal.shared_with_users array)
    return false; // Implement explicit sharing logic later
  }
  return false;
};

export const isOrganizationOwner = (userRole) => {
  return userRole === 'organization_owner';
};