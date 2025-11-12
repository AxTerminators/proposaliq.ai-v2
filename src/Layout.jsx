
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Library,
  LogOut,
  Menu,
  Sparkles,
  MessageCircle,
  Shield,
  CreditCard,
  DollarSign,
  Settings,
  BarChart3,
  Download,
  Globe,
  X,
  Award,
  Users,
  Calendar,
  CheckSquare,
  ChevronsLeft,
  ChevronsRight,
  Handshake,
  Bug,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Wrench,
  FileEdit,
  TrendingUp,
  Search,
  BookOpen,
  Layers,
  FolderOpen,
  Building2,
  RefreshCw,
  ClipboardList // Added ClipboardList icon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import NotificationCenter from "./components/collaboration/NotificationCenter";
import MobileNavigation from "./components/mobile/MobileNavigation";
import GlobalSearch from "./components/proposals/GlobalSearch";
import { cn } from "@/lib/utils";
import { OrganizationProvider, useOrganization } from "./components/layout/OrganizationContext";
import OrganizationSwitcher from "./components/layout/OrganizationSwitcher";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Workspace sub-menu items
const WORKSPACE_ITEMS = [
  { title: "Pipeline", url: createPageUrl("Pipeline"), icon: TrendingUp },
  { title: "Board Management", url: createPageUrl("BoardManagement"), icon: Layers },
  { title: "Content Library", url: createPageUrl("ContentLibrary"), icon: FolderOpen },
  { title: "Resources", url: createPageUrl("Resources"), icon: Library },
  { title: "Past Performance", url: createPageUrl("PastPerformance"), icon: Award },
  { title: "Key Personnel", url: createPageUrl("KeyPersonnel"), icon: Users },
  { title: "Teaming Partners", url: createPageUrl("TeamingPartners"), icon: Handshake },
  { title: "Export Center", url: createPageUrl("ExportCenter"), icon: Download },
  { title: "Analytics", url: createPageUrl("Analytics"), icon: BarChart3 },
  { title: "Templates", url: createPageUrl("TemplateManager"), icon: FileText },
  { title: "Best Practices", url: createPageUrl("BestPractices"), icon: BookOpen },
  { title: "Search", url: createPageUrl("AdvancedSearch"), icon: Search },
];

// Tools sub-menu items
const TOOLS_ITEMS = [
  { title: "Calendar", url: createPageUrl("Calendar"), icon: Calendar },
  { title: "Tasks", url: createPageUrl("Tasks"), icon: CheckSquare },
  { title: "Discussions", url: createPageUrl("Discussions"), icon: MessageCircle },
  { title: "AI Chat", url: createPageUrl("Chat"), icon: MessageSquare },
  { title: "Cost Estimator", url: createPageUrl("CostEstimator"), icon: DollarSign },
];

// Settings sub-menu items
const SETTINGS_ITEMS = [
  { title: "Settings", url: createPageUrl("Settings"), icon: Settings },
  { title: "Team", url: createPageUrl("Team"), icon: Users },
  { title: "Feedback", url: createPageUrl("Feedback"), icon: Bug },
  { title: "System Verification", url: createPageUrl("SystemVerification"), icon: CheckSquare },
  { title: "System Docs", url: createPageUrl("SystemDocumentation"), icon: BookOpen },
];

// All possible navigation items with their visibility rules
const ALL_NAVIGATION_ITEMS = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, showFor: "all" },
  { title: "Consultant Dashboard", url: createPageUrl("ConsultantDashboard"), icon: Briefcase, showFor: "consulting_firm" },
  { title: "Proposal Builder", url: createPageUrl("ProposalBuilder"), icon: FileEdit, showFor: "all", adminOnly: true },
  { title: "Opportunities", url: createPageUrl("OpportunityFinder"), icon: Globe, superAdminOnly: true, showFor: "all" },
  { title: "Workspace", url: createPageUrl("Workspace"), icon: Briefcase, showFor: "all", hasSubMenu: true, subMenuItems: WORKSPACE_ITEMS },
  { title: "Data Calls", url: createPageUrl("DataCalls"), icon: ClipboardList, showFor: "all" }, // Changed icon to ClipboardList
  { title: "Tools", url: createPageUrl("Tools"), icon: Wrench, showFor: "all", hasSubMenu: true, subMenuItems: TOOLS_ITEMS },
  { title: "Client Workspaces", url: createPageUrl("ClientOrganizationManager"), icon: Building2, showFor: "consulting_firm" },
  { title: "Portfolio Dashboard", url: createPageUrl("ConsolidatedReporting"), icon: BarChart3, showFor: "consulting_firm" },
  { title: "Data Migration", url: createPageUrl("DataMigration"), icon: RefreshCw, showFor: "consulting_firm" },
  { title: "Clients (Legacy)", url: createPageUrl("Clients"), icon: Users, showFor: "consultant" },
  { title: "Settings", url: createPageUrl("Settings"), icon: Settings, showFor: "all", hasSubMenu: true, subMenuItems: SETTINGS_ITEMS },
];

const adminItems = [
  { title: "Admin Portal", url: createPageUrl("AdminPortal"), icon: Shield },
];

function LayoutContent({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, organization, subscription, refetch } = useOrganization();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false);
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [demoViewMode, setDemoViewMode] = React.useState(null);
  const [showGlobalSearch, setShowGlobalSearch] = React.useState(false);

  // Debug: Log current location
  React.useEffect(() => {
    console.log('[Layout] Current location:', location.pathname);
  }, [location.pathname]);

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  React.useEffect(() => {
    const isWorkspacePage = WORKSPACE_ITEMS.some(item => location.pathname === item.url);
    if (isWorkspacePage) {
      setWorkspaceOpen(true);
    }
  }, [location.pathname]);

  React.useEffect(() => {
    const isToolsPage = TOOLS_ITEMS.some(item => location.pathname === item.url);
    if (isToolsPage) {
      setToolsOpen(true);
    }
  }, [location.pathname]);

  React.useEffect(() => {
    const isSettingsPage = SETTINGS_ITEMS.some(item => location.pathname === item.url);
    if (isSettingsPage) {
      setSettingsOpen(true);
    }
  }, [location.pathname]);

  // NEW: Load demo view mode from organization
  React.useEffect(() => {
    if (organization?.organization_type === 'demo') {
      setDemoViewMode(organization.demo_view_mode || 'corporate');
    } else {
      setDemoViewMode(null);
    }
  }, [organization]);

  // NEW: Redirect to Dashboard if current page is not accessible for the current organization
  React.useEffect(() => {
    if (!organization || !user) return;

    const effectiveOrgType = organization.organization_type === 'demo'
      ? demoViewMode
      : organization.organization_type;

    const isConsultant = effectiveOrgType === 'consultancy';
    const isConsultingFirm = organization.organization_type === 'consulting_firm' ||
                             (effectiveOrgType === 'consultancy');
    const userIsAdmin = user?.role === 'admin';
    const userIsSuperAdmin = user?.admin_role === 'super_admin';

    // Combine all navigation items for easier checking
    const allNavigableItems = [
      ...ALL_NAVIGATION_ITEMS,
      ...adminItems
    ].flatMap(item => {
      if (item.hasSubMenu && item.subMenuItems) {
        return [item, ...item.subMenuItems];
      }
      return item;
    });

    const currentPageItem = allNavigableItems.find(item =>
      location.pathname === item.url
    );

    if (currentPageItem) {
      // Check if user has access to this page
      const hasAccess =
        (!currentPageItem.superAdminOnly || userIsSuperAdmin) &&
        (!currentPageItem.adminOnly || userIsAdmin) &&
        (currentPageItem.showFor === undefined || currentPageItem.showFor === "all" ||
         (currentPageItem.showFor === "consultant" && isConsultant) ||
         (currentPageItem.showFor === "corporate" && !isConsultant) ||
         (currentPageItem.showFor === "consulting_firm" && isConsultingFirm)
        );

      if (!hasAccess) {
        console.log('[Layout] ⚠️ Page not accessible for current user/organization settings, redirecting to Dashboard');
        navigate(createPageUrl("Dashboard"));
      }
    }
  }, [organization, user, location.pathname, demoViewMode, navigate]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  // NEW: Handle demo view mode switching
  const handleDemoViewModeChange = async (newMode) => {
    if (!organization || organization.organization_type !== 'demo') return;

    try {
      await base44.entities.Organization.update(organization.id, {
        demo_view_mode: newMode
      });

      setDemoViewMode(newMode);
      await refetch(); // Refresh organization data

      // Show success message
      alert(`✅ Demo view switched to ${newMode === 'consultancy' ? 'Consultant' : 'Corporate'} mode!\n\nThe navigation will update to show ${newMode === 'consultancy' ? 'client management features' : 'corporate features'}.`);
    } catch (error) {
      console.error('Error switching demo view mode:', error);
      alert('Error switching view mode: ' + error.message);
    }
  };

  // NEW: Handle organization switch
  const handleOrganizationSwitch = async (newOrgId) => {
    console.log('[Layout] Organization switched to:', newOrgId);
    await refetch(); // Refetch organization data
  };

  const tokenPercentage = subscription
    ? ((subscription.token_credits - subscription.token_credits_used) / subscription.token_credits) * 100
    : 100;

  const userIsAdmin = user?.role === 'admin';
  const userIsSuperAdmin = user?.admin_role === 'super_admin';

  const navigationItems = React.useMemo(() => {
    if (!organization) return ALL_NAVIGATION_ITEMS.filter(item => !item.showFor || item.showFor === "all");

    // NEW: For demo accounts, use demo_view_mode instead of organization_type
    const effectiveOrgType = organization.organization_type === 'demo'
      ? demoViewMode
      : organization.organization_type;

    const isConsultant = effectiveOrgType === 'consultancy';
    const isConsultingFirm = organization.organization_type === 'consulting_firm' ||
                             (effectiveOrgType === 'consultancy');

    return ALL_NAVIGATION_ITEMS.filter(item => {
      if (item.superAdminOnly && !userIsSuperAdmin) return false;
      if (item.adminOnly && !userIsAdmin) return false;
      if (item.showFor === "consultant" && !isConsultant) return false;
      if (item.showFor === "corporate" && isConsultant) return false;
      if (item.showFor === "consulting_firm" && !isConsultingFirm) return false;
      return true;
    });
  }, [organization, userIsSuperAdmin, userIsAdmin, demoViewMode]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "border-r border-slate-200 bg-white hidden lg:flex flex-col transition-all duration-300 flex-shrink-0",
            sidebarCollapsed ? "w-20" : "w-64"
          )}
        >
          <div className="border-b border-slate-200 p-6 relative flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="absolute -right-3 top-6 h-6 w-6 rounded-full border bg-white shadow-md hover:bg-slate-100 z-10"
                >
                  {sidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</p>
              </TooltipContent>
            </Tooltip>

            {!sidebarCollapsed && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-lg">ProposalIQ.ai</h2>
                    <p className="text-xs text-slate-500">AI-Powered Proposals</p>
                  </div>
                </div>

                {organization && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-900 truncate">{organization.organization_name}</p>
                    {organization.organization_type && (
                      <Badge className={cn(
                        "text-xs mt-1",
                        organization.organization_type === 'demo'
                          ? 'bg-purple-100 text-purple-700'
                          : organization.organization_type === 'consultancy' || organization.organization_type === 'consulting_firm'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                      )}>
                        {organization.organization_type === 'demo'
                          ? '🎭 Demo Account'
                          : organization.organization_type === 'consultancy'
                            ? 'Consultant'
                            : organization.organization_type === 'consulting_firm'
                              ? 'Consulting Firm'
                              : 'Corporate'}
                      </Badge>
                    )}
                  </div>
                )}

                {/* NEW: Demo View Mode Switcher */}
                {organization?.organization_type === 'demo' && demoViewMode && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg">
                    <Label className="text-xs font-semibold text-purple-900 mb-2 block">
                      🎭 Demo View Mode
                    </Label>
                    <Select
                      value={demoViewMode}
                      onValueChange={handleDemoViewModeChange}
                    >
                      <SelectTrigger className="w-full h-9 bg-white border-2 border-purple-300 hover:border-purple-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corporate">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            <span>Corporate View</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="consultancy">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-purple-600" />
                            <span>Consultant View</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-purple-700 mt-2">
                      Switch to test different features
                    </p>
                  </div>
                )}
              </>
            )}

            {sidebarCollapsed && (
              <div className="flex justify-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
              </div>
            )}
          </div>

          <div className={cn("flex-1 overflow-y-auto", sidebarCollapsed ? "px-2" : "p-3")}>
            <div className="mb-6">
              {!sidebarCollapsed && (
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                  Navigation
                </div>
              )}
              <nav className="space-y-1">
                {navigationItems.map((item) => {
                  if (item.hasSubMenu) {
                    const isOpen = item.title === "Workspace" ? workspaceOpen :
                                   item.title === "Tools" ? toolsOpen :
                                   item.title === "Settings" ? settingsOpen : false;
                    const setIsOpen = item.title === "Workspace" ? setWorkspaceOpen :
                                     item.title === "Tools" ? setToolsOpen :
                                     item.title === "Settings" ? setSettingsOpen : () => {};
                    const subItems = item.subMenuItems || [];

                    return (
                      <div key={item.title}>
                        {sidebarCollapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setIsOpen(!isOpen);
                                }}
                                className={cn(
                                  "w-full hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg flex items-center justify-center px-2 py-3",
                                  (location.pathname === item.url || subItems.some(sub => location.pathname === sub.url)) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600'
                                )}
                              >
                                <item.icon className="w-6 h-6" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p>{item.title}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsOpen(!isOpen);
                            }}
                            className={cn(
                              "w-full hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg flex items-center gap-3 px-3 py-2.5",
                              (location.pathname === item.url || subItems.some(sub => location.pathname === sub.url)) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600'
                            )}
                          >
                            <item.icon className="w-5 h-5" />
                            <span className="flex-1 text-left">{item.title}</span>
                            <ChevronDown className={cn(
                              "w-4 h-4 transition-transform",
                              isOpen && "rotate-180"
                            )} />
                          </button>
                        )}

                        {!sidebarCollapsed && isOpen && (
                          <div className="ml-4 pl-3 border-l-2 border-slate-200 space-y-1 py-1">
                            {subItems.map((subItem) => (
                              <Link
                                key={subItem.title}
                                to={subItem.url}
                                className={cn(
                                  "flex items-center gap-3 py-2 px-3 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg",
                                  location.pathname === subItem.url ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600'
                                )}
                              >
                                <subItem.icon className="w-4 h-4" />
                                <span className="text-sm">{subItem.title}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    sidebarCollapsed ? (
                      <Tooltip key={item.title}>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.url}
                            className={cn(
                              "flex items-center hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg justify-center px-2 py-3",
                              location.pathname === item.url ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600'
                            )}
                          >
                            <item.icon className="w-6 h-6" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.title}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Link
                        key={item.title}
                        to={item.url}
                        className={cn(
                          "flex items-center hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg gap-3 px-3 py-2.5",
                          location.pathname === item.url ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600'
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </Link>
                    )
                  );
                })}
              </nav>
            </div>

            {userIsAdmin && (
              <div className="mb-6">
                {!sidebarCollapsed && (
                  <div className="text-xs font-semibold text-red-500 uppercase tracking-wider px-3 py-2">
                    Admin
                  </div>
                )}
                <nav className="space-y-1">
                  {adminItems.map((item) => (
                    sidebarCollapsed ? (
                      <Tooltip key={item.title}>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.url}
                            className={cn(
                              "flex items-center hover:bg-red-50 hover:text-red-700 transition-all duration-200 rounded-lg justify-center px-2 py-3",
                              location.pathname === item.url ? 'bg-red-50 text-red-700 font-medium' : 'text-slate-600'
                            )}
                          >
                            <item.icon className="w-6 h-6" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.title}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Link
                        key={item.title}
                        to={item.url}
                        className={cn(
                          "flex items-center hover:bg-red-50 hover:text-red-700 transition-all duration-200 rounded-lg gap-3 px-3 py-2.5",
                          location.pathname === item.url ? 'bg-red-50 text-red-700 font-medium' : 'text-slate-600'
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </Link>
                    )
                  ))}
                </nav>
              </div>
            )}

            {subscription && !sidebarCollapsed && (
              <div className="mb-6">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                  Subscription
                </div>
                <div className="px-3 py-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Plan</span>
                    <Badge variant="secondary" className="capitalize">
                      {subscription.plan_type}
                    </Badge>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-600">Token Credits</span>
                      <span className="font-semibold text-slate-900">
                        {((subscription.token_credits - subscription.token_credits_used) / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all",
                          tokenPercentage > 50 ? 'bg-green-500' :
                          tokenPercentage > 20 ? 'bg-amber-500' :
                          'bg-red-500'
                        )}
                        style={{ width: `${tokenPercentage}%` }}
                      />
                    </div>
                  </div>
                  <Link to={createPageUrl("Settings")}>
                    <Button variant="outline" size="sm" className="w-full">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Manage Plan
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-4 flex-shrink-0">
            {!sidebarCollapsed ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user?.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">
                      {user?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {user?.full_name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="font-medium text-slate-900 text-sm">{user?.full_name || 'User'}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-10 h-10"
                    >
                      <LogOut className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Logout</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </aside>

        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <div className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 bg-white transform transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-lg">ProposalIQ.ai</h2>
                <p className="text-xs text-slate-500">AI-Powered Proposals</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {organization && (
            <div className="p-4 border-b border-slate-200">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-900 truncate">{organization.organization_name}</p>
                {organization.organization_type && (
                  <Badge className={cn(
                    "text-xs mt-1",
                    organization.organization_type === 'demo'
                      ? 'bg-purple-100 text-purple-700'
                      : organization.organization_type === 'consultancy' || organization.organization_type === 'consulting_firm'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                  )}>
                    {organization.organization_type === 'demo'
                      ? '🎭 Demo Account'
                      : organization.organization_type === 'consultancy'
                        ? 'Consultant'
                        : organization.organization_type === 'consulting_firm'
                          ? 'Consulting Firm'
                          : 'Corporate'}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="p-4 space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                Navigation
              </h3>
              <nav className="space-y-1">
                {navigationItems.map((item) => {
                  if (item.hasSubMenu) {
                    const subItems = item.subMenuItems || [];
                    return (
                      <div key={item.title}>
                        <Link
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-lg transition-all min-h-[48px]",
                            (location.pathname === item.url || subItems.some(sub => location.pathname === sub.url))
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100'
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="text-base flex-1">{item.title}</span>
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                        <div className="ml-8 mt-1 space-y-1">
                          {subItems.map((subItem) => (
                            <Link
                              key={subItem.title}
                              to={subItem.url}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                                location.pathname === subItem.url
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-slate-600 hover:bg-slate-50'
                              )}
                            >
                              <subItem.icon className="w-4 h-4" />
                              <span className="text-sm">{subItem.title}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.title}
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg transition-all min-h-[48px]",
                        location.pathname === item.url
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-base">{item.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {userIsAdmin && (
              <div>
                <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider px-3 py-2">
                  Admin
                </h3>
                <nav className="space-y-1">
                  {adminItems.map((item) => (
                    <Link
                      key={item.title}
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg transition-all min-h-[48px]",
                        location.pathname === item.url
                          ? 'bg-red-50 text-red-700 font-medium'
                          : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-base">{item.title}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            )}

            {subscription && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                  Subscription
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Plan</span>
                    <Badge variant="secondary" className="capitalize">
                      {subscription.plan_type}
                    </Badge>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-600">Token Credits</span>
                      <span className="font-semibold text-slate-900">
                        {((subscription.token_credits - subscription.token_credits_used) / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div
                        className={cn(
                          "h-2.5 rounded-full transition-all",
                          tokenPercentage > 50 ? 'bg-green-500' :
                          tokenPercentage > 20 ? 'bg-amber-500' :
                          'bg-red-500'
                        )}
                        style={{ width: `${tokenPercentage}%` }}
                      />
                    </div>
                  </div>
                  <Link to={createPageUrl("Settings")}>
                    <Button variant="outline" size="sm" className="w-full min-h-[44px]">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Manage Plan
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-4 mt-auto">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm truncate">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px]"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        <main className="flex-1 flex flex-col overflow-hidden pb-16 lg:pb-0 min-w-0">
          <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Menu className="w-6 h-6 text-slate-600" />
                </button>

                <div className="flex items-center gap-2 lg:hidden">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <h1 className="text-base md:text-lg font-bold text-slate-900">ProposalIQ.ai</h1>
                </div>
              </div>

              {/* NEW: Client Workspace Indicator */}
              {organization?.organization_type === 'client_organization' && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <div className="text-sm">
                    <span className="text-slate-600">Client Workspace:</span>
                    <span className="font-semibold text-blue-900 ml-1">
                      {organization.organization_name}
                    </span>
                  </div>
                </div>
              )}

              {/* Global Search Bar - Centered */}
              <div className="hidden md:flex flex-1 justify-center max-w-2xl mx-auto">
                <Button
                  variant="outline"
                  onClick={() => setShowGlobalSearch(true)}
                  className="w-full max-w-md h-10 justify-start text-slate-500 hover:text-slate-900 hover:border-blue-300"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search proposals, tasks, files...
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {/* NEW: Organization Switcher */}
                {user && organization && (
                  <OrganizationSwitcher
                    user={user}
                    currentOrganization={organization}
                    onSwitch={handleOrganizationSwitch}
                  />
                )}

                {/* Mobile Search Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowGlobalSearch(true)}
                  className="md:hidden"
                >
                  <Search className="w-5 h-5" />
                </Button>
                {user && <NotificationCenter user={user} />}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto min-w-0">
            {children}
          </div>
        </main>

        <MobileNavigation user={user} organization={organization} />

        {/* Global Search Modal */}
        {organization && (
          <GlobalSearch
            organization={organization}
            isOpen={showGlobalSearch}
            onClose={() => setShowGlobalSearch(false)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

export default function Layout({ children }) {
  return (
    <OrganizationProvider>
      <LayoutContent>{children}</LayoutContent>
    </OrganizationProvider>
  );
}
