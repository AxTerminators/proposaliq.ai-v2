import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Edit, 
  Trash2, 
  Copy, 
  MoreVertical,
  FileText,
  Calendar
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

/**
 * Modal Config List Component
 * 
 * Displays list of modal configurations with actions
 */
export default function ModalConfigList({ configs, isLoading, onEdit, onRefetch }) {
  
  const handleDelete = async (config) => {
    if (!confirm(`Are you sure you want to delete "${config.name}"?`)) {
      return;
    }

    try {
      await base44.entities.ModalConfig.delete(config.id);
      onRefetch();
    } catch (error) {
      console.error('Error deleting modal config:', error);
      alert('Failed to delete modal config: ' + error.message);
    }
  };

  const handleDuplicate = async (config) => {
    try {
      await base44.entities.ModalConfig.create({
        name: `${config.name} (Copy)`,
        description: config.description,
        config_json: config.config_json,
        template_type: config.template_type || 'custom',
        category: config.category,
        icon_emoji: config.icon_emoji || '📄'
      });
      onRefetch();
    } catch (error) {
      console.error('Error duplicating modal config:', error);
      alert('Failed to duplicate modal config: ' + error.message);
    }
  };

  const getTemplateTypeColor = (type) => {
    switch (type) {
      case 'system':
        return 'bg-blue-100 text-blue-800';
      case 'organization':
        return 'bg-purple-100 text-purple-800';
      case 'custom':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-slate-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="p-12 text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No Modal Configs Yet
          </h3>
          <p className="text-slate-600 mb-4">
            Create your first modal configuration to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {configs.map((config) => (
        <Card 
          key={config.id}
          className={cn(
            "hover:shadow-lg transition-shadow cursor-pointer",
            !config.is_active && "opacity-60"
          )}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{config?.icon_emoji || '📄'}</span>
                <Badge className={getTemplateTypeColor(config?.template_type || 'custom')}>
                  {config?.template_type || 'custom'}
                </Badge>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(config)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(config)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleDelete(config)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <h3 className="font-semibold text-slate-900 mb-2">
              {config.name}
            </h3>
            
            {config.description && (
              <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                {config.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                v{config.version || 1}
              </div>
              {config.usage_count > 0 && (
                <div>
                  Used {config.usage_count} times
                </div>
              )}
            </div>

            <Button
              onClick={() => onEdit(config)}
              className="w-full mt-4"
              variant="outline"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Configuration
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}