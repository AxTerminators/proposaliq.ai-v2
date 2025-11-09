
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Award, DollarSign, Calendar, Building2, Library } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AddProjectForm from "../components/pastperformance/AddProjectForm";
import PromoteToLibraryDialog from "../components/proposals/PromoteToLibraryDialog";

// Helper function to get user's active organization
async function getUserActiveOrganization(user) {
  if (!user) return null;
  let orgId = null;
  if (user.active_client_id) {
    orgId = user.active_client_id;
  } else if (user.client_accesses && user.client_accesses.length > 0) {
    orgId = user.client_accesses[0].organization_id;
  } else {
    const orgs = await base44.entities.Organization.filter(
      { created_by: user.email },
      '-created_date',
      1
    );
    if (orgs.length > 0) {
      orgId = orgs[0].id;
    }
  }
  if (orgId) {
    const orgs = await base44.entities.Organization.filter({ id: orgId });
    if (orgs.length > 0) {
      return orgs[0];
    }
  }
  return null;
}

export default function PastPerformance() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [projectToPromote, setProjectToPromote] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const org = await getUserActiveOrganization(currentUser);
        if (org) {
          setOrganization(org);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['past-performance', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.PastPerformance.filter(
        { organization_id: organization.id },
        '-project_end_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.PastPerformance.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['past-performance'] });
    },
  });

  const filteredProjects = projects.filter(p => 
    p.project_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.contract_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingProject(null);
  };

  const handlePromoteToLibrary = (project) => {
    // Create a formatted narrative from project data
    const narrative = `
<h3>${project.project_title || ''}</h3>
<p><strong>Client:</strong> ${project.client_name || ''} ${project.client_agency ? `(${project.client_agency})` : ''}</p>
<p><strong>Contract:</strong> ${project.contract_number || 'N/A'} | ${project.contract_type || ''} | $${project.contract_value ? (project.contract_value / 1000000).toFixed(1) + 'M' : 'N/A'}</p>
<p><strong>Period:</strong> ${project.project_start_date ? new Date(project.project_start_date).getFullYear() : 'N/A'} - ${project.project_end_date ? new Date(project.project_end_date).getFullYear() : 'N/A'}</p>

<h4>Project Description</h4>
<p>${project.project_description || 'No description provided.'}</p>

${project.services_provided && project.services_provided.length > 0 ? `
<h4>Services Provided</h4>
<ul>
${project.services_provided.map(s => `<li>${s}</li>`).join('\n')}
</ul>
` : ''}

${project.outcomes ? `
<h4>Outcomes</h4>
<ul>
${project.outcomes.on_time_delivery_pct ? `<li>On-Time Delivery: ${project.outcomes.on_time_delivery_pct}%</li>` : ''}
${project.outcomes.quality_score ? `<li>Quality Score: ${project.outcomes.quality_score}/5</li>` : ''}
${project.outcomes.customer_satisfaction ? `<li>Customer Satisfaction: ${project.outcomes.customer_satisfaction}/5</li>` : ''}
</ul>
` : ''}
    `.trim();

    setProjectToPromote({ content: narrative, title: project.project_title });
    setShowPromoteDialog(true);
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Past Performance</h1>
          <p className="text-slate-600">Track your successful project history</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Add Project
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {showAddForm && (
        <AddProjectForm 
          organization={organization}
          project={editingProject}
          onClose={handleCloseForm}
        />
      )}

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Projects Yet</h3>
            <p className="text-slate-600 mb-6">
              Start building your past performance portfolio
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="border-none shadow-lg hover:shadow-xl transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <CardTitle className="text-lg mb-2 line-clamp-2">
                      {project.project_title}
                    </CardTitle>
                    <Badge variant="secondary" className="capitalize">
                      {project.contract_type}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(project)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        if (confirm('Delete this project?')) {
                          deleteProjectMutation.mutate(project.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.client_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>{project.client_name}</span>
                  </div>
                )}
                
                {project.contract_value && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    <span>${(project.contract_value / 1000000).toFixed(1)}M</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>
                    {new Date(project.project_start_date).getFullYear()} - {new Date(project.project_end_date).getFullYear()}
                  </span>
                </div>

                {project.project_description && (
                  <p className="text-sm text-slate-600 line-clamp-3 pt-2 border-t">
                    {project.project_description}
                  </p>
                )}

                <div className="pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePromoteToLibrary(project)}
                    className="w-full bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-300"
                  >
                    <Library className="w-4 h-4 mr-2 text-green-600" />
                    Add to Content Library
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PromoteToLibraryDialog
        isOpen={showPromoteDialog}
        onClose={() => {
          setShowPromoteDialog(false);
          setProjectToPromote(null);
        }}
        sectionContent={projectToPromote?.content}
        sectionName={projectToPromote?.title}
        organization={organization}
      />
    </div>
  );
}
