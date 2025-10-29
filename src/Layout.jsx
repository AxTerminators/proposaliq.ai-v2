
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
  Download // Added Download icon
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

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Proposals",
    url: createPageUrl("Proposals"),
    icon: FileText,
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

  const handleLogout = () => {
    base44.auth.logout();
  };

  const tokenPercentage = subscription 
    ? ((subscription.token_credits - subscription.token_credits_used) / subscription.token_credits) * 100 
    : 100;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
        <Sidebar className="border-r border-slate-200 bg-white">
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
                        className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600'
                        }`}
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
                          className={`hover:bg-red-50 hover:text-red-700 transition-all duration-200 rounded-lg mb-1 ${
                            location.pathname === item.url ? 'bg-red-50 text-red-700 font-medium' : 'text-slate-600'
                          }`}
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
                          className={`h-2 rounded-full transition-all ${
                            tokenPercentage > 50 ? 'bg-green-500' :
                            tokenPercentage > 20 ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}
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

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 lg:hidden">
                <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors">
                  <Menu className="w-5 h-5" />
                </SidebarTrigger>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <h1 className="text-lg font-bold text-slate-900">ProposalIQ.ai</h1>
                </div>
              </div>
              <div className="hidden lg:block"></div>
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
