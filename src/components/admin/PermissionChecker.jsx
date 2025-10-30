// Role-based permission checker utility
export const ROLE_PERMISSIONS = {
  super_admin: {
    label: "Super Admin",
    description: "Full system access and control",
    permissions: ["all"]
  },
  operations_admin: {
    label: "Operations Admin",
    description: "Manage users, subscriptions, and system health",
    permissions: ["manage_users", "manage_subscriptions", "view_audit_logs", "view_system_health"]
  },
  content_manager: {
    label: "Content Manager",
    description: "Manage content library and templates",
    permissions: ["manage_content", "manage_templates"]
  },
  billing_manager: {
    label: "Billing Manager",
    description: "Manage billing, subscriptions, and payments",
    permissions: ["manage_billing", "view_subscriptions", "manage_payments"]
  },
  ai_manager: {
    label: "AI Manager",
    description: "Configure AI settings and models",
    permissions: ["manage_ai_config", "view_token_usage"]
  },
  security_officer: {
    label: "Security Officer",
    description: "Manage security settings and audit logs",
    permissions: ["manage_security", "view_audit_logs", "manage_mfa"]
  },
  reviewer: {
    label: "Reviewer",
    description: "Review and approve content changes",
    permissions: ["review_content", "view_audit_logs"]
  },
  tech_support: {
    label: "Tech Support",
    description: "View system health and logs for support",
    permissions: ["view_system_health", "view_audit_logs", "view_users"]
  },
  marketing_manager: {
    label: "Marketing Manager",
    description: "Manage marketing campaigns and analytics",
    permissions: ["manage_marketing", "view_analytics", "manage_email_campaigns"]
  }
};

// Check if user has a specific permission
export const hasPermission = (user, permission) => {
  if (!user?.admin_role) return false;
  
  const role = ROLE_PERMISSIONS[user.admin_role];
  if (!role) return false;
  
  // Super admin has all permissions
  if (role.permissions.includes("all")) return true;
  
  return role.permissions.includes(permission);
};

// Check if user has any admin role
export const isAdmin = (user) => {
  return user?.admin_role && ROLE_PERMISSIONS[user.admin_role];
};

// Get user's role label
export const getRoleLabel = (adminRole) => {
  return ROLE_PERMISSIONS[adminRole]?.label || "Unknown Role";
};

// Permission Checker Component
export const PermissionChecker = ({ children, requiredRole, requiredPermission }) => {
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

  // Check if user has the required permission
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
          <p className="text-slate-600 mb-6">
            Your admin role doesn't have permission to access this feature. Please contact your system administrator.
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

  return children;
};

export default PermissionChecker;