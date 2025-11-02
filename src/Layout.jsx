
import React from "react";
import { Link, useLocation } from "react-router-dom";
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
  BookOpen
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import NotificationCenter from "./components/collaboration/NotificationCenter";
import MobileNavigation from "./components/mobile/MobileNavigation";
import { cn } from "@/lib/utils";

// Workspace sub-menu items
const WORKSPACE_ITEMS = [
  { title: "Pipeline", url: createPageUrl("Pipeline"), icon: TrendingUp },
  { title: "Resources", url: createPageUrl("Resources"), icon: Library },
  { title: "Past Performance", url: createPageUrl("PastPerformance"), icon: Award },
  { title: "Key Personnel", url: createPageUrl("KeyPersonnel"), icon: Users },
  { title: "Teaming Partners", url: createPageUrl("TeamingPartners"), icon: Handshake },
  { title: "Export Center", url: createPageUrl("ExportCenter"), icon: Download },
  { title: "Analytics", url: createPageUrl("Analytics"), icon: BarChart3 },
  { title: "Templates", url: createPageUrl("TemplatesLibrary"), icon: FileText },
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
];

// All possible navigation items with their visibility rules
const ALL_NAVIGATION_ITEMS = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, showFor: "all" },
  { title: "Proposal Builder", url: createPageUrl("ProposalBuilder"), icon: FileEdit, showFor: "all" },
  { title: "Opportunities", url: createPageUrl("OpportunityFinder"), icon: Globe, superAdminOnly: true, showFor: "all" },
  // Workspace is now a main menu with sub-items
  { title: "Workspace", url: createPageUrl("Workspace"), icon: Briefcase, showFor: "all", hasSubMenu: true, subMenuItems: WORKSPACE_ITEMS },
  // Tools is now a main menu with sub-items
  { title: "Tools", url: createPageUrl("Tools"), icon: Wrench, showFor: "all", hasSubMenu: true, subMenuItems: TOOLS_ITEMS },
  { title: "Clients", url: createPageUrl("Clients"), icon: Users, showFor: "consultant" }, // CONSULTANT ONLY
  // Settings is now a main menu with sub-items
  { title: "Settings", url: createPageUrl("Settings"), icon: Settings, showFor: "all", hasSubMenu: true, subMenuItems: SETTINGS_ITEMS },
];

const adminItems = [
  { title: "Admin Portal", url: createPageUrl("AdminPortal"), icon: Shield },
  { title: "Admin Pages", url: createPageUrl("AdminPortal") + "?tab=admin-pages", icon: FileText },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [organization, setOrganization] = React.useState(null);
  const [subscription, setSubscription] = React.useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false);
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  React.useEffect(() => {
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
          
          // Load subscription
          const subs = await base44.entities.Subscription.filter(
            { organization_id: orgs[0].id },
            '-created_date',
            1
          );
          if (subs.length > 0) {
            setSubscription(subs[0]);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
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

  // Auto-expand Workspace if on a workspace sub-page
  React.useEffect(() => {
    const isWorkspacePage = WORKSPACE_ITEMS.some(item => location.pathname === item.url);
    if (isWorkspacePage) {
      setWorkspaceOpen(true);
    }
  }, [location.pathname]);

  // Auto-expand Tools if on a tools sub-page
  React.useEffect(() => {
    const isToolsPage = TOOLS_ITEMS.some(item => location.pathname === item.url);
    if (isToolsPage) {
      setToolsOpen(true);
    }
  }, [location.pathname]);

  // Auto-expand Settings if on a settings sub-page
  React.useEffect(() => {
    const isSettingsPage = SETTINGS_ITEMS.some(item => location.pathname === item.url);
    if (isSettingsPage) {
      setSettingsOpen(true);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const tokenPercentage = subscription
    ? ((subscription.token_credits - subscription.token_credits_used) / subscription.token_credits) * 100
    : 100;

  const userIsAdmin = user?.role === 'admin';
  const userIsSuperAdmin = user?.admin_role === 'super_admin';

  // Filter navigation items based on organization type and permissions
  const navigationItems = React.useMemo(() => {
    if (!organization) return ALL_NAVIGATION_ITEMS.filter(item => !item.showFor || item.showFor === "all");
    
    const isConsultant = organization?.organization_type === 'consultancy';
    
    return ALL_NAVIGATION_ITEMS.filter(item => {
      // Check super admin only items
      if (item.superAdminOnly && !userIsSuperAdmin) {
        return false;
      }
      
      // Check organization type restrictions
      if (item.showFor === "consultant" && !isConsultant) {
        return false;
      }
      if (item.showFor === "corporate" && isConsultant) {
        return false;
      }
      
      // Item is visible for "all" or passes specific checks
      return true;
    });
  }, [organization, userIsSuperAdmin]);

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "border-r border-slate-200 bg-white hidden lg:flex flex-col transition-all duration-300 flex-shrink-0",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="border-b border-slate-200 p-6 relative flex-shrink-0">
          {/* Collapse/Expand Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-6 h-6 w-6 rounded-full border bg-white shadow-md hover:bg-slate-100 z-10"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronsRight className="h-4 w-4" title="Expand" />
            ) : (
              <ChevronsLeft className="h-4 w-4" title="Collapse" />
            )}
          </Button>

          {!sidebarCollapsed && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" title="ProposalIQ.ai" />
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
                      organization.organization_type === 'consultancy' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    )}>
                      {organization.organization_type === 'consultancy' ? 'Consultant' : 'Corporate'}
                    </Badge>
                  )}
                </div>
              )}
            </>
          )}

          {sidebarCollapsed && (
            <div className="flex justify-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" title="ProposalIQ.ai" />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Navigation - Scrollable */}
        <div className={cn("flex-1 overflow-y-auto", sidebarCollapsed ? "px-2" : "p-3")}>
          {/* Navigation Items */}
          <div className="mb-6">
            {!sidebarCollapsed && (
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                Navigation
              </div>
            )}
            <div className="space-y-1">
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
                    <Collapsible
                      key={item.title}
                      open={isOpen}
                      onOpenChange={setIsOpen}
                      className="group/collapsible"
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          className={cn(
                            "w-full hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 flex items-center",
                            (location.pathname === item.url || subItems.some(sub => location.pathname === sub.url)) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600',
                            sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5'
                          )}
                          title={sidebarCollapsed ? item.title : undefined}
                        >
                          <item.icon className={cn(sidebarCollapsed ? "w-6 h-6" : "w-5 h-5")} title={item.title} />
                          {!sidebarCollapsed && (
                            <>
                              <span className="flex-1 text-left">{item.title}</span>
                              <ChevronDown className={cn(
                                "w-4 h-4 transition-transform",
                                isOpen && "rotate-180"
                              )} title={isOpen ? "Collapse menu" : "Expand menu"} />
                            </>
                          )}
                        </button>
                      </CollapsibleTrigger>
                      {!sidebarCollapsed && (
                        <CollapsibleContent>
                          <div className="ml-4 border-l-2 border-slate-200 space-y-0.5">
                            {subItems.map((subItem) => (
                              <Link
                                key={subItem.title}
                                to={subItem.url}
                                className={cn(
                                  "flex items-center gap-3 py-2 px-3 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg",
                                  location.pathname === subItem.url ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600'
                                )}
                              >
                                <subItem.icon className="w-4 h-4" title={subItem.title} />
                                <span className="text-sm">{subItem.title}</span>
                              </Link>
                            ))}
                          </div>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  );
                }

                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={cn(
                      "flex items-center hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1",
                      location.pathname === item.url ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600',
                      sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5'
                    )}
                    title={sidebarCollapsed ? item.title : undefined}
                  >
                    <item.icon className={cn(sidebarCollapsed ? "w-6 h-6" : "w-5 h-5")} title={item.title} />
                    {!sidebarCollapsed && <span>{item.title}</span>}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Admin Section */}
          {userIsAdmin && (
            <div className="mb-6">
              {!sidebarCollapsed && (
                <div className="text-xs font-semibold text-red-500 uppercase tracking-wider px-3 py-2">
                  Admin
                </div>
              )}
              <div className="space-y-1">
                {adminItems.map((item) => (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={cn(
                      "flex items-center hover:bg-red-50 hover:text-red-700 transition-all duration-200 rounded-lg mb-1",
                      location.pathname === item.url ? 'bg-red-50 text-red-700 font-medium' : 'text-slate-600',
                      sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5'
                    )}
                    title={sidebarCollapsed ? item.title : undefined}
                  >
                    <item.icon className={cn(sidebarCollapsed ? "w-6 h-6" : "w-5 h-5")} title={item.title} />
                    {!sidebarCollapsed && <span>{item.title}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Subscription Info */}
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
                    <CreditCard className="w-4 h-4 mr-2" title="Manage plan" />
                    Manage Plan
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
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
                title="Logout"
              >
                <LogOut className="w-4 h-4" title="Logout" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-10 h-10"
                title="Logout"
              >
                <LogOut className="w-5 h-5" title="Logout" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-80 bg-white transform transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" title="ProposalIQ.ai" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-lg">ProposalIQ.ai</h2>
                <p className="text-xs text-slate-500">AI-Powered Proposals</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Close menu"
            >
              <X className="w-5 h-5 text-slate-600" title="Close" />
            </button>
          </div>

          {/* Mobile Organization Display */}
          {organization && (
            <div className="p-4 border-b border-slate-200">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-900 truncate">{organization.organization_name}</p>
                {organization.organization_type && (
                  <Badge className={cn(
                    "text-xs mt-1",
                    organization.organization_type === 'consultancy' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-blue-100 text-blue-700'
                  )}>
                    {organization.organization_type === 'consultancy' ? 'Consultant' : 'Corporate'}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Mobile Navigation */}
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
                          <item.icon className="w-5 h-5" title={item.title} />
                          <span className="text-base flex-1">{item.title}</span>
                          <ChevronRight className="w-4 h-4" title="View submenu" />
                        </Link>
                        {/* Show sub-items in mobile */}
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
                              <subItem.icon className="w-4 h-4" title={subItem.title} />
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
                      <item.icon className="w-5 h-5" title={item.title} />
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
                      <item.icon className="w-5 h-5" title={item.title} />
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
                      <CreditCard className="w-4 h-4 mr-2" title="Manage plan" />
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
                title="Logout"
              >
                <LogOut className="w-5 h-5" title="Logout" />
              </Button>
            </div>
          </div>
        </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden pb-16 lg:pb-0 min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Open menu"
              >
                <Menu className="w-6 h-6 text-slate-600" title="Menu" />
              </button>

              {/* Mobile Logo */}
              <div className="flex items-center gap-2 lg:hidden">
                <Sparkles className="w-5 h-5 text-blue-600" title="ProposalIQ.ai" />
                <h1 className="text-base md:text-lg font-bold text-slate-900">ProposalIQ.ai</h1>
              </div>
            </div>
            {user && <NotificationCenter user={user} />}
          </div>
        </header>

        <div className="flex-1 overflow-auto min-w-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNavigation user={user} organization={organization} />
    </div>
  );
}
