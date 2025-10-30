import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { v4 as uuidv4 } from 'uuid';

/**
 * Invisible component that tracks client engagement
 * Place this in ClientPortal and ClientProposalView
 */
export default function EngagementTracker({ 
  client, 
  proposal, 
  sectionId = null,
  sectionName = null,
  currentMember = null 
}) {
  const sessionIdRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const scrollDepthRef = useRef(0);
  const isFirstVisitRef = useRef(false);

  // Generate session ID on mount
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = uuidv4();
    }

    // Check if first visit
    const visitKey = `proposal_${proposal?.id}_visited`;
    if (proposal && !localStorage.getItem(visitKey)) {
      isFirstVisitRef.current = true;
      localStorage.setItem(visitKey, 'true');
    }
  }, [proposal?.id]);

  // Get device type
  const getDeviceType = () => {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  };

  // Get browser name
  const getBrowser = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  };

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollDepth = ((scrollTop + windowHeight) / documentHeight) * 100;
      
      scrollDepthRef.current = Math.max(scrollDepthRef.current, scrollDepth);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track page view on mount
  useEffect(() => {
    if (!client || !proposal) return;

    const trackPageView = async () => {
      try {
        await base44.entities.ClientEngagementMetric.create({
          client_id: client.id,
          proposal_id: proposal.id,
          section_id: sectionId,
          organization_id: proposal.organization_id,
          team_member_id: currentMember?.id || null,
          event_type: sectionId ? 'section_view' : 'page_view',
          session_id: sessionIdRef.current,
          section_name: sectionName,
          device_type: getDeviceType(),
          browser: getBrowser(),
          is_first_visit: isFirstVisitRef.current,
          metadata: {
            page_title: document.title,
            referrer: document.referrer
          }
        });
      } catch (error) {
        console.error('Error tracking page view:', error);
      }
    };

    trackPageView();
  }, [client?.id, proposal?.id, sectionId]);

  // Track time spent and scroll on unmount
  useEffect(() => {
    return () => {
      if (!client || !proposal) return;

      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      // Only track if spent more than 5 seconds
      if (timeSpent < 5) return;

      const trackTimeSpent = async () => {
        try {
          await base44.entities.ClientEngagementMetric.create({
            client_id: client.id,
            proposal_id: proposal.id,
            section_id: sectionId,
            organization_id: proposal.organization_id,
            team_member_id: currentMember?.id || null,
            event_type: 'section_scroll',
            session_id: sessionIdRef.current,
            time_spent_seconds: timeSpent,
            scroll_depth_percent: Math.round(scrollDepthRef.current),
            section_name: sectionName,
            device_type: getDeviceType(),
            browser: getBrowser()
          });
        } catch (error) {
          console.error('Error tracking time spent:', error);
        }
      };

      trackTimeSpent();
    };
  }, [client?.id, proposal?.id, sectionId, sectionName, currentMember?.id]);

  return null; // Invisible component
}

// Helper function to track custom events
export const trackClientEvent = async ({
  client,
  proposal,
  eventType,
  metadata = {},
  sectionId = null,
  sectionName = null,
  currentMember = null
}) => {
  try {
    await base44.entities.ClientEngagementMetric.create({
      client_id: client.id,
      proposal_id: proposal.id,
      section_id: sectionId,
      organization_id: proposal.organization_id,
      team_member_id: currentMember?.id || null,
      event_type: eventType,
      session_id: localStorage.getItem('engagement_session_id') || 'unknown',
      section_name: sectionName,
      metadata: metadata,
      device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
      browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other'
    });
  } catch (error) {
    console.error('Error tracking event:', error);
  }
};