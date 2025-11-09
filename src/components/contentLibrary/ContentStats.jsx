import React from "react";
import { Badge } from "@/components/ui/badge";
import { Database, Filter } from "lucide-react";

export default function ContentStats({ totalItems, filteredItems }) {
  const isFiltered = totalItems !== filteredItems;

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1 text-slate-600">
        <Database className="w-4 h-4" />
        <span className="font-semibold">{totalItems}</span>
        <span>total</span>
      </div>
      
      {isFiltered && (
        <div className="flex items-center gap-1 text-blue-600">
          <Filter className="w-4 h-4" />
          <span className="font-semibold">{filteredItems}</span>
          <span>filtered</span>
        </div>
      )}
    </div>
  );
}