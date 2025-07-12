// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SupabaseListener from '@/components/auth/SupabaseListener';
import Providers from './providers'; // IMPORT THE NEW PROVIDERS COMPONENT

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Authentication System',
  description: 'Comprehensive authentication system for Next.js',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {' '}
          {/* WRAP CHILDREN WITH THE NEW PROVIDERS COMPONENT */}
          <SupabaseListener />
          {children}
        </Providers>
        <ToastContainer
          position="bottom-center"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </body>
    </html>
  );
}
