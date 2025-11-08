import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Save,
  Bookmark,
  Star,
  Trash2,
  Edit,
  ChevronDown,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SavedViews({ 
  organization, 
  user, 
  currentFilters, 
  onApplyView 
}) {
  const queryClient = useQueryClient();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [viewName, setViewName] = useState("");
  const [editingView, setEditingView] = useState(null);

  // Create UserPreference entity on the fly to store saved views
  const { data: savedViews = [] } = useQuery({
    queryKey: ['saved-views', user?.email, organization?.id],
    queryFn: async () => {
      if (!user?.email) return [];
      
      // Try to get user preferences
      try {
        const prefs = await base44.entities.UserPreference?.filter({
          user_email: user.email,
          organization_id: organization?.id,
          preference_type: 'saved_filter_view'
        }) || [];
        
        return prefs;
      } catch (error) {
        // Entity might not exist, return empty array
        console.log('UserPreference entity not found, using localStorage');
        
        // Fallback to localStorage
        const stored = localStorage.getItem(`saved_views_${user.email}_${organization?.id}`);
        return stored ? JSON.parse(stored) : [];
      }
    },
    enabled: !!user?.email && !!organization?.id,
    staleTime: 60000
  });

  const saveViewMutation = useMutation({
    mutationFn: async ({ name, filters }) => {
      // Try to save to database first, fallback to localStorage
      try {
        const viewData = {
          user_email: user.email,
          organization_id: organization.id,
          preference_type: 'saved_filter_view',
          preference_name: name,
          preference_data: JSON.stringify(filters),
          is_default: false
        };
        
        if (editingView) {
          return await base44.entities.UserPreference.update(editingView.id, viewData);
        } else {
          return await base44.entities.UserPreference.create(viewData);
        }
      } catch (error) {
        console.log('Falling back to localStorage for saved views');
        
        // Fallback to localStorage
        const currentViews = savedViews.filter(v => v.id !== editingView?.id);
        const newView = {
          id: editingView?.id || `view_${Date.now()}`,
          ...{
            user_email: user.email,
            organization_id: organization.id,
            preference_type: 'saved_filter_view',
            preference_name: name,
            preference_data: JSON.stringify(filters),
            is_default: false
          }
        };
        
        const updatedViews = [...currentViews, newView];
        localStorage.setItem(`saved_views_${user.email}_${organization.id}`, JSON.stringify(updatedViews));
        
        return newView;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-views'] });
      setShowSaveDialog(false);
      setViewName("");
      setEditingView(null);
    }
  });

  const deleteViewMutation = useMutation({
    mutationFn: async (viewId) => {
      try {
        return await base44.entities.UserPreference.delete(viewId);
      } catch (error) {
        // Fallback to localStorage
        const updatedViews = savedViews.filter(v => v.id !== viewId);
        localStorage.setItem(`saved_views_${user.email}_${organization.id}`, JSON.stringify(updatedViews));
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-views'] });
    }
  });

  const handleSaveView = () => {
    if (!viewName.trim()) {
      alert('Please enter a view name');
      return;
    }
    
    saveViewMutation.mutate({
      name: viewName.trim(),
      filters: currentFilters
    });
  };

  const handleApplyView = (view) => {
    try {
      const filters = typeof view.preference_data === 'string' 
        ? JSON.parse(view.preference_data) 
        : view.preference_data;
      
      onApplyView(filters);
    } catch (error) {
      console.error('Error applying view:', error);
      alert('Error loading saved view');
    }
  };

  const handleEditView = (view) => {
    setEditingView(view);
    setViewName(view.preference_name);
    setShowSaveDialog(true);
  };

  const handleDeleteView = (viewId) => {
    if (confirm('Delete this saved view?')) {
      deleteViewMutation.mutate(viewId);
    }
  };

  const activeFiltersCount = Object.values(currentFilters || {}).filter(v => v && v !== "all").length;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Bookmark className="w-4 h-4" />
            Saved Views
            {savedViews.length > 0 && (
              <Badge className="bg-blue-600 text-white h-5 w-5 p-0 flex items-center justify-center">
                {savedViews.length}
              </Badge>
            )}
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="p-2">
            <Button
              onClick={() => {
                setEditingView(null);
                setViewName("");
                setShowSaveDialog(true);
              }}
              disabled={!activeFiltersCount}
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Current View
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 bg-white text-blue-600">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>
          
          <DropdownMenuSeparator />
          
          {savedViews.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              <Filter className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No saved views yet</p>
              <p className="text-xs mt-1">Apply filters and save them</p>
            </div>
          ) : (
            savedViews.map(view => (
              <DropdownMenuItem
                key={view.id}
                className="flex items-center justify-between cursor-pointer group"
                onClick={(e) => {
                  e.preventDefault();
                  handleApplyView(view);
                }}
              >
                <div className="flex items-center gap-2 flex-1">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="text-sm">{view.preference_name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditView(view);
                    }}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-600 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteView(view.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save View Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={(open) => {
        setShowSaveDialog(open);
        if (!open) {
          setEditingView(null);
          setViewName("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingView ? 'Edit Saved View' : 'Save Current View'}
            </DialogTitle>
            <DialogDescription>
              Give this filter combination a memorable name
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="e.g., High Priority RFPs"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveView();
                  }
                }}
              />
            </div>

            {currentFilters && Object.keys(currentFilters).length > 0 && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">Current Filters:</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(currentFilters).map(([key, value]) => {
                    if (!value || value === "all") return null;
                    return (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {value}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveView} disabled={saveViewMutation.isPending}>
              {saveViewMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingView ? 'Update View' : 'Save View'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}