import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Search, Edit, Trash2, Award, Mail, Phone, Briefcase, Library } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PersonnelFormDialog from "../components/personnel/PersonnelFormDialog";
import PromoteToLibraryDialog from "../components/proposals/PromoteToLibraryDialog";

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

export default function KeyPersonnel() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [personnelToPromote, setPersonnelToPromote] = useState(null);

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

  const { data: personnel, isLoading } = useQuery({
    queryKey: ['key-personnel', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.KeyPersonnel.filter(
        { organization_id: organization.id },
        'full_name'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const deletePersonnelMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.KeyPersonnel.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['key-personnel'] });
    },
  });

  const filteredPersonnel = personnel.filter(p => 
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (person) => {
    setSelectedPersonnel(person);
    setShowDialog(true);
  };

  const handlePromoteToLibrary = (person) => {
    const bioContent = `
<h3>${person.full_name}</h3>
<p><strong>Title:</strong> ${person.title || 'N/A'}</p>
${person.years_experience ? `<p><strong>Experience:</strong> ${person.years_experience} years</p>` : ''}
${person.clearance_level && person.clearance_level !== 'none' ? `<p><strong>Clearance:</strong> ${person.clearance_level.toUpperCase().replace('_', ' ')}</p>` : ''}

${person.bio_short ? `
<h4>Professional Summary</h4>
<p>${person.bio_short}</p>
` : ''}

${person.education && person.education.length > 0 ? `
<h4>Education</h4>
<ul>
${person.education.map(e => `<li>${e.degree} in ${e.field}, ${e.institution} (${e.year})</li>`).join('\n')}
</ul>
` : ''}

${person.certifications && person.certifications.length > 0 ? `
<h4>Certifications</h4>
<ul>
${person.certifications.map(c => `<li>${c.name || c} - ${c.issuing_org || ''}</li>`).join('\n')}
</ul>
` : ''}

${person.skills && person.skills.length > 0 ? `
<h4>Key Skills</h4>
<p>${person.skills.join(', ')}</p>
` : ''}
    `.trim();

    setPersonnelToPromote({ content: bioContent, title: person.full_name });
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Key Personnel</h1>
          <p className="text-slate-600">Manage your team's key personnel profiles and bios</p>
        </div>
        <Button onClick={() => { setSelectedPersonnel(null); setShowDialog(true); }}>
          <Plus className="w-5 h-5 mr-2" />
          Add Person
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Search personnel..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : filteredPersonnel.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Key Personnel Yet</h3>
            <p className="text-slate-600 mb-6">
              Start building your key personnel database
            </p>
            <Button onClick={() => { setSelectedPersonnel(null); setShowDialog(true); }}>
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Person
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPersonnel.map((person) => (
            <Card key={person.id} className="border-none shadow-lg hover:shadow-xl transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {person.photo_url ? (
                      <img 
                        src={person.photo_url} 
                        alt={person.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {person.full_name?.[0]?.toUpperCase() || 'P'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-1">{person.full_name}</CardTitle>
                      {person.title && (
                        <p className="text-sm text-slate-500 line-clamp-1">{person.title}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(person)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        if (confirm('Delete this person?')) {
                          deletePersonnelMutation.mutate(person.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {person.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a href={`mailto:${person.email}`} className="text-blue-600 hover:underline truncate">
                      {person.email}
                    </a>
                  </div>
                )}
                {person.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{person.phone}</span>
                  </div>
                )}
                {person.years_experience && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    <span>{person.years_experience} years experience</span>
                  </div>
                )}
                
                {person.clearance_level && person.clearance_level !== 'none' && (
                  <div className="pt-2 border-t">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {person.clearance_level?.toUpperCase().replace('_', ' ')}
                    </Badge>
                  </div>
                )}

                {person.certifications && person.certifications.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <Award className="w-3 h-3" />
                      <span>Certifications</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {person.certifications.slice(0, 3).map((cert, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {cert.name || cert}
                        </Badge>
                      ))}
                      {person.certifications.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{person.certifications.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {person.usage_count > 0 && (
                  <div className="pt-2 border-t text-xs text-slate-500">
                    Used in {person.usage_count} proposal{person.usage_count !== 1 ? 's' : ''}
                  </div>
                )}

                <div className="pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePromoteToLibrary(person)}
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

      {showDialog && (
        <PersonnelFormDialog
          isOpen={showDialog}
          onClose={() => {
            setShowDialog(false);
            setSelectedPersonnel(null);
          }}
          personnel={selectedPersonnel}
          organization={organization}
        />
      )}

      <PromoteToLibraryDialog
        isOpen={showPromoteDialog}
        onClose={() => {
          setShowPromoteDialog(false);
          setPersonnelToPromote(null);
        }}
        sectionContent={personnelToPromote?.content}
        sectionName={personnelToPromote?.title}
        organization={organization}
      />
    </div>
  );
}