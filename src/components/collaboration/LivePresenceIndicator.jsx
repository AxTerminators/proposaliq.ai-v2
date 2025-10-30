import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Eye, 
  Users, 
  Circle,
  Loader2
} from "lucide-react";
import moment from "moment";

// User color palette
const USER_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // green
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
];

export default function LivePresenceIndicator({ 
  proposal, 
  currentUser, 
  userType = "consultant",
  currentSectionId = null,
  currentSectionName = null 
}) {
  const queryClient = useQueryClient();
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random()}`);
  const [userColor] = useState(() => USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  // Query active presence sessions
  const { data: presenceSessions = [], isLoading } = useQuery({
    queryKey: ['presence-sessions', proposal.id],
    queryFn: async () => {
      const sessions = await base44.entities.PresenceSession.filter({
        proposal_id: proposal.id
      }, '-last_active');
      
      // Filter out stale sessions (older than 30 seconds)
      const now = new Date();
      return sessions.filter(session => {
        const lastActive = new Date(session.last_active);
        const diffSeconds = (now - lastActive) / 1000;
        return diffSeconds < 30;
      });
    },
    refetchInterval: 5000, // Poll every 5 seconds
    initialData: []
  });

  // Create/update presence mutation
  const updatePresenceMutation = useMutation({
    mutationFn: async (data) => {
      // Find existing session
      const existing = await base44.entities.PresenceSession.filter({
        proposal_id: proposal.id,
        session_id: sessionId
      });

      if (existing.length > 0) {
        return base44.entities.PresenceSession.update(existing[0].id, data);
      } else {
        return base44.entities.PresenceSession.create({
          ...data,
          proposal_id: proposal.id,
          session_id: sessionId,
          color: userColor
        });
      }
    }
  });

  // Initial presence creation
  useEffect(() => {
    if (!proposal || !currentUser) return;

    const activityDesc = currentSectionName 
      ? `Viewing ${currentSectionName}`
      : "Viewing proposal";

    updatePresenceMutation.mutate({
      user_email: currentUser.email,
      user_name: currentUser.full_name || currentUser.email,
      user_type: userType,
      current_section_id: currentSectionId,
      current_section_name: currentSectionName,
      last_active: new Date().toISOString(),
      status: 'active',
      activity_description: activityDesc,
      device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
      is_typing: false
    });

    // Cleanup on unmount
    return () => {
      // Delete session on unmount
      const cleanup = async () => {
        const existing = await base44.entities.PresenceSession.filter({
          proposal_id: proposal.id,
          session_id: sessionId
        });
        if (existing.length > 0) {
          await base44.entities.PresenceSession.delete(existing[0].id);
        }
      };
      cleanup();
    };
  }, []);

  // Update presence periodically (heartbeat)
  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (!proposal || !currentUser) return;

      const activityDesc = currentSectionName 
        ? `Viewing ${currentSectionName}`
        : "Viewing proposal";

      updatePresenceMutation.mutate({
        user_email: currentUser.email,
        user_name: currentUser.full_name || currentUser.email,
        user_type: userType,
        current_section_id: currentSectionId,
        current_section_name: currentSectionName,
        last_active: new Date().toISOString(),
        status: 'active',
        activity_description: activityDesc,
        is_typing: isTyping
      });

      // Invalidate query to refresh presence list
      queryClient.invalidateQueries({ queryKey: ['presence-sessions', proposal.id] });
    }, 10000); // Every 10 seconds

    return () => clearInterval(heartbeat);
  }, [proposal?.id, currentUser?.email, currentSectionId, currentSectionName, isTyping]);

  // Update section when it changes
  useEffect(() => {
    if (!proposal || !currentUser) return;

    const activityDesc = currentSectionName 
      ? `Viewing ${currentSectionName}`
      : "Viewing proposal";

    updatePresenceMutation.mutate({
      user_email: currentUser.email,
      user_name: currentUser.full_name || currentUser.email,
      user_type: userType,
      current_section_id: currentSectionId,
      current_section_name: currentSectionName,
      last_active: new Date().toISOString(),
      status: 'active',
      activity_description: activityDesc
    });
  }, [currentSectionId, currentSectionName]);

  // Track mouse movement (for cursor position)
  useEffect(() => {
    const handleMouseMove = (e) => {
      // Throttle updates - only send every 500ms
      if (!updatePresenceMutation.isIdle) return;

      const x = e.clientX;
      const y = e.clientY;

      updatePresenceMutation.mutate({
        user_email: currentUser.email,
        user_name: currentUser.full_name || currentUser.email,
        user_type: userType,
        current_section_id: currentSectionId,
        current_section_name: currentSectionName,
        cursor_position: { x, y, section_id: currentSectionId },
        last_active: new Date().toISOString()
      });
    };

    // Debounced mouse tracking
    let mouseMoveTimeout;
    const debouncedMouseMove = (e) => {
      clearTimeout(mouseMoveTimeout);
      mouseMoveTimeout = setTimeout(() => handleMouseMove(e), 500);
    };

    window.addEventListener('mousemove', debouncedMouseMove);
    return () => {
      window.removeEventListener('mousemove', debouncedMouseMove);
      clearTimeout(mouseMoveTimeout);
    };
  }, [currentSectionId, currentUser?.email]);

  // Expose typing indicator function
  const handleTypingStart = () => {
    setIsTyping(true);
    
    // Clear existing timeout
    if (typingTimeout) clearTimeout(typingTimeout);
    
    // Set new timeout to stop typing after 2 seconds of inactivity
    const timeout = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
    
    setTypingTimeout(timeout);

    updatePresenceMutation.mutate({
      user_email: currentUser.email,
      user_name: currentUser.full_name || currentUser.email,
      user_type: userType,
      is_typing: true,
      typing_in: 'comment',
      last_active: new Date().toISOString()
    });
  };

  // Expose this function globally for other components to call
  useEffect(() => {
    window.indicateTyping = handleTypingStart;
    return () => {
      delete window.indicateTyping;
    };
  }, [currentUser?.email]);

  // Filter out current user from presence list
  const otherUsers = presenceSessions.filter(
    session => session.user_email !== currentUser?.email
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600">
            {otherUsers.length === 0 ? 'Only you' : `${otherUsers.length + 1} viewing`}
          </span>
        </div>

        {otherUsers.length > 0 && (
          <div className="flex -space-x-2">
            {otherUsers.slice(0, 5).map((session, idx) => (
              <Tooltip key={session.id}>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Avatar 
                      className="w-8 h-8 border-2 border-white cursor-pointer hover:scale-110 transition-transform"
                      style={{ borderColor: session.color || '#94a3b8' }}
                    >
                      <AvatarFallback 
                        style={{ 
                          backgroundColor: session.color || '#94a3b8',
                          color: 'white'
                        }}
                      >
                        {session.user_name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <Circle 
                      className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 fill-green-500 text-green-500"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="text-center">
                    <p className="font-semibold">{session.user_name}</p>
                    <p className="text-xs text-slate-400">
                      {session.activity_description || 'Viewing proposal'}
                    </p>
                    {session.is_typing && (
                      <Badge className="bg-blue-100 text-blue-700 text-xs mt-1">
                        Typing...
                      </Badge>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {moment(session.last_active).fromNow()}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
            
            {otherUsers.length > 5 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center cursor-pointer">
                    <span className="text-xs font-semibold text-slate-600">
                      +{otherUsers.length - 5}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="max-w-xs">
                    {otherUsers.slice(5).map(session => (
                      <div key={session.id} className="text-sm py-1">
                        {session.user_name} - {session.activity_description}
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* Live indicator */}
        {otherUsers.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-600 font-medium">LIVE</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// Export helper to indicate typing
export const indicateTyping = () => {
  if (window.indicateTyping) {
    window.indicateTyping();
  }
};