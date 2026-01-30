/**
 * Root Layout
 * ===========
 * Main layout wrapper for the entire application.
 * Includes global providers and metadata.
 */

import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Telemedicine Queue Optimization',
  description: 'AI-powered patient queue management for telemedicine clinics',
  keywords: ['telemedicine', 'healthcare', 'queue management', 'AI', 'priority'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#22c55e',
                },
              },
              error: {
                style: {
                  background: '#ef4444',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
