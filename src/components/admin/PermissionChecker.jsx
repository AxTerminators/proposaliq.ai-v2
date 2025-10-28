// Role-based permission checker utility
export const ROLE_PERMISSIONS = {
  super_admin: {
    label: "App Owner / Super Admin",
    color: "red",
    modules: ["all"],
    canEdit: ["all"],
    canDelete: ["all"],
    canImpersonate: true,
    canManageRoles: true,
    canAccessBilling: true,
    canConfigureAI: true,
    canAccessSecurity: true,
    canAccessSystem: true
  },
  operations_admin: {
    label: "Operations Admin",
    color: "blue",
    modules: ["subscribers", "roles", "workflow", "reports", "content"],
    canEdit: ["subscribers", "roles", "workflow", "content"],
    canDelete: ["subscribers"],
    canImpersonate: false,
    canManageRoles: true,
    canAccessBilling: true,
    canConfigureAI: false,
    canAccessSecurity: "read",
    canAccessSystem: false
  },
  content_manager: {
    label: "Content Manager",
    color: "purple",
    modules: ["content", "workflow"],
    canEdit: ["content"],
    canDelete: ["content"],
    canImpersonate: false,
    canManageRoles: false,
    canAccessBilling: false,
    canConfigureAI: false,
    canAccessSecurity: false,
    canAccessSystem: false
  },
  billing_manager: {
    label: "Billing & Customer Manager",
    color: "green",
    modules: ["subscribers", "billing"],
    canEdit: ["billing", "subscribers"],
    canDelete: [],
    canImpersonate: false,
    canManageRoles: false,
    canAccessBilling: true,
    canConfigureAI: false,
    canAccessSecurity: false,
    canAccessSystem: false
  },
  ai_manager: {
    label: "AI & Automation Manager",
    color: "indigo",
    modules: ["ai", "reports"],
    canEdit: ["ai"],
    canDelete: [],
    canImpersonate: false,
    canManageRoles: false,
    canAccessBilling: false,
    canConfigureAI: true,
    canAccessSecurity: false,
    canAccessSystem: false
  },
  security_officer: {
    label: "Security & Compliance Officer",
    color: "orange",
    modules: ["security", "audit"],
    canEdit: ["security"],
    canDelete: [],
    canImpersonate: false,
    canManageRoles: false,
    canAccessBilling: false,
    canConfigureAI: false,
    canAccessSecurity: true,
    canAccessSystem: false
  },
  reviewer: {
    label: "Reviewer / Executive Viewer",
    color: "slate",
    modules: ["reports", "workflow"],
    canEdit: [],
    canDelete: [],
    canImpersonate: false,
    canManageRoles: false,
    canAccessBilling: "read",
    canConfigureAI: false,
    canAccessSecurity: "read",
    canAccessSystem: false
  },
  tech_support: {
    label: "Technical Support Admin",
    color: "cyan",
    modules: ["subscribers", "system"],
    canEdit: ["subscribers"],
    canDelete: [],
    canImpersonate: true,
    canManageRoles: false,
    canAccessBilling: false,
    canConfigureAI: false,
    canAccessSecurity: false,
    canAccessSystem: true
  },
  marketing_manager: {
    label: "Marketing / Communications Manager",
    color: "pink",
    modules: ["marketing"],
    canEdit: ["marketing"],
    canDelete: [],
    canImpersonate: false,
    canManageRoles: false,
    canAccessBilling: false,
    canConfigureAI: false,
    canAccessSecurity: false,
    canAccessSystem: false
  }
};

export const hasPermission = (userRole, requiredPermission) => {
  if (!userRole || userRole === 'user') return false;
  if (userRole === 'super_admin') return true;
  
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;
  
  return permissions[requiredPermission] === true || 
         permissions[requiredPermission] === "read";
};

export const canAccessModule = (userRole, moduleName) => {
  if (!userRole || userRole === 'user') return false;
  if (userRole === 'super_admin') return true;
  
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;
  
  return permissions.modules.includes(moduleName) || 
         permissions.modules.includes("all");
};

export const canEdit = (userRole, entityType) => {
  if (!userRole || userRole === 'user') return false;
  if (userRole === 'super_admin') return true;
  
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;
  
  return permissions.canEdit.includes(entityType) || 
         permissions.canEdit.includes("all");
};

export const canDelete = (userRole, entityType) => {
  if (!userRole || userRole === 'user') return false;
  if (userRole === 'super_admin') return true;
  
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;
  
  return permissions.canDelete.includes(entityType) || 
         permissions.canDelete.includes("all");
};

export const logAdminAction = async (actionType, details, targetEntity = null) => {
  try {
    const { base44 } = await import('@/api/base44Client');
    const user = await base44.auth.me();
    
    await base44.entities.AuditLog.create({
      admin_email: user.email,
      admin_role: user.admin_role || 'user',
      action_type: actionType,
      target_entity: targetEntity,
      details: JSON.stringify(details),
      ip_address: "client", // Would need server-side implementation for real IP
      success: true
    });
  } catch (error) {
    console.error("Error logging admin action:", error);
  }
};