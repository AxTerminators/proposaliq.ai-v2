import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MousePointer2 } from "lucide-react";

export default function LiveCursors({ proposal, currentUser }) {
  const [cursors, setCursors] = useState({});

  // Query active presence sessions
  const { data: presenceSessions = [] } = useQuery({
    queryKey: ['presence-sessions', proposal.id],
    queryFn: async () => {
      const sessions = await base44.entities.PresenceSession.filter({
        proposal_id: proposal.id
      }, '-last_active');
      
      // Filter out stale sessions and current user
      const now = new Date();
      return sessions.filter(session => {
        const lastActive = new Date(session.last_active);
        const diffSeconds = (now - lastActive) / 1000;
        return diffSeconds < 30 && session.user_email !== currentUser?.email;
      });
    },
    refetchInterval: 1000, // Poll every second for smooth cursor movement
    initialData: []
  });

  // Update cursor positions
  useEffect(() => {
    const newCursors = {};
    presenceSessions.forEach(session => {
      if (session.cursor_position) {
        newCursors[session.user_email] = {
          x: session.cursor_position.x,
          y: session.cursor_position.y,
          name: session.user_name,
          color: session.color || '#3b82f6',
          isTyping: session.is_typing
        };
      }
    });
    setCursors(newCursors);
  }, [presenceSessions]);

  return (
    <>
      {Object.entries(cursors).map(([email, cursor]) => (
        <div
          key={email}
          className="fixed pointer-events-none z-50 transition-all duration-100 ease-linear"
          style={{
            left: `${cursor.x}px`,
            top: `${cursor.y}px`,
            transform: 'translate(-2px, -2px)'
          }}
        >
          <MousePointer2 
            className="w-5 h-5 drop-shadow-lg" 
            style={{ color: cursor.color }}
            fill={cursor.color}
          />
          <div 
            className="absolute top-6 left-2 text-xs font-semibold px-2 py-1 rounded shadow-lg whitespace-nowrap"
            style={{ 
              backgroundColor: cursor.color,
              color: 'white'
            }}
          >
            {cursor.name}
            {cursor.isTyping && (
              <span className="ml-1 inline-block animate-pulse">...</span>
            )}
          </div>
        </div>
      ))}
    </>
  );
}