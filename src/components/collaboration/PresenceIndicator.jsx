import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Circle, Eye, Edit } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Real-time presence indicator showing who's viewing/editing
 * In a real implementation, this would use WebSockets
 * For now, we'll simulate with polling
 */
export function PresenceIndicator({ proposalId, sectionId = null }) {
  const [activeUsers, setActiveUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadPresence = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        // In production, this would query a real-time presence system
        // For now, get recent activity as proxy for active users
        const recentActivity = await base44.entities.ActivityLog.filter(
          { proposal_id: proposalId },
          '-created_date',
          20
        );

        // Get unique users from last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentUsers = recentActivity
          .filter(a => new Date(a.created_date) > fiveMinutesAgo)
          .reduce((acc, activity) => {
            if (!acc.find(u => u.email === activity.user_email)) {
              acc.push({
                email: activity.user_email,
                name: activity.user_name,
                action: activity.action_type,
                lastSeen: activity.created_date
              });
            }
            return acc;
          }, []);

        setActiveUsers(recentUsers);
      } catch (error) {
        console.error("Error loading presence:", error);
      }
    };

    loadPresence();
    // Poll every 10 seconds for updates
    const interval = setInterval(loadPresence, 10000);

    return () => clearInterval(interval);
  }, [proposalId, sectionId]);

  if (activeUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <div className="flex -space-x-2">
          {activeUsers.slice(0, 5).map((user, index) => (
            <Tooltip key={user.email}>
              <TooltipTrigger>
                <div className="relative">
                  <Avatar className="w-8 h-8 border-2 border-white shadow-md hover:z-10 transition-all hover:scale-110">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xs">
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <Circle 
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                      user.action?.includes('edit') ? "fill-green-500 text-green-500" : "fill-blue-500 text-blue-500"
                    )} 
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-slate-400 flex items-center gap-1 mt-1">
                    {user.action?.includes('edit') ? (
                      <>
                        <Edit className="w-3 h-3" />
                        Editing
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        Viewing
                      </>
                    )}
                  </p>
                  <p className="text-slate-400 text-[10px] mt-1">
                    {new Date(user.lastSeen).toLocaleTimeString()}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          {activeUsers.length > 5 && (
            <Tooltip>
              <TooltipTrigger>
                <Avatar className="w-8 h-8 border-2 border-white shadow-md bg-slate-100">
                  <AvatarFallback className="text-xs text-slate-600">
                    +{activeUsers.length - 5}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-semibold mb-1">{activeUsers.length - 5} more</p>
                  {activeUsers.slice(5).map(u => (
                    <p key={u.email} className="text-slate-400">{u.name}</p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>

      <span className="text-xs text-slate-500">
        {activeUsers.length} {activeUsers.length === 1 ? 'person' : 'people'} active
      </span>
    </div>
  );
}

/**
 * Simple presence badge for showing active status
 */
export function PresenceBadge({ isActive }) {
  return (
    <div className="flex items-center gap-1.5">
      <Circle 
        className={cn(
          "w-2 h-2 rounded-full",
          isActive ? "fill-green-500 text-green-500 animate-pulse" : "fill-slate-300 text-slate-300"
        )} 
      />
      <span className="text-xs text-slate-600">
        {isActive ? "Active" : "Away"}
      </span>
    </div>
  );
}

/**
 * Typing indicator for real-time collaboration
 */
export function TypingIndicator({ users }) {
  if (!users || users.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
      <div className="flex gap-1">
        <Circle className="w-1.5 h-1.5 fill-slate-400 text-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <Circle className="w-1.5 h-1.5 fill-slate-400 text-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <Circle className="w-1.5 h-1.5 fill-slate-400 text-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>
        {users.length === 1 
          ? `${users[0].name} is typing...`
          : `${users.length} people are typing...`
        }
      </span>
    </div>
  );
}

/**
 * Section lock indicator - shows when someone is editing a section
 */
export function SectionLockIndicator({ lockedBy, lockedAt }) {
  if (!lockedBy) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
      <Edit className="w-4 h-4 text-amber-600" />
      <div className="flex-1">
        <p className="text-xs font-semibold text-amber-900">
          {lockedBy} is editing this section
        </p>
        {lockedAt && (
          <p className="text-[10px] text-amber-700">
            Since {new Date(lockedAt).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}