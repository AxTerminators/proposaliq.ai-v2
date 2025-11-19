import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Database, Link as LinkIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Data Mapping Editor Component
 * 
 * Phase 1: Map form fields to entity attributes or custom JSON fields
 */
export default function DataMappingEditor({ field, onUpdate }) {
  const [mappingType, setMappingType] = useState(field.mappingType || 'none');
  const [targetEntity, setTargetEntity] = useState(field.targetEntity || '');
  const [targetAttribute, setTargetAttribute] = useState(field.targetAttribute || '');
  const [customJsonPath, setCustomJsonPath] = useState(field.customJsonPath || '');

  // List of common entities for mapping
  const availableEntities = [
    'Proposal',
    'TeamingPartner',
    'ProposalResource',
    'ProposalSection',
    'Organization',
    'KeyPersonnel',
    'ProposalTask'
  ];

  // Fetch schema for selected entity
  const { data: entitySchema } = useQuery({
    queryKey: ['entitySchema', targetEntity],
    queryFn: async () => {
      if (!targetEntity) return null;
      try {
        return await base44.entities[targetEntity].schema();
      } catch (error) {
        console.error('Error fetching schema:', error);
        return null;
      }
    },
    enabled: !!targetEntity
  });

  // Get available attributes from schema
  const availableAttributes = entitySchema?.properties 
    ? Object.keys(entitySchema.properties).filter(key => 
        !['id', 'created_date', 'updated_date', 'created_by'].includes(key)
      )
    : [];

  const handleMappingTypeChange = (type) => {
    setMappingType(type);
    onUpdate({ 
      mappingType: type,
      targetEntity: '',
      targetAttribute: '',
      customJsonPath: ''
    });
  };

  const handleEntityChange = (entity) => {
    setTargetEntity(entity);
    setTargetAttribute('');
    onUpdate({ 
      targetEntity: entity,
      targetAttribute: ''
    });
  };

  const handleAttributeChange = (attr) => {
    setTargetAttribute(attr);
    onUpdate({ targetAttribute: attr });
  };

  const handleCustomJsonPathChange = (path) => {
    setCustomJsonPath(path);
    onUpdate({ customJsonPath: path });
  };

  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-center gap-2 mb-2">
        <Database className="w-4 h-4 text-slate-600" />
        <h5 className="font-semibold text-sm text-slate-900">Data Mapping</h5>
      </div>

      {/* Mapping Type */}
      <div>
        <Label className="text-xs">Map To</Label>
        <Select value={mappingType} onValueChange={handleMappingTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No mapping</SelectItem>
            <SelectItem value="entity">Entity Attribute</SelectItem>
            <SelectItem value="custom_json">Custom JSON Field</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Entity Attribute Mapping */}
      {mappingType === 'entity' && (
        <>
          <div>
            <Label className="text-xs">Target Entity</Label>
            <Select value={targetEntity} onValueChange={handleEntityChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity..." />
              </SelectTrigger>
              <SelectContent>
                {availableEntities.map(entity => (
                  <SelectItem key={entity} value={entity}>
                    {entity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {targetEntity && (
            <div>
              <Label className="text-xs">Target Attribute</Label>
              <Select value={targetAttribute} onValueChange={handleAttributeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select attribute..." />
                </SelectTrigger>
                <SelectContent>
                  {availableAttributes.length > 0 ? (
                    availableAttributes.map(attr => (
                      <SelectItem key={attr} value={attr}>
                        {attr}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value={null} disabled>Loading...</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {targetEntity && targetAttribute && (
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
              <LinkIcon className="w-3 h-3 text-green-600" />
              <span className="text-xs text-green-800 font-medium">
                {targetEntity}.{targetAttribute}
              </span>
            </div>
          )}
        </>
      )}

      {/* Custom JSON Path Mapping */}
      {mappingType === 'custom_json' && (
        <div>
          <Label className="text-xs">JSON Path</Label>
          <Input
            value={customJsonPath}
            onChange={(e) => handleCustomJsonPathChange(e.target.value)}
            placeholder="e.g., custom_fields.team_lead"
            className="text-sm font-mono"
          />
          <p className="text-xs text-slate-500 mt-1">
            Will be stored in Proposal.custom_fields or similar JSON field
          </p>
        </div>
      )}

      {mappingType === 'none' && (
        <p className="text-xs text-slate-600 italic">
          This field will not be saved to the database
        </p>
      )}
    </div>
  );
}