// src/app/providers.tsx
'use client'; // This component must be a Client Component

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { logger } from '@/lib/logger'; // Make sure you have a logger utility
import { useState } from 'react'; // Using useState to avoid throwing away client on initial render if no suspense boundary

function makeQueryClient() {
  logger.debug('Creating new QueryClient instance.');
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        // A staleTime of 0 would cause a refetch on mount, which is often not desired for SSR.
        staleTime: 60 * 1000, // Data is stale after 60 seconds
        // You might want to consider refetchOnWindowFocus, refetchOnMount, etc.
        // based on your application's needs.
      },
    },
  });
}

export default function Providers({ children }: { children: React.ReactNode }) {
  // Use a ref or useState to ensure a single QueryClient instance is created per component instance
  // for the browser, and new ones are created on the server per request.
  // The `useState` approach is generally recommended over a global `let browserQueryClient`
  // if you have suspense boundaries and want to ensure proper client behavior.
  // For the server, the component will be re-rendered for each request, creating a new client.
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

// NOTE: The `isServer` check from the Tanstack Query docs is usually handled implicitly
// by Next.js App Router's rendering model. If this `Providers` component is used in a
// RootLayout (which is a Server Component), then `makeQueryClient` will be called
// on the server for each request. When this component is hydrated on the client,
// `makeQueryClient` will be called once per client-side component instance.
// Using `useState` ensures it's a singleton for the client.
