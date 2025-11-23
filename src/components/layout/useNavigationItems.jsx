import { useMemo } from "react";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Library,
  Briefcase,
  FileEdit,
  Globe,
  ClipboardList,
  Wrench,
  Settings,
  Building2,
  BarChart3,
  TrendingUp,
  Layers,
  FolderOpen,
  Award,
  Users,
  Calendar,
  CheckSquare,
  Handshake,
  Download,
  Search,
  BookOpen,
  DollarSign,
  MessageCircle,
  Bug,
  Activity,
  Shield,
  Flag,
  Database,
  Zap,
  Smartphone
} from "lucide-react";

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
  { title: "RAG Performance", url: createPageUrl("RAGPerformanceDashboard"), icon: BarChart3 },
  { title: "RAG System Health", url: createPageUrl("RAGSystemHealth"), icon: Activity },
  { title: "AI Token Usage", url: createPageUrl("AITokenUsageDashboard"), icon: Activity },
  { title: "Feedback", url: createPageUrl("Feedback"), icon: Bug },
  { title: "Product Roadmap", url: createPageUrl("ProductRoadmap"), icon: BookOpen },
  { title: "System Docs", url: createPageUrl("SystemDocumentation"), icon: BookOpen }
];

// All navigation items with visibility rules
const ALL_NAVIGATION_ITEMS = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, showFor: "all" },
  { title: "Consultant Dashboard", url: createPageUrl("ConsultantDashboard"), icon: Briefcase, showFor: "consulting_firm" },
  { title: "Proposal Builder", url: createPageUrl("ProposalBuilder"), icon: FileEdit, showFor: "all", adminOnly: true },
  { title: "Opportunities", url: createPageUrl("OpportunityFinder"), icon: Globe, superAdminOnly: true, showFor: "all" },
  { title: "Workspace", url: createPageUrl("Workspace"), icon: Briefcase, showFor: "all", hasSubMenu: true, subMenuItems: WORKSPACE_ITEMS },
  { title: "Data Calls", url: createPageUrl("DataCalls"), icon: ClipboardList, showFor: "all" },
  { title: "Tools", url: createPageUrl("Tools"), icon: Wrench, showFor: "all", hasSubMenu: true, subMenuItems: TOOLS_ITEMS },
  { title: "Client Workspaces", url: createPageUrl("ClientOrganizationManager"), icon: Building2, showFor: "consulting_firm" },
  { title: "Portfolio Dashboard", url: createPageUrl("ConsolidatedReporting"), icon: BarChart3, showFor: "consulting_firm" },
  { title: "Settings", url: createPageUrl("Settings"), icon: Settings, showFor: "all", hasSubMenu: true, subMenuItems: SETTINGS_ITEMS },
];

const ADMIN_ITEMS = [
  { title: "Admin Portal", url: createPageUrl("AdminPortal"), icon: Shield },
  { title: "System Templates", url: createPageUrl("AdminTemplateEditor"), icon: Layers, superAdminOnly: true },
  { title: "Modal Builder", url: createPageUrl("ModalBuilder"), icon: FileEdit },
  { title: "Feature Management", url: createPageUrl("FeatureManagement"), icon: Flag },
  { title: "Phase 5: Entities", url: createPageUrl("Phase5Consolidation"), icon: Database, superAdminOnly: true },
  { title: "Phase 6: Performance", url: createPageUrl("Phase6Performance"), icon: Zap, superAdminOnly: true },
  { title: "Phase 7: Mobile", url: createPageUrl("Phase7MobileOptimization"), icon: Smartphone, superAdminOnly: true },
  { title: "Phase 8: Accessibility", url: createPageUrl("Phase8AccessibilityPolish"), icon: Shield, superAdminOnly: true },
  { title: "Phase 9: Documentation", url: createPageUrl("Phase9Documentation"), icon: BookOpen, superAdminOnly: true },
  { title: "Phase 10: Launch Prep", url: createPageUrl("Phase10LaunchPrep"), icon: Activity, superAdminOnly: true }
];

/**
 * Custom hook to determine which navigation items should be visible
 * based on user role, organization type, and demo mode
 */
export function useNavigationItems(user, organization, demoViewMode) {
  return useMemo(() => {
    if (!organization) {
      return ALL_NAVIGATION_ITEMS.filter(item => !item.showFor || item.showFor === "all");
    }

    const userIsAdmin = user?.role === 'admin';
    const userIsSuperAdmin = user?.admin_role === 'super_admin';

    // Determine effective organization type (handle demo mode)
    const effectiveOrgType = organization.organization_type === 'demo'
      ? demoViewMode
      : organization.organization_type;

    const isConsultant = effectiveOrgType === 'consultancy';
    const isConsultingFirm = organization.organization_type === 'consulting_firm' || effectiveOrgType === 'consultancy';

    // Filter navigation items based on rules
    const visibleNavItems = ALL_NAVIGATION_ITEMS.filter(item => {
      // Check super admin restrictions
      if (item.superAdminOnly && !userIsSuperAdmin) return false;
      
      // Check admin restrictions
      if (item.adminOnly && !userIsAdmin) return false;
      
      // Check organization type restrictions
      if (item.showFor === "consultant" && !isConsultant) return false;
      if (item.showFor === "corporate" && isConsultant) return false;
      if (item.showFor === "consulting_firm" && !isConsultingFirm) return false;
      
      return true;
    });

    return visibleNavItems;
  }, [organization, user, demoViewMode]);
}

/**
 * Get visible admin items based on user role
 */
export function useAdminItems(user) {
  return useMemo(() => {
    const userIsAdmin = user?.role === 'admin';
    const userIsSuperAdmin = user?.admin_role === 'super_admin';

    if (!userIsAdmin) return [];

    return ADMIN_ITEMS.filter(item => {
      if (item.superAdminOnly && !userIsSuperAdmin) return false;
      return true;
    });
  }, [user]);
}

/**
 * Check if a given page URL is accessible for the current user/org
 */
export function useIsPageAccessible(pageUrl, user, organization, demoViewMode) {
  return useMemo(() => {
    const allNavigableItems = [
      ...ALL_NAVIGATION_ITEMS,
      ...ADMIN_ITEMS
    ].flatMap(item => {
      if (item.hasSubMenu && item.subMenuItems) {
        return [item, ...item.subMenuItems];
      }
      return item;
    });

    const pageItem = allNavigableItems.find(item => item.url === pageUrl);
    
    if (!pageItem) return true; // Unknown pages are accessible by default

    const userIsAdmin = user?.role === 'admin';
    const userIsSuperAdmin = user?.admin_role === 'super_admin';

    // Check restrictions
    if (pageItem.superAdminOnly && !userIsSuperAdmin) return false;
    if (pageItem.adminOnly && !userIsAdmin) return false;

    if (organization) {
      const effectiveOrgType = organization.organization_type === 'demo'
        ? demoViewMode
        : organization.organization_type;

      const isConsultant = effectiveOrgType === 'consultancy';
      const isConsultingFirm = organization.organization_type === 'consulting_firm' || effectiveOrgType === 'consultancy';

      if (pageItem.showFor === "consultant" && !isConsultant) return false;
      if (pageItem.showFor === "corporate" && isConsultant) return false;
      if (pageItem.showFor === "consulting_firm" && !isConsultingFirm) return false;
    }

    return true;
  }, [pageUrl, user, organization, demoViewMode]);
}

export { WORKSPACE_ITEMS, TOOLS_ITEMS, SETTINGS_ITEMS, ALL_NAVIGATION_ITEMS, ADMIN_ITEMS };