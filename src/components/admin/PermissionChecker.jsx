import React from "react";
import { base44 } from "@/api/base44Client";

// Comprehensive role-based permission system
export const ROLE_PERMISSIONS = {
  super_admin: {
    label: "Super Admin",
    description: "Full system access and control",
    permissions: ["all"]
  },
  operations_admin: {
    label: "Operations Admin",
    description: "Manage users, subscriptions, and system health",
    permissions: ["manage_users", "view_users", "manage_subscriptions", "view_subscriptions", "view_audit_logs", "view_system_health", "manage_feedback"]
  },
  content_manager: {
    label: "Content Manager",
    description: "Manage content library and templates",
    permissions: ["manage_content", "view_content", "manage_templates", "manage_email_templates"]
  },
  billing_manager: {
    label: "Billing Manager",
    description: "Manage billing, subscriptions, and payments",
    permissions: ["manage_billing", "view_billing", "manage_subscriptions", "view_subscriptions", "manage_payments", "view_reports"]
  },
  ai_manager: {
    label: "AI Manager",
    description: "Configure AI settings and models",
    permissions: ["manage_ai_config", "view_ai_config", "view_token_usage", "manage_ai_models"]
  },
  security_officer: {
    label: "Security Officer",
    description: "Manage security settings and audit logs",
    permissions: ["manage_security", "view_security", "view_audit_logs", "manage_audit_logs", "manage_mfa", "view_system_health"]
  },
  reviewer: {
    label: "Reviewer",
    description: "Review and approve content changes",
    permissions: ["review_content", "view_content", "view_audit_logs", "view_users"]
  },
  tech_support: {
    label: "Tech Support",
    description: "View system health and logs for support",
    permissions: ["view_system_health", "view_audit_logs", "view_users", "view_subscriptions", "manage_feedback"]
  },
  marketing_manager: {
    label: "Marketing Manager",
    description: "Manage marketing campaigns and analytics",
    permissions: ["manage_marketing", "view_marketing", "view_analytics", "manage_email_campaigns", "manage_email_templates", "view_reports", "view_users"]
  },
  workflow_manager: {
    label: "Workflow Manager",
    description: "Configure workflows and automations",
    permissions: ["manage_workflows", "view_workflows", "manage_automation", "view_reports"]
  },
  // Default admin role for users with role='admin' but no admin_role
  default_admin: {
    label: "Admin",
    description: "Basic admin access with view permissions",
    permissions: ["view_users", "view_subscriptions", "view_content", "view_audit_logs", "view_system_health", "view_reports"]
  }
};

// Permission descriptions for better understanding
export const PERMISSION_DESCRIPTIONS = {
  // User Management
  "manage_users": "Create, edit, and delete user accounts",
  "view_users": "View user information and lists",
  
  // Subscription/Billing
  "manage_subscriptions": "Modify subscription plans and limits",
  "view_subscriptions": "View subscription details",
  "manage_billing": "Manage billing settings and invoices",
  "view_billing": "View billing information",
  "manage_payments": "Process payments and refunds",
  
  // Content
  "manage_content": "Create, edit, and delete content",
  "view_content": "View content library",
  "manage_templates": "Create and edit templates",
  "manage_email_templates": "Create and edit email templates",
  
  // AI & Configuration
  "manage_ai_config": "Configure AI settings and models",
  "view_ai_config": "View AI configuration",
  "view_token_usage": "View token usage statistics",
  "manage_ai_models": "Add/remove AI models",
  
  // Security & Audit
  "manage_security": "Configure security settings",
  "view_security": "View security settings",
  "view_audit_logs": "View system audit logs",
  "manage_audit_logs": "Manage and export audit logs",
  "manage_mfa": "Configure multi-factor authentication",
  
  // System
  "view_system_health": "View system health metrics",
  "view_reports": "View analytics and reports",
  "manage_reports": "Create and export reports",
  
  // Marketing
  "manage_marketing": "Create and manage campaigns",
  "view_marketing": "View marketing data",
  "view_analytics": "View analytics dashboards",
  "manage_email_campaigns": "Create and send email campaigns",
  
  // Workflows
  "manage_workflows": "Create and edit workflows",
  "view_workflows": "View workflow configurations",
  "manage_automation": "Configure automation rules",
  
  // Feedback
  "manage_feedback": "Respond to and manage user feedback",
  "view_feedback": "View user feedback",
  
  // Reviews
  "review_content": "Review and approve content changes",
  
  // Special
  "all": "Full access to all features"
};

// Check if user has a specific permission
export const hasPermission = (user, permission) => {
  // First check if user is an admin
  if (user?.role !== 'admin') return false;
  
  // Get the admin_role, or use 'default_admin' for admins without a specific role
  const roleKey = user.admin_role || 'default_admin';
  const role = ROLE_PERMISSIONS[roleKey];
  
  if (!role) return false;
  
  // Super admin has all permissions
  if (role.permissions.includes("all")) return true;
  
  return role.permissions.includes(permission);
};

// Check if user has ANY of the specified permissions
export const hasAnyPermission = (user, permissions) => {
  if (!Array.isArray(permissions)) return false;
  return permissions.some(permission => hasPermission(user, permission));
};

// Check if user has ALL of the specified permissions
export const hasAllPermissions = (user, permissions) => {
  if (!Array.isArray(permissions)) return false;
  return permissions.every(permission => hasPermission(user, permission));
};

// Check if user has any admin role (updated to handle users with role='admin' but no admin_role)
export const isAdmin = (user) => {
  // Check if user has the basic admin role
  return user?.role === 'admin';
};

// Get user's role label
export const getRoleLabel = (adminRole) => {
  if (!adminRole) return "Admin";
  return ROLE_PERMISSIONS[adminRole]?.label || "Admin";
};

// Get user's role description
export const getRoleDescription = (adminRole) => {
  if (!adminRole) return "Basic admin access with view permissions";
  return ROLE_PERMISSIONS[adminRole]?.description || "";
};

// Get all permissions for a role
export const getRolePermissions = (adminRole) => {
  if (!adminRole) return ROLE_PERMISSIONS.default_admin.permissions;
  return ROLE_PERMISSIONS[adminRole]?.permissions || [];
};

// Check if user can edit (for backwards compatibility)
export const canEdit = (user) => {
  return hasPermission(user, "manage_users") || hasPermission(user, "all");
};

// Check if user can delete (for backwards compatibility)
export const canDelete = (user) => {
  return hasPermission(user, "manage_users") || hasPermission(user, "all");
};

// Log admin action to audit log
export const logAdminAction = async (action, details, targetUser = null) => {
  try {
    const currentUser = await base44.auth.me();
    await base44.entities.AuditLog.create({
      admin_email: currentUser.email,
      admin_role: currentUser.admin_role || 'default_admin',
      action_type: action,
      target_entity: targetUser,
      details: typeof details === 'string' ? details : JSON.stringify(details),
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error logging admin action:", error);
  }
};

// Permission Checker Component - Guards entire pages/sections
export const PermissionChecker = ({ children, requiredRole, requiredPermission, requiredPermissions, requireAll = false }) => {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user has the required role
  if (requiredRole === "admin" && !isAdmin(currentUser)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center max-w-md p-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-6">
            You don't have permission to access the Admin Portal. Please contact your system administrator.
          </p>
          <a
            href="/Dashboard"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Check if user has the required single permission
  if (requiredPermission && !hasPermission(currentUser, requiredPermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50">
        <div className="text-center max-w-md p-8">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Insufficient Permissions</h1>
          <p className="text-slate-600 mb-2">
            Your admin role ({getRoleLabel(currentUser.admin_role)}) doesn't have permission to access this feature.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Required permission: <span className="font-mono bg-slate-100 px-2 py-1 rounded">{requiredPermission}</span>
          </p>
          <a
            href="/AdminPortal"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Admin Portal
          </a>
        </div>
      </div>
    );
  }

  // Check if user has the required multiple permissions
  if (requiredPermissions && Array.isArray(requiredPermissions)) {
    const hasAccess = requireAll 
      ? hasAllPermissions(currentUser, requiredPermissions)
      : hasAnyPermission(currentUser, requiredPermissions);

    if (!hasAccess) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50">
          <div className="text-center max-w-md p-8">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Insufficient Permissions</h1>
            <p className="text-slate-600 mb-2">
              Your admin role ({getRoleLabel(currentUser.admin_role)}) doesn't have the required permissions.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Required: {requireAll ? 'All of' : 'Any of'} these permissions:
            </p>
            <div className="text-xs bg-slate-100 px-3 py-2 rounded mb-6 text-left">
              {requiredPermissions.map(perm => (
                <div key={perm} className="font-mono py-1">• {perm}</div>
              ))}
            </div>
            <a
              href="/AdminPortal"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Admin Portal
            </a>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default PermissionChecker;