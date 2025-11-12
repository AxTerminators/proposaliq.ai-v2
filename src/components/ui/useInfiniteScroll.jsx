import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Custom hook for infinite scroll functionality
 * Automatically loads more data when user scrolls near the bottom
 * 
 * @param {Function} loadMore - Function to call when more data is needed
 * @param {boolean} hasMore - Whether there is more data to load
 * @param {boolean} isLoading - Whether data is currently loading
 * @param {number} threshold - Distance from bottom (in pixels) to trigger load (default: 100)
 * @returns {Object} - { containerRef, loadingRef, isNearBottom }
 */
export function useInfiniteScroll({
  loadMore,
  hasMore,
  isLoading = false,
  threshold = 100
}) {
  const containerRef = useRef(null);
  const loadingRef = useRef(null);
  const [isNearBottom, setIsNearBottom] = useState(false);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || isLoading || !hasMore) return;

    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const shouldLoad = distanceFromBottom < threshold;

    setIsNearBottom(shouldLoad);

    if (shouldLoad) {
      loadMore();
    }
  }, [loadMore, hasMore, isLoading, threshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    
    // Check on mount in case content is already at bottom
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Alternative: Intersection Observer approach for the loading indicator
  useEffect(() => {
    if (!loadingRef.current || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      {
        root: containerRef.current,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    observer.observe(loadingRef.current);

    return () => {
      if (loadingRef.current) {
        observer.unobserve(loadingRef.current);
      }
    };
  }, [loadMore, hasMore, isLoading]);

  return {
    containerRef,
    loadingRef,
    isNearBottom
  };
}

/**
 * Hook for paginated infinite scroll
 * Manages page state and loading
 * 
 * @param {Array} allItems - Complete array of items
 * @param {number} itemsPerPage - Number of items to load per page
 * @returns {Object} - { visibleItems, hasMore, loadMore, isLoading, reset }
 */
export function usePaginatedInfiniteScroll(allItems = [], itemsPerPage = 20) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const visibleItems = allItems.slice(0, currentPage * itemsPerPage);
  const hasMore = visibleItems.length < allItems.length;

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    
    // Simulate loading delay for smooth UX
    setTimeout(() => {
      setCurrentPage(prev => prev + 1);
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, hasMore]);

  const reset = useCallback(() => {
    setCurrentPage(1);
    setIsLoadingMore(false);
  }, []);

  // Reset when allItems changes (e.g., filters applied)
  useEffect(() => {
    reset();
  }, [allItems.length, reset]);

  return {
    visibleItems,
    hasMore,
    loadMore,
    isLoading: isLoadingMore,
    reset,
    totalItems: allItems.length,
    visibleCount: visibleItems.length
  };
}