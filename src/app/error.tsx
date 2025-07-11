// src/app/error.tsx (Example global error boundary for App Router)
'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { toast } from 'react-toastify';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    logger.error('App Router Segment Error:', error);
    toast.error('An unexpected error occurred. Please try again or refresh the page.');
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-200 text-center p-4">
      <h2 className="text-3xl font-bold mb-4 text-red-600">Something went wrong!</h2>
      <p className="text-gray-700 mb-6">
        We&apos;re sorry, but an unexpected error occurred.
      </p>
      {/* You can display a more user-friendly message based on error.message or error.digest */}
      {/* <p className="text-gray-500 mb-6">{error.message}</p> */}
      <button
        className="btn btn-primary"
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
      >
        Try again
      </button>
      <p className="mt-4 text-sm text-gray-500">If the problem persists, please contact support.</p>
    </div>
  );
}