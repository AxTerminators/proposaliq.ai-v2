
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
  Award, // Added Award icon
  Users, // Added Users icon
  Calendar // Added Calendar icon
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import NotificationCenter from "./components/collaboration/NotificationCenter";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Opportunities",
    url: createPageUrl("OpportunityFinder"),
    icon: Globe,
  },
  {
    title: "Proposals",
    url: createPageUrl("Proposals"),
    icon: FileText,
  },
  {
    title: "Past Performance", // Added new navigation item
    url: createPageUrl("PastPerformance"),
    icon: Award,
  },
  {
    title: "Team",
    url: createPageUrl("Team"),
    icon: Users,
  },
  {
    title: "Resources",
    url: createPageUrl("Resources"),
    icon: Library,
  },
  {
    title: "AI Chat",
    url: createPageUrl("Chat"),
    icon: MessageSquare,
  },
  {
    title: "Discussions",
    url: createPageUrl("Discussions"),
    icon: MessageCircle,
  },
  {
    title: "Export Center",
    url: createPageUrl("ExportCenter"),
    icon: Download,
  },
  {
    title: "Analytics",
    url: createPageUrl("Analytics"),
    icon: BarChart3,
  },
  {
    title: "Pricing",
    url: createPageUrl("Pricing"),
    icon: DollarSign,
  },
  {
    title: "Settings",
    url: createPageUrl("Settings"),
    icon: Settings,
  },
];

const adminItems = [
  {
    title: "Admin Portal",
    url: createPageUrl("AdminPortal"),
    icon: Shield,
  },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [subscription, setSubscription] = React.useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const loadUserAndSubscription = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const subs = await base44.entities.Subscription.list('-created_date', 1);
        if (subs.length > 0) {
          setSubscription(subs[0]);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUserAndSubscription();
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

  const handleLogout = () => {
    base44.auth.logout();
  };

  const tokenPercentage = subscription 
    ? ((subscription.token_credits - subscription.token_credits_used) / subscription.token_credits) * 100 
    : 100;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Desktop Sidebar */}
        <Sidebar className="border-r border-slate-200 bg-white hidden lg:flex">
          <SidebarHeader className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-lg">ProposalIQ.ai</h2>
                <p className="text-xs text-slate-500">AI-Powered Proposals</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={cn(
                          "hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1",
                          location.pathname === item.url ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600'
                        )}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {user?.role === 'admin' && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-red-500 uppercase tracking-wider px-3 py-2">
                  Admin
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {adminItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={cn(
                            "hover:bg-red-50 hover:text-red-700 transition-all duration-200 rounded-lg mb-1",
                            location.pathname === item.url ? 'bg-red-50 text-red-700 font-medium' : 'text-slate-600'
                          )}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                            <item.icon className="w-5 h-5" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {subscription && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                  Subscription
                </SidebarGroupLabel>
                <SidebarGroupContent>
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
                    <Link to={createPageUrl("Pricing")}>
                      <Button variant="outline" size="sm" className="w-full">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Manage Plan
                      </Button>
                    </Link>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200 p-4">
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
          </SidebarFooter>
        </Sidebar>

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

          {/* Mobile Navigation */}
          <div className="p-4 space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                Navigation
              </h3>
              <nav className="space-y-1">
                {navigationItems.map((item) => (
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
                ))}
              </nav>
            </div>

            {user?.role === 'admin' && (
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
                  <Link to={createPageUrl("Pricing")}>
                    <Button variant="outline" size="sm" className="w-full min-h-[44px]">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Manage Plan
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Footer */}
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

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Menu className="w-6 h-6 text-slate-600" />
                </button>
                
                {/* Mobile Logo */}
                <div className="flex items-center gap-2 lg:hidden">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <h1 className="text-base md:text-lg font-bold text-slate-900">ProposalIQ.ai</h1>
                </div>
              </div>
              <NotificationCenter />
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
