// src/components/auth/SupabaseListener.tsx
'use client';

import { useEffect } from 'react';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase-client';
import { useQueryClient } from '@tanstack/react-query'; // IMPORT useQueryClient HOOK
import { logger } from '@/lib/logger';
import { useRouter } from 'next/navigation';

export default function SupabaseListener() {
  const supabase = createBrowserSupabaseClient();
  const queryClient = useQueryClient(); // GET QueryClient using the hook
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      logger.debug('Supabase auth state change:', event, session);
      if (event === 'SIGNED_IN') {
        queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next');
        if (next) {
          router.push(decodeURIComponent(next));
        } else {
          router.push('/dashboard');
        }
      } else if (event === 'SIGNED_OUT') {
        queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        router.push('/login');
      } else if (event === 'USER_UPDATED') {
        queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router, queryClient]); // Add queryClient to dependency array

  return null;
}

// // src/components/auth/SupabaseListener.tsx
// 'use client';

// import { useEffect } from 'react';
// import { createClient as createBrowserSupabaseClient } from '@/lib/supabase-client'; // Use the new browser client
// import { queryClient } from '@/lib/react-query';
// import { logger } from '@/lib/logger';
// import { useRouter } from 'next/navigation';

// export default function SupabaseListener() {
//   const supabase = createBrowserSupabaseClient(); // Instantiate the browser client
//   const router = useRouter();

//   useEffect(() => {
//     const { data: { subscription } } = supabase.auth.onAuthStateChange(
//       (event, session) => {
//         logger.debug('Supabase auth state change:', event, session);
//         if (event === 'SIGNED_IN') {
//           queryClient.invalidateQueries({ queryKey: ['userProfile'] });
//           const params = new URLSearchParams(window.location.search);
//           const next = params.get('next');
//           if (next) {
//             router.push(decodeURIComponent(next));
//           } else {
//             router.push('/dashboard');
//           }
//         } else if (event === 'SIGNED_OUT') {
//           queryClient.invalidateQueries({ queryKey: ['userProfile'] });
//           router.push('/login');
//         } else if (event === 'USER_UPDATED') {
//           queryClient.invalidateQueries({ queryKey: ['userProfile'] });
//         }
//       }
//     );

//     return () => {
//       subscription.unsubscribe();
//     };
//   }, [supabase, router]);

//   return null;
// }
