// src/lib/supabase-server.ts - MODIFIED (Fixes Deprecation)
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from './logger'; // Import logger

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const createClient = (cookieStorePromise: ReturnType<typeof cookies>) => {
  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      async getAll() {
        const cookieStore = await cookieStorePromise;
        // logger.debug('Server Supabase Client: getAll called.');
        return cookieStore.getAll();
      },
      async setAll(cookiesToSet) {
        try {
          const cookieStore = await cookieStorePromise;
          cookiesToSet.forEach(({ name, value, options }) => {
            // logger.debug(`Server Supabase Client: Setting cookie - Name: ${name}, Path: ${options.path || '/'}`);
            cookieStore.set(name, value, options); // This is the correct signature for next/headers cookies().set
          });
        } catch (e) {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
          logger.warn(
            'Server Supabase client: setAll called in Server Component context, ignoring cookie set:',
            e,
          );
        }
      },
    },
  });
};

export const createAdminClient = () => {
  if (!serviceRoleKey) {
    logger.error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Admin client cannot be created.',
    );
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
  }
  return createServerClient(supabaseUrl!, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
    cookies: {
      getAll: () => [], // No cookies for service role key usage
      setAll: () => {}, // No cookies for service role key usage
    },
  });
};

// // src/lib/supabase-server.ts
// import { createServerClient, type CookieOptions } from '@supabase/ssr';
// import { cookies } from 'next/headers';
// import { logger } from './logger'; // Import logger

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// export const createClient = (cookieStorePromise: ReturnType<typeof cookies>) => {
//   return createServerClient(supabaseUrl!, supabaseKey!, {
//     cookies: {
//       async getAll() {
//         const cookieStore = await cookieStorePromise;
//         return cookieStore.getAll();
//       },
//       async setAll(cookiesToSet) {
//         try {
//           const cookieStore = await cookieStorePromise;
//           cookiesToSet.forEach(({ name, value, options }) =>
//             cookieStore.set(name, value, options),
//           );
//         } catch (e) {
//           // The `setAll` method was called from a Server Component.
//           // This can be ignored if you have middleware refreshing
//           // user sessions.
//           logger.warn(
//             'Server Supabase client: setAll called in Server Component context, ignoring cookie set:',
//             e,
//           );
//         }
//       },
//     },
//   });
// };

// export const createAdminClient = () => {
//   if (!serviceRoleKey) {
//     logger.error(
//       'SUPABASE_SERVICE_ROLE_KEY is not set. Admin client cannot be created.',
//     );
//     throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
//   }
//   return createServerClient(supabaseUrl!, serviceRoleKey, {
//     auth: {
//       persistSession: false,
//     },
//     cookies: {
//       getAll: () => [], // No cookies for service role key usage
//       setAll: () => {},
//     },
//   });
// };
