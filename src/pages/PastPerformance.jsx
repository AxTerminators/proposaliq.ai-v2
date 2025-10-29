import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileContainer, MobileGrid, MobileSection } from "../components/ui/mobile-container";
import {
  Award,
  Building2,
  Calendar,
  DollarSign,
  Plus,
  Search,
  Star,
  Target,
  TrendingUp,
  FileText,
  Edit,
  Trash2,
  ExternalLink,
  Filter,
  BarChart3,
  Users,
  MapPin,
  CheckCircle2,
  Sparkles,
  Download
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function PastPerformance() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    client_type: "all",
    status: "all",
    contract_type: "all",
    naics: "all"
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
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
        '-start_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id) => base44.entities.PastPerformance.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['past-performance'] });
      alert("✓ Project deleted successfully");
    }
  });

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = !searchQuery || 
      project.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.services_provided?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      project.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesClientType = filters.client_type === "all" || project.client_type === filters.client_type;
    const matchesStatus = filters.status === "all" || project.status === filters.status;
    const matchesContractType = filters.contract_type === "all" || project.contract_type === filters.contract_type;

    return matchesSearch && matchesClientType && matchesStatus && matchesContractType;
  });

  // Calculate statistics
  const stats = {
    total: projects.length,
    totalValue: projects.reduce((sum, p) => sum + (p.contract_value || 0), 0),
    avgRating: projects.filter(p => p.outcomes?.quality_score).length > 0
      ? projects.filter(p => p.outcomes?.quality_score).reduce((sum, p) => sum + p.outcomes.quality_score, 0) / projects.filter(p => p.outcomes?.quality_score).length
      : 0,
    featured: projects.filter(p => p.is_featured).length,
    avgContractSize: projects.length > 0 ? projects.reduce((sum, p) => sum + (p.contract_value || 0), 0) / projects.length : 0
  };

  const handleViewDetails = (project) => {
    setSelectedProject(project);
    setShowDetailsDialog(true);
  };

  const handleDelete = (project) => {
    if (confirm(`Delete "${project.project_name}"? This cannot be undone.`)) {
      deleteProjectMutation.mutate(project.id);
    }
  };

  return (
    <MobileContainer>
      <MobileSection
        title="Past Performance Library"
        description="Manage your project portfolio and showcase your track record"
        actions={
          <Button 
            onClick={() => {
              setSelectedProject(null);
              setShowAddDialog(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 min-h-[44px]"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Project
          </Button>
        }
      />

      {/* Statistics Cards */}
      <MobileGrid cols="4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
            <p className="text-sm text-slate-600 mt-1">Total Projects</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">
              ${(stats.totalValue / 1000000).toFixed(1)}M
            </p>
            <p className="text-sm text-slate-600 mt-1">Total Contract Value</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Star className="w-8 h-8 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {stats.avgRating.toFixed(1)}
            </p>
            <p className="text-sm text-slate-600 mt-1">Avg Quality Score</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600">{stats.featured}</p>
            <p className="text-sm text-slate-600 mt-1">Featured Projects</p>
          </CardContent>
        </Card>
      </MobileGrid>

      {/* Search and Filters */}
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search projects by name, client, services, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Select value={filters.client_type} onValueChange={(value) => setFilters({...filters, client_type: value})}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Client Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  <SelectItem value="federal">Federal</SelectItem>
                  <SelectItem value="state">State</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.contract_type} onValueChange={(value) => setFilters({...filters, contract_type: value})}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Contract Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="FFP">FFP</SelectItem>
                  <SelectItem value="T&M">T&M</SelectItem>
                  <SelectItem value="CPFF">CPFF</SelectItem>
                  <SelectItem value="IDIQ">IDIQ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200">
          <CardContent className="py-16 text-center">
            <Award className="w-20 h-20 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {projects.length === 0 ? "No Projects Yet" : "No Matching Projects"}
            </h3>
            <p className="text-slate-600 mb-6">
              {projects.length === 0 
                ? "Start building your past performance library to showcase your track record"
                : "Try adjusting your search or filters"
              }
            </p>
            {projects.length === 0 && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="border-none shadow-lg hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-lg font-bold text-slate-900">{project.project_name}</h3>
                          {project.is_featured && (
                            <Badge className="bg-amber-100 text-amber-700">
                              <Star className="w-3 h-3 mr-1 fill-amber-700" />
                              Featured
                            </Badge>
                          )}
                          <Badge variant="outline" className="capitalize">
                            {project.status}
                          </Badge>
                        </div>
                        <p className="text-slate-600 font-medium">{project.client_name}</p>
                        {project.client_agency && (
                          <p className="text-sm text-slate-500">{project.client_agency}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {project.contract_value && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <div>
                            <p className="text-xs text-slate-500">Contract Value</p>
                            <p className="font-semibold text-slate-900">
                              ${(project.contract_value / 1000000).toFixed(2)}M
                            </p>
                          </div>
                        </div>
                      )}

                      {project.start_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="text-xs text-slate-500">Duration</p>
                            <p className="font-semibold text-slate-900">
                              {new Date(project.start_date).getFullYear()} - {project.end_date ? new Date(project.end_date).getFullYear() : 'Present'}
                            </p>
                          </div>
                        </div>
                      )}

                      {project.outcomes?.quality_score && (
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-600" />
                          <div>
                            <p className="text-xs text-slate-500">Quality Score</p>
                            <p className="font-semibold text-slate-900">
                              {project.outcomes.quality_score.toFixed(1)}/5.0
                            </p>
                          </div>
                        </div>
                      )}

                      {project.usage_count > 0 && (
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-purple-600" />
                          <div>
                            <p className="text-xs text-slate-500">Used in Proposals</p>
                            <p className="font-semibold text-slate-900">{project.usage_count} times</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {project.services_provided && project.services_provided.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {project.services_provided.slice(0, 4).map((service, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                        {project.services_provided.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{project.services_provided.length - 4} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {project.cpars_rating && project.cpars_rating !== "N/A" && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-semibold text-green-900">
                          CPARS Rating: {project.cpars_rating}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(project)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProject(project);
                        setShowAddDialog(true);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(project)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog - Will create separate component */}
      {showAddDialog && (
        <AddProjectDialog
          project={selectedProject}
          organizationId={organization?.id}
          onClose={() => {
            setShowAddDialog(false);
            setSelectedProject(null);
          }}
        />
      )}

      {/* Details Dialog - Will create separate component */}
      {showDetailsDialog && selectedProject && (
        <ProjectDetailsDialog
          project={selectedProject}
          onClose={() => {
            setShowDetailsDialog(false);
            setSelectedProject(null);
          }}
        />
      )}
    </MobileContainer>
  );
}

// Placeholder components - will create full versions next
function AddProjectDialog({ project, organizationId, onClose }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'Add Past Performance Project'}</DialogTitle>
          <DialogDescription>
            Document your completed projects to showcase your track record
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-center text-slate-600">
          Full form coming in next component...
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button>Save Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectDetailsDialog({ project, onClose }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project.project_name}</DialogTitle>
          <DialogDescription>{project.client_name}</DialogDescription>
        </DialogHeader>
        <div className="py-4 text-center text-slate-600">
          Full details view coming in next component...
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}