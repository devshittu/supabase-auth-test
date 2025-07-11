// src/lib/api-client.ts - REVISED baseURL
import Axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase-client';
import { logger } from './logger';

const supabase = createBrowserSupabaseClient(); // Instantiate the browser client

// For client-side API calls to Next.js API routes, a relative path is usually sufficient.
// The browser will resolve it against the current origin.
export const apiClient = Axios.create({
  baseURL: '/api', // Use relative path for Next.js API routes
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Ensure cookies are sent
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Check if window is defined to ensure this runs client-side
    if (typeof window !== 'undefined' && supabase) {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        logger.error('Failed to get session in API client interceptor:', error.message);
      } else if (session?.access_token) {
        config.headers.set('Authorization', `Bearer ${session.access_token}`);
        logger.debug('Token added to request.');
      } else {
        logger.warn('No session token available for API client request.');
      }
    } else if (!supabase) {
      logger.warn('Supabase client not initialized, skipping session check in API client interceptor.');
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      logger.error('Unauthorized API request, redirecting to login.');
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname + window.location.search;
        const encodedRedirect = encodeURIComponent(currentPath || '/dashboard');
        // Use router.push or window.location for client-side navigation
        window.location.href = `/login?next=${encodedRedirect}`;
      }
    } else if (status === 403 && error.response?.data?.message === 'Profile pending approval') {
       logger.warn('API request denied: Profile pending approval.');
       if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/profile')) {
           window.location.href = `/profile?pendingApproval=true`;
       }
    } else if (status === 403 && error.response?.data?.message === 'User profile not found. Please create one.') {
        logger.warn('API request denied: User profile not found.');
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/profile')) {
           window.location.href = `/profile?createProfile=true`;
       }
    }
    return Promise.reject(error);
  },
);

// // src/lib/api-client.ts

// import Axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
// import { createClient as createBrowserSupabaseClient } from '@/lib/supabase-client';
// import { logger } from './logger';
// const supabase = createBrowserSupabaseClient(); // Instantiate the browser client
// // Determine the API URL dynamically
// const getApiUrl = (): string => {
//   // Client-side: Use the current host
//   if (typeof window !== 'undefined') {
//     return window.location.origin;
//   }

//   // Server-side: Use Vercel's VERCEL_URL or fallback to localhost
//   const vercelUrl = process.env.VERCEL_URL;
//   if (vercelUrl) {
//     return `https://${vercelUrl}`;
//   }

//   // Local development fallback
//   return process.env.NEXT_SERVER_API_URL || 'http://localhost:3000';
// };

// const apiUrl = getApiUrl();

// if (!apiUrl) throw new Error('API URL is not defined');

// export const apiClient = Axios.create({
//   baseURL: apiUrl,
//   headers: { 'Content-Type': 'application/json' },
//   withCredentials: true, // Ensure cookies are sent
// });

// apiClient.interceptors.request.use(
//   async (config: InternalAxiosRequestConfig) => {
//     if (typeof window !== 'undefined' && supabase) {
//       const {
//         data: { session },
//         error,
//       } = await supabase.auth.getSession();
//       if (error) {
//         logger.error('Failed to get session:', error.message);
//       } else if (session?.access_token) {
//         config.headers.set('Authorization', `Bearer ${session.access_token}`);
//         logger.debug('Token added to request:', session.access_token);
//       } else {
//         logger.warn('No session token available');
//       }
//     } else if (!supabase) {
//       logger.warn('Supabase client not initialized, skipping session check');
//     }
//     return config;
//   },
//   (error) => Promise.reject(error),
// );

// apiClient.interceptors.response.use(
//   (response: AxiosResponse) => response.data,
//   (error) => {
//     const status = error.response?.status;
//     if (status === 401) {
//       console.error('Unauthorized request, redirecting to login');
//       if (typeof window !== 'undefined') {
//         const currentPath = window.location.pathname + window.location.search;
//         const encodedRedirect = encodeURIComponent(currentPath || '/dashboard');
//         window.location.href = `/login?next=${encodedRedirect}`;
//       }
//     }
//     return Promise.reject(error);
//   },
// );
// //Path: src/lib/api-client.ts
