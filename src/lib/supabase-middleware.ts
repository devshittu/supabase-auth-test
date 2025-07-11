// src/lib/supabase-middleware.ts - ABSOLUTELY FINAL REVISION (Fixes Deprecation and Redirection)
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = (request: NextRequest) => {
  // Create a response object that we will mutate to set cookies.
  // This response will eventually be returned by the middleware if no redirect happens.
  const response = NextResponse.next({
    request: {
      headers: request.headers, // Maintain original request headers
    },
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      // getAll method for reading cookies from the incoming request
      getAll() {
        // logger.debug(`Middleware Supabase Client: getAll called. Request cookies: ${JSON.stringify(request.cookies.getAll())}`);
        return request.cookies.getAll();
      },
      // setAll method for setting cookies on the outgoing response
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          logger.debug(`Middleware Supabase Client: Setting cookie on response - Name: ${name}, Value (truncated): ${value.substring(0, 10)}..., Path: ${options.path || '/'}`);
          // Set the cookie on the response object. This will create the 'Set-Cookie' header.
          response.cookies.set({
            name,
            value,
            ...options, // Spread all other cookie options like domain, path, expires, etc.
          });
        });
      },
    },
  });

  return { supabase, response };
};

// // src/lib/supabase-middleware.ts
// import { createServerClient, type CookieOptions } from '@supabase/ssr';
// import { type NextRequest, NextResponse } from 'next/server';
// import { logger } from './logger'; // Import logger

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// export const createClient = (request: NextRequest) => {
//   // Create an unmodified response
//   let supabaseResponse = NextResponse.next({
//     request: {
//       headers: request.headers,
//     },
//   });

//   const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
//     cookies: {
//       getAll() {
//         return request.cookies.getAll();
//       },
//       setAll(cookiesToSet) {
//         cookiesToSet.forEach(({ name, value, options }) =>
//           request.cookies.set(name, value),
//         );
//         supabaseResponse = NextResponse.next({
//           request,
//         });
//         cookiesToSet.forEach(({ name, value, options }) =>
//           supabaseResponse.cookies.set(name, value, options),
//         );
//       },
//     },
//   });

//   return { supabase, response: supabaseResponse };
// };
