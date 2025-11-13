import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// PERFORMANCE OPTIMIZATION: Global React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Keep unused data in cache for 10 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      // Retry failed requests once with exponential backoff
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus by default (reduces unnecessary API calls)
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect by default
      refetchOnReconnect: false,
      // Don't refetch on mount if data is still fresh
      refetchOnMount: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

/**
 * React Query Provider with optimized defaults for performance
 * Wraps the app to provide global query client
 */
export function ReactQueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export { queryClient };