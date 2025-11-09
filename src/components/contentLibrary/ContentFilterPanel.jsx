import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ContentFilterPanel({
  contentTypes,
  selectedContentType,
  onContentTypeChange,
  allTags,
  selectedTags,
  onTagsChange,
  onClearAll
}) {
  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const hasActiveFilters = selectedContentType !== 'all' || selectedTags.length > 0;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 text-sm">Active Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Tags Filter */}
      {allTags.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-600 mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 20).map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer hover:bg-blue-100"
                onClick={() => toggleTag(tag)}
              >
                {tag}
                {selectedTags.includes(tag) && (
                  <X className="w-3 h-3 ml-1" />
                )}
              </Badge>
            ))}
            {allTags.length > 20 && (
              <Badge variant="outline" className="text-xs">
                +{allTags.length - 20} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Selected Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-3 border-t border-slate-200">
          <p className="text-xs text-slate-600 mb-2">Active:</p>
          <div className="flex flex-wrap gap-2">
            {selectedContentType !== 'all' && (
              <Badge className="gap-1">
                Content: {contentTypes.find(t => t.value === selectedContentType)?.label}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => onContentTypeChange('all')}
                />
              </Badge>
            )}
            {selectedTags.map(tag => (
              <Badge key={tag} className="gap-1">
                {tag}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => toggleTag(tag)}
                />
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}