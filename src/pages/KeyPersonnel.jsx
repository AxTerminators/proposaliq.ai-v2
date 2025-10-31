import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Search,
  Plus,
  Trash2,
  Eye,
  Copy,
  Star,
  Loader2,
  Award,
  Briefcase,
  GraduationCap
} from "lucide-react";
import ResumeBioGenerator from "../components/personnel/ResumeBioGenerator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function KeyPersonnel() {
  const queryClient = useQueryClient();
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copiedBio, setCopiedBio] = useState(null);

  useEffect(() => {
    const loadOrg = async () => {
      try {
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }
      } catch (error) {
        console.error("Error loading org:", error);
      }
    };
    loadOrg();
  }, []);

  const { data: personnel = [], isLoading } = useQuery({
    queryKey: ['key-personnel', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.KeyPersonnel.filter({
        organization_id: organization.id
      }, '-created_date');
    },
    enabled: !!organization?.id,
  });

  const deletePersonnelMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.KeyPersonnel.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['key-personnel'] });
      alert("Personnel deleted successfully!");
    },
  });

  const filteredPersonnel = personnel.filter(person =>
    person.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const copyBio = (bio, type) => {
    navigator.clipboard.writeText(bio);
    setCopiedBio(type);
    setTimeout(() => setCopiedBio(null), 2000);
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Key Personnel Library</h1>
            <p className="text-slate-600">Manage resumes and generate professional bios with AI</p>
          </div>
          <Button onClick={() => setShowGenerator(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Personnel / Generate Bios
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <User className="w-8 h-8 text-blue-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">{personnel.length}</p>
                  <p className="text-xs text-slate-600">Total Personnel</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Briefcase className="w-8 h-8 text-green-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {personnel.filter(p => p.is_available).length}
                  </p>
                  <p className="text-xs text-slate-600">Available</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Award className="w-8 h-8 text-purple-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {personnel.reduce((sum, p) => sum + (p.certifications?.length || 0), 0)}
                  </p>
                  <p className="text-xs text-slate-600">Certifications</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Copy className="w-8 h-8 text-orange-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {personnel.reduce((sum, p) => sum + (p.usage_count || 0), 0)}
                  </p>
                  <p className="text-xs text-slate-600">Times Used</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="border-none shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search by name, title, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Personnel Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading personnel...</p>
          </div>
        ) : filteredPersonnel.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="p-12 text-center">
              <User className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {searchQuery ? "No Personnel Found" : "No Personnel Yet"}
              </h3>
              <p className="text-slate-600 mb-6">
                {searchQuery 
                  ? "Try adjusting your search" 
                  : "Add your first team member and generate professional bios with AI"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowGenerator(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Personnel
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPersonnel.map((person) => (
              <Card key={person.id} className="border-none shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {person.photo_url ? (
                        <img 
                          src={person.photo_url} 
                          alt={person.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">
                            {person.full_name?.[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base">{person.full_name}</CardTitle>
                        <p className="text-sm text-slate-600">{person.title}</p>
                      </div>
                    </div>
                    {person.is_available && (
                      <Badge className="bg-green-100 text-green-700">Available</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {person.years_experience && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Briefcase className="w-4 h-4" />
                        {person.years_experience} years experience
                      </div>
                    )}

                    {person.education && person.education.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <GraduationCap className="w-4 h-4" />
                        {person.education[0].degree}
                      </div>
                    )}

                    {person.clearance_level && person.clearance_level !== 'none' && (
                      <Badge variant="outline" className="text-xs">
                        {person.clearance_level.toUpperCase()}
                      </Badge>
                    )}

                    {person.skills && person.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {person.skills.slice(0, 3).map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {person.skills.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{person.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {person.usage_count > 0 && (
                      <div className="text-xs text-slate-500">
                        Used in {person.usage_count} proposals
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedPerson(person);
                          setShowPreview(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Bios
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Delete ${person.full_name}?`)) {
                            deletePersonnelMutation.mutate(person.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Generator Dialog */}
        <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI Resume & Bio Generator</DialogTitle>
            </DialogHeader>
            <ResumeBioGenerator
              organization={organization}
              onPersonnelCreated={(person) => {
                queryClient.invalidateQueries({ queryKey: ['key-personnel'] });
                setShowGenerator(false);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedPerson?.full_name} - Professional Bios</DialogTitle>
            </DialogHeader>
            {selectedPerson && (
              <Tabs defaultValue="short" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="short">Short</TabsTrigger>
                  <TabsTrigger value="medium">Medium</TabsTrigger>
                  <TabsTrigger value="long">Long</TabsTrigger>
                  <TabsTrigger value="executive">Executive</TabsTrigger>
                </TabsList>

                <TabsContent value="short">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Short Bio (150 words)</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyBio(selectedPerson.bio_short, 'short')}
                        >
                          {copiedBio === 'short' ? (
                            <>
                              <Check className="w-4 h-4 mr-2 text-green-600" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-2" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap leading-relaxed">{selectedPerson.bio_short}</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="medium">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Medium Bio (300 words)</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyBio(selectedPerson.bio_medium, 'medium')}
                        >
                          {copiedBio === 'medium' ? (
                            <>
                              <Check className="w-4 h-4 mr-2 text-green-600" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-2" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap leading-relaxed">{selectedPerson.bio_medium}</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="long">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Long Bio (500 words)</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyBio(selectedPerson.bio_long, 'long')}
                        >
                          {copiedBio === 'long' ? (
                            <>
                              <Check className="w-4 h-4 mr-2 text-green-600" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-2" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap leading-relaxed">{selectedPerson.bio_long}</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="executive">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Executive Summary</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyBio(selectedPerson.bio_executive_summary, 'executive')}
                        >
                          {copiedBio === 'executive' ? (
                            <>
                              <Check className="w-4 h-4 mr-2 text-green-600" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-2" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap leading-relaxed">{selectedPerson.bio_executive_summary}</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}