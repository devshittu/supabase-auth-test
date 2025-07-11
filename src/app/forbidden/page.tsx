// src/app/forbidden/page.tsx
import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-200 text-center">
      <h1 className="text-6xl font-bold text-error">403</h1>
      <p className="text-3xl font-semibold mt-4">Access Denied</p>
      <p className="text-lg mt-2">
        You do not have the necessary permissions to view this page.
      </p>
      <Link href="/dashboard" className="btn btn-primary mt-8">
        Go to Dashboard
      </Link>
      <Link href="/login" className="btn btn-ghost mt-4">
        Login with a different account
      </Link>
    </div>
  );
}
