import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Skeleton Loading Components
 * 
 * Provides placeholder UI elements that mimic the layout of content
 * while data is loading, improving perceived performance.
 */

// Base skeleton component
function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200",
        className
      )}
      {...props}
    />
  );
}

// Text line skeleton
function SkeletonText({ className, lines = 1, ...props }) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton 
          key={idx} 
          className="h-4 w-full" 
          style={{ width: idx === lines - 1 ? '80%' : '100%' }}
        />
      ))}
    </div>
  );
}

// Card skeleton
function SkeletonCard({ className, ...props }) {
  return (
    <div className={cn("rounded-lg border border-slate-200 p-6", className)} {...props}>
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <SkeletonText lines={3} />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  );
}

// Table row skeleton
function SkeletonTableRow({ columns = 4, className, ...props }) {
  return (
    <div className={cn("flex items-center gap-4 py-4 border-b", className)} {...props}>
      {Array.from({ length: columns }).map((_, idx) => (
        <Skeleton key={idx} className="h-4 flex-1" />
      ))}
    </div>
  );
}

// List item skeleton
function SkeletonListItem({ className, ...props }) {
  return (
    <div className={cn("flex items-center gap-3 py-3 border-b", className)} {...props}>
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// Form skeleton
function SkeletonForm({ className, ...props }) {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      {[1, 2, 3].map((idx) => (
        <div key={idx} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

// Proposal card skeleton (specific to our app)
function SkeletonProposalCard({ className, ...props }) {
  return (
    <div className={cn("rounded-lg border-2 border-slate-200 bg-white p-4", className)} {...props}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        
        {/* Badges */}
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        
        {/* Content */}
        <SkeletonText lines={2} />
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex -space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

// Kanban board skeleton
function SkeletonKanbanBoard({ columns = 4, cardsPerColumn = 3 }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: columns }).map((_, colIdx) => (
        <div key={colIdx} className="flex-shrink-0 w-80">
          <div className="bg-slate-100 rounded-lg p-4">
            <Skeleton className="h-8 w-32 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: cardsPerColumn }).map((_, cardIdx) => (
                <SkeletonProposalCard key={cardIdx} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export { 
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonListItem,
  SkeletonForm,
  SkeletonProposalCard,
  SkeletonKanbanBoard
};