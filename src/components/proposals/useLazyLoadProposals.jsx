import { useState, useMemo, useCallback } from "react";

/**
 * Custom hook for lazy loading proposals
 * Supports pagination and infinite scroll patterns
 * 
 * @param {Array} proposals - Full array of proposals
 * @param {number} initialPageSize - Number of items to show initially
 * @param {number} pageSize - Number of items to load per page
 * @returns {Object} - { visibleProposals, hasMore, loadMore, reset, isShowingAll }
 */
export function useLazyLoadProposals(proposals, initialPageSize = 20, pageSize = 20) {
  const [loadedCount, setLoadedCount] = useState(initialPageSize);

  const visibleProposals = useMemo(() => {
    if (!proposals || proposals.length === 0) return [];
    return proposals.slice(0, loadedCount);
  }, [proposals, loadedCount]);

  const hasMore = useMemo(() => {
    return proposals && proposals.length > loadedCount;
  }, [proposals, loadedCount]);

  const isShowingAll = useMemo(() => {
    return proposals && loadedCount >= proposals.length;
  }, [proposals, loadedCount]);

  const loadMore = useCallback(() => {
    setLoadedCount(prev => prev + pageSize);
  }, [pageSize]);

  const loadAll = useCallback(() => {
    if (proposals) {
      setLoadedCount(proposals.length);
    }
  }, [proposals]);

  const reset = useCallback(() => {
    setLoadedCount(initialPageSize);
  }, [initialPageSize]);

  return {
    visibleProposals,
    hasMore,
    loadMore,
    loadAll,
    reset,
    isShowingAll,
    totalCount: proposals?.length || 0,
    visibleCount: visibleProposals.length
  };
}

/**
 * Hook for lazy loading within Kanban columns
 * Each column maintains its own load state
 */
export function useLazyLoadColumns(proposalsByColumn, initialCardCount = 10, cardsPerLoad = 10) {
  const [loadedCounts, setLoadedCounts] = useState({});

  const getVisibleProposals = useCallback((columnId) => {
    const proposals = proposalsByColumn[columnId] || [];
    const loadedCount = loadedCounts[columnId] || initialCardCount;
    return proposals.slice(0, loadedCount);
  }, [proposalsByColumn, loadedCounts, initialCardCount]);

  const hasMore = useCallback((columnId) => {
    const proposals = proposalsByColumn[columnId] || [];
    const loadedCount = loadedCounts[columnId] || initialCardCount;
    return proposals.length > loadedCount;
  }, [proposalsByColumn, loadedCounts, initialCardCount]);

  const loadMore = useCallback((columnId) => {
    setLoadedCounts(prev => ({
      ...prev,
      [columnId]: (prev[columnId] || initialCardCount) + cardsPerLoad
    }));
  }, [initialCardCount, cardsPerLoad]);

  const loadAll = useCallback((columnId) => {
    const proposals = proposalsByColumn[columnId] || [];
    setLoadedCounts(prev => ({
      ...prev,
      [columnId]: proposals.length
    }));
  }, [proposalsByColumn]);

  const reset = useCallback(() => {
    setLoadedCounts({});
  }, []);

  return {
    getVisibleProposals,
    hasMore,
    loadMore,
    loadAll,
    reset,
    getStats: (columnId) => {
      const proposals = proposalsByColumn[columnId] || [];
      const loadedCount = loadedCounts[columnId] || initialCardCount;
      return {
        total: proposals.length,
        visible: Math.min(proposals.length, loadedCount)
      };
    }
  };
}