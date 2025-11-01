import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Calendar,
  CheckSquare,
  MessageSquare,
  Menu,
  X,
  Sparkles,
  Home,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const MOBILE_NAV_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: Home, url: 'Dashboard', color: 'text-blue-600' },
  { id: 'pipeline', label: 'Pipeline', icon: FileText, url: 'Pipeline', color: 'text-purple-600' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, url: 'Calendar', color: 'text-green-600' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, url: 'Tasks', color: 'text-amber-600' },
  { id: 'more', label: 'More', icon: Menu, color: 'text-slate-600' }
];

export default function MobileNavigation({ user, organization, unreadCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleNavClick = (item) => {
    if (item.id === 'more') {
      setShowMoreMenu(true);
    } else {
      navigate(createPageUrl(item.url));
    }
  };

  const getCurrentTab = () => {
    const path = location.pathname;
    const item = MOBILE_NAV_ITEMS.find(i => i.url && path.includes(i.url.toLowerCase()));
    return item?.id || 'dashboard';
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 safe-area-bottom">
        <div className="grid grid-cols-5 h-16">
          {MOBILE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = getCurrentTab() === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 relative transition-colors",
                  isActive ? item.color : "text-slate-400"
                )}
              >
                <Icon className={cn("w-6 h-6", isActive && "scale-110")} />
                <span className="text-xs font-medium">{item.label}</span>
                {item.id === 'tasks' && unreadCount > 0 && (
                  <Badge className="absolute top-1 right-1/4 h-4 px-1 text-[10px] bg-red-600">
                    {unreadCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* More Menu Overlay */}
      {showMoreMenu && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setShowMoreMenu(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">More Options</h3>
                <button 
                  onClick={() => setShowMoreMenu(false)}
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  <X className="w-6 h-6 text-slate-600" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Analytics', icon: BarChart3, url: 'Analytics', color: 'from-blue-500 to-blue-600' },
                  { label: 'Resources', icon: Sparkles, url: 'Resources', color: 'from-purple-500 to-purple-600' },
                  { label: 'AI Chat', icon: MessageSquare, url: 'Chat', color: 'from-green-500 to-green-600' },
                  { label: 'Search', icon: Search, url: 'AdvancedSearch', color: 'from-amber-500 to-amber-600' },
                  { label: 'Team', icon: Menu, url: 'Team', color: 'from-pink-500 to-pink-600' },
                  { label: 'Settings', icon: Menu, url: 'Settings', color: 'from-slate-500 to-slate-600' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        navigate(createPageUrl(item.url));
                        setShowMoreMenu(false);
                      }}
                      className="p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-400 transition-all active:scale-95"
                    >
                      <div className={cn("w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br flex items-center justify-center", item.color)}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-sm font-medium text-slate-900">{item.label}</div>
                    </button>
                  );
                })}
              </div>

              {organization && (
                <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="text-sm font-semibold text-slate-900 mb-1">
                    {organization.organization_name}
                  </div>
                  <div className="text-xs text-slate-600">
                    {user?.full_name} • {user?.email}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}