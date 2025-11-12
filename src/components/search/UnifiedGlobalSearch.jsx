import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  FileText,
  Users,
  Building2,
  Calendar,
  MessageSquare,
  Loader2,
  Command
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

const ENTITY_CONFIGS = {
  'Proposal': { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
  'Client': { icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
  'ClientOrganization': { icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
  'Task': { icon: Calendar, color: 'text-green-600', bg: 'bg-green-50' },
  'Discussion': { icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-50' },
  'KeyPersonnel': { icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' }
};

/**
 * Unified Global Search
 * Search across all accessible organizations and entities
 */
export default function UnifiedGlobalSearch({ isOpen, onClose, currentUser, activeOrganization }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('all');

  // Get all accessible organizations
  const accessibleOrgIds = React.useMemo(() => {
    if (!currentUser) return [];
    
    const orgIds = new Set();
    
    // Add active org
    if (activeOrganization?.id) {
      orgIds.add(activeOrganization.id);
    }
    
    // Add all accessible orgs
    currentUser.client_accesses?.forEach(access => {
      orgIds.add(access.organization_id);
    });
    
    return Array.from(orgIds);
  }, [currentUser, activeOrganization]);

  // Search across all entities
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['unified-search', query, selectedEntity, accessibleOrgIds],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      
      const results = [];
      const lowerQuery = query.toLowerCase();

      // Search Proposals
      if (selectedEntity === 'all' || selectedEntity === 'proposals') {
        const proposals = await base44.entities.Proposal.filter({
          organization_id: { $in: accessibleOrgIds }
        });
        
        proposals.forEach(p => {
          if (
            p.proposal_name?.toLowerCase().includes(lowerQuery) ||
            p.project_title?.toLowerCase().includes(lowerQuery) ||
            p.solicitation_number?.toLowerCase().includes(lowerQuery)
          ) {
            results.push({
              type: 'Proposal',
              id: p.id,
              title: p.proposal_name,
              subtitle: p.project_title,
              meta: p.agency_name,
              url: `${createPageUrl("Pipeline")}?proposalId=${p.id}`,
              orgId: p.organization_id
            });
          }
        });
      }

      // Search Client Organizations
      if (selectedEntity === 'all' || selectedEntity === 'clients') {
        const clients = await base44.entities.Organization.filter({
          organization_type: 'client_organization',
          parent_organization_id: { $in: accessibleOrgIds }
        });
        
        clients.forEach(c => {
          if (
            c.organization_name?.toLowerCase().includes(lowerQuery) ||
            c.contact_email?.toLowerCase().includes(lowerQuery)
          ) {
            results.push({
              type: 'ClientOrganization',
              id: c.id,
              title: c.organization_name,
              subtitle: c.contact_email,
              url: `${createPageUrl("ClientOrganizationManager")}?client=${c.id}`,
              orgId: c.parent_organization_id
            });
          }
        });
      }

      // Search Tasks
      if (selectedEntity === 'all' || selectedEntity === 'tasks') {
        const tasks = await base44.entities.ProposalTask.list();
        
        tasks.forEach(t => {
          if (
            t.title?.toLowerCase().includes(lowerQuery) ||
            t.description?.toLowerCase().includes(lowerQuery)
          ) {
            results.push({
              type: 'Task',
              id: t.id,
              title: t.title,
              subtitle: t.description,
              meta: t.status,
              url: createPageUrl("Tasks")
            });
          }
        });
      }

      // Search Discussions
      if (selectedEntity === 'all' || selectedEntity === 'discussions') {
        const discussions = await base44.entities.Discussion.filter({
          organization_id: { $in: accessibleOrgIds }
        });
        
        discussions.forEach(d => {
          if (
            d.title?.toLowerCase().includes(lowerQuery) ||
            d.content?.toLowerCase().includes(lowerQuery)
          ) {
            results.push({
              type: 'Discussion',
              id: d.id,
              title: d.title,
              subtitle: d.content?.substring(0, 100),
              url: createPageUrl("Discussions"),
              orgId: d.organization_id
            });
          }
        });
      }

      return results;
    },
    enabled: query.length >= 2,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // Would need to open dialog from parent
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Search Everything
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search proposals, clients, tasks, discussions..."
              className="pl-10 pr-4 text-lg h-12"
              autoFocus
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-100 rounded text-xs text-slate-500 hidden md:inline-block">
              ⌘K
            </kbd>
          </div>

          {/* Entity Filter */}
          <div className="flex gap-2">
            {['all', 'proposals', 'clients', 'tasks', 'discussions'].map(entity => (
              <button
                key={entity}
                onClick={() => setSelectedEntity(entity)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                  selectedEntity === entity
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                {entity}
              </button>
            ))}
          </div>

          {/* Results */}
          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : query.length < 2 ? (
              <div className="text-center py-12 text-slate-500">
                <Command className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Type to start searching...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">No results found for "{query}"</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((result, idx) => {
                  const config = ENTITY_CONFIGS[result.type] || ENTITY_CONFIGS['Proposal'];
                  const Icon = config.icon;

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        navigate(result.url);
                        onClose();
                      }}
                      className="w-full p-3 rounded-lg border hover:bg-slate-50 transition-all text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                          config.bg
                        )}>
                          <Icon className={cn("w-5 h-5", config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-slate-900 truncate">
                              {result.title}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {result.type}
                            </Badge>
                          </div>
                          {result.subtitle && (
                            <p className="text-sm text-slate-600 line-clamp-1">
                              {result.subtitle}
                            </p>
                          )}
                          {result.meta && (
                            <p className="text-xs text-slate-500 mt-1">
                              {result.meta}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}