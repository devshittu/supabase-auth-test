// src/lib/supabase-client.ts - REVISED (Handle window is not defined)
import { createBrowserClient } from '@supabase/ssr';
import { logger } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Determine the base URL dynamically based on environment
// On the client, use window.location.origin
// On the server, use an environment variable (e.g., NEXT_PUBLIC_VERCEL_URL for Vercel, or your Tailscale URL)
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Fallback for SSR/SSG. Ensure this environment variable is set in your deployment.
  // For your Tailscale setup, you might need to set NEXT_PUBLIC_APP_BASE_URL to 'https://tower.tail9b312.ts.net:3000'
  return process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000'; 
};

export const createClient = () =>
  createBrowserClient(supabaseUrl!, supabaseKey!, {
    
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      // url: `${getBaseUrl()}/api/auth/proxy`, 
    },
    cookies: {
        getAll() {
            if (typeof window !== 'undefined') {
                return document.cookie.split('; ').map((cookie) => {
                    const [name, value] = cookie.split('=');
                    return { name, value };
                });
            }
            return [];
        },
        setAll(cookiesToSet) {
            if (typeof window !== 'undefined') {
                const isSecureContext = window.location.protocol === 'https:';

                cookiesToSet.forEach(({ name, value, options }) => {
                    const cookieOptions = {
                        path: '/',
                        secure: options.secure && isSecureContext,
                    };
                    
                    let cookieString = `${name}=${value}`;
                    Object.entries(cookieOptions).forEach(([key, val]) => {
                        if (key === 'maxAge' && typeof val === 'number') {
                            const expiresDate = new Date(Date.now() + val * 1000);
                            cookieString += `; expires=${expiresDate.toUTCString()}`;
                        } else if (typeof val === 'boolean' && val) {
                            if (key === 'sameSite' && val === true) {
                                cookieString += `; SameSite=None`;
                            } else {
                                cookieString += `; ${key}`;
                            }
                        } else if (val !== undefined && val !== null) {
                            if (key !== 'maxAge' && key !== 'secure' && key !== 'httpOnly') {
                                cookieString += `; ${key}=${val}`;
                            }
                        }
                    });

                    document.cookie = cookieString;
                    logger.debug(`Browser Supabase Client: Set cookie - Name: ${name}, Value (truncated): ${value.substring(0, 10)}..., Final String: ${cookieString}`);
                });
            }
        },
    },
    global: {
      headers: { 
        'apikey': supabaseKey!, 
      },
    },
  });


// // src/lib/supabase-client.ts - REVISED (Point auth.url to Proxy)
// import { createBrowserClient } from '@supabase/ssr';
// import { logger } from './logger';

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// export const createClient = () =>
//   createBrowserClient(supabaseUrl!, supabaseKey!, {
//     auth: {
//       persistSession: true,
//       autoRefreshToken: true,
//       detectSessionInUrl: true,
//       flowType: 'pkce', // Important for Next.js SSR flows
//       // CRITICAL: Point the Auth URL to your local proxy
//       // All client-side auth calls will now go through your Next.js server
//       // and your proxy will handle the Supabase communication and cookie setting.
//       url: `${window.location.origin}/api/auth/proxy`, 
//     },
//     // Cookie methods are still needed as Supabase client directly manages document.cookie
//     cookies: {
//         getAll() {
//             if (typeof window !== 'undefined') {
//                 return document.cookie.split('; ').map((cookie) => {
//                     const [name, value] = cookie.split('=');
//                     return { name, value };
//                 });
//             }
//             return [];
//         },
//         setAll(cookiesToSet) {
//             if (typeof window !== 'undefined') {
//                 const isSecureContext = window.location.protocol === 'https:';

//                 cookiesToSet.forEach(({ name, value, options }) => {
//                     const cookieOptions = {
//                         path: '/',
//                         secure: options.secure && isSecureContext,
//                     };
                    
//                     let cookieString = `${name}=${value}`;
//                     Object.entries(cookieOptions).forEach(([key, val]) => {
//                         if (key === 'maxAge' && typeof val === 'number') {
//                             const expiresDate = new Date(Date.now() + val * 1000);
//                             cookieString += `; expires=${expiresDate.toUTCString()}`;
//                         } else if (typeof val === 'boolean' && val) {
//                             if (key === 'sameSite' && val === true) {
//                                 cookieString += `; SameSite=None`;
//                             } else {
//                                 cookieString += `; ${key}`;
//                             }
//                         } else if (val !== undefined && val !== null) {
//                             if (key !== 'maxAge' && key !== 'secure' && key !== 'httpOnly') {
//                                 cookieString += `; ${key}=${val}`;
//                             }
//                         }
//                     });

//                     document.cookie = cookieString;
//                     logger.debug(`Browser Supabase Client: Set cookie - Name: ${name}, Value (truncated): ${value.substring(0, 10)}..., Final String: ${cookieString}`);
//                 });
//             }
//         },
//     },
//     global: {
//       headers: { 
//         'apikey': supabaseKey!, 
//       },
//     },
//   });