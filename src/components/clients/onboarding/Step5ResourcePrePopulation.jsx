import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Package, FileText, Award, Users, Handshake, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";

const RESOURCE_TYPES = [
  { value: 'proposal_resource', label: 'Templates & Resources', icon: FileText, color: 'text-blue-600' },
  { value: 'past_performance', label: 'Past Performance', icon: Award, color: 'text-green-600' },
  { value: 'key_personnel', label: 'Key Personnel', icon: Users, color: 'text-purple-600' },
  { value: 'teaming_partner', label: 'Teaming Partners', icon: Handshake, color: 'text-orange-600' }
];

export default function Step5ResourcePrePopulation({ formData, setFormData, consultingFirm, onNext, onBack }) {
  const [selectedType, setSelectedType] = React.useState('proposal_resource');
  
  const selectedResources = formData.initial_resources || [];

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['firm-resources', consultingFirm?.id, selectedType],
    queryFn: async () => {
      if (!consultingFirm?.id) return [];
      
      const entityMap = {
        'proposal_resource': 'ProposalResource',
        'past_performance': 'PastPerformance',
        'key_personnel': 'KeyPersonnel',
        'teaming_partner': 'TeamingPartner'
      };

      const entityName = entityMap[selectedType];
      return base44.entities[entityName].filter({
        organization_id: consultingFirm.id
      }, '-created_date', 50);
    },
    enabled: !!consultingFirm?.id,
  });

  const toggleResource = (resourceId) => {
    const exists = selectedResources.find(r => 
      r.resource_id === resourceId && r.resource_type === selectedType
    );

    if (exists) {
      setFormData({
        ...formData,
        initial_resources: selectedResources.filter(r => 
          !(r.resource_id === resourceId && r.resource_type === selectedType)
        )
      });
    } else {
      setFormData({
        ...formData,
        initial_resources: [
          ...selectedResources,
          { resource_type: selectedType, resource_id: resourceId }
        ]
      });
    }
  };

  const isSelected = (resourceId) => {
    return selectedResources.some(r => 
      r.resource_id === resourceId && r.resource_type === selectedType
    );
  };

  const selectedCount = selectedResources.length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Package className="w-6 h-6 text-indigo-600" />
          Resource Pre-Population (Optional)
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Share templates, past performance, and other resources from your firm's library
        </p>
      </div>

      {selectedCount > 0 && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
          <p className="text-sm text-green-900 font-semibold">
            ✓ {selectedCount} resource{selectedCount !== 1 ? 's' : ''} selected to share
          </p>
        </div>
      )}

      {/* Resource Type Selector */}
      <div className="flex gap-2 flex-wrap">
        {RESOURCE_TYPES.map(type => {
          const Icon = type.icon;
          const count = selectedResources.filter(r => r.resource_type === type.value).length;
          
          return (
            <Button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              variant={selectedType === type.value ? "default" : "outline"}
              className="relative"
            >
              <Icon className="w-4 h-4 mr-2" />
              {type.label}
              {count > 0 && (
                <Badge className="ml-2 bg-green-600 text-white text-xs">
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Resource List */}
      <div className="border rounded-lg p-4 bg-white max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No {RESOURCE_TYPES.find(t => t.value === selectedType)?.label.toLowerCase()} available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {resources.map(resource => {
              const checked = isSelected(resource.id);
              const title = resource.title || resource.project_name || resource.full_name || resource.partner_name || 'Untitled';
              
              return (
                <div
                  key={resource.id}
                  onClick={() => toggleResource(resource.id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    checked
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox checked={checked} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{title}</p>
                      {resource.description && (
                        <p className="text-sm text-slate-600 truncate">{resource.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          💡 <strong>Tip:</strong> Pre-populating resources gives your client immediate access to relevant templates and information, accelerating proposal development.
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <Button onClick={onBack} variant="outline">
          ← Back
        </Button>
        <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-700">
          Next: Review & Confirm →
        </Button>
      </div>
    </div>
  );
}